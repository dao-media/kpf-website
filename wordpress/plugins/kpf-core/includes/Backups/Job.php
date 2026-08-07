<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

use WP_Error;

/**
 * Stepped backup jobs with progress + ETA for the admin UI.
 */
final class Job {
	public const TRANSIENT_PREFIX = 'kpf_backup_job_';
	public const ESTIMATES_OPTION = 'kpf_backups_step_estimates';
	public const TTL             = 45 * MINUTE_IN_SECONDS;

	/**
	 * Default per-step duration estimates in seconds (overridden by observed averages).
	 *
	 * @return array<string, int>
	 */
	public static function default_estimates(): array {
		return array(
			'database' => 25,
			'media'    => 30,
			'plugins'  => 18,
			'themes'   => 12,
			'config'   => 4,
			'manifest' => 1,
			'pack'     => 15,
			'finalize' => 2,
		);
	}

	/**
	 * Human labels for progress UI.
	 *
	 * @return array<string, string>
	 */
	public static function step_labels(): array {
		return array(
			'database' => __( 'Exporting database…', 'kpf-core' ),
			'media'    => __( 'Copying media library…', 'kpf-core' ),
			'plugins'  => __( 'Copying plugins…', 'kpf-core' ),
			'themes'   => __( 'Copying themes…', 'kpf-core' ),
			'config'   => __( 'Copying WordPress configuration…', 'kpf-core' ),
			'manifest' => __( 'Writing manifest…', 'kpf-core' ),
			'pack'     => __( 'Compressing archive…', 'kpf-core' ),
			'finalize' => __( 'Finalizing backup…', 'kpf-core' ),
		);
	}

	/**
	 * @param array{
	 *   components?: array<string, bool>|null,
	 *   label?: string,
	 *   note?: string,
	 *   trigger?: string,
	 *   skip_prune?: bool
	 * } $args
	 * @return array<string, mixed>|WP_Error
	 */
	public static function start( array $args = array() ) {
		self::clear_stale_lock();

		if ( self::is_locked() ) {
			return new WP_Error( 'kpf_backups_busy', __( 'A backup or restore is already running.', 'kpf-core' ), array( 'status' => 409 ) );
		}

		if ( ! class_exists( \ZipArchive::class ) ) {
			return new WP_Error( 'kpf_backups_zip', __( 'PHP ZipArchive is required to create backups.', 'kpf-core' ), array( 'status' => 500 ) );
		}

		$ensured = Storage::ensure();
		if ( is_wp_error( $ensured ) ) {
			return $ensured;
		}

		$settings   = Settings::get();
		$components = is_array( $args['components'] ?? null )
			? $args['components']
			: $settings['components'];
		$selected   = Components::selected_keys( $components );
		if ( empty( $selected ) ) {
			return new WP_Error( 'kpf_backups_empty', __( 'Select at least one backup component.', 'kpf-core' ), array( 'status' => 400 ) );
		}

		$id       = self::generate_id();
		$stamp    = gmdate( 'Ymd-His' );
		$filename = 'kpf-backup-' . $stamp . '-' . substr( $id, 0, 8 ) . '.zip';
		$temp_dir = trailingslashit( get_temp_dir() ) . 'kpf-backup-' . $id;
		$zip_path = trailingslashit( get_temp_dir() ) . $filename;

		if ( ! wp_mkdir_p( $temp_dir ) ) {
			return new WP_Error( 'kpf_backups_temp', __( 'Could not create a temporary workspace.', 'kpf-core' ), array( 'status' => 500 ) );
		}

		$steps = array_merge( $selected, array( 'manifest', 'pack', 'finalize' ) );
		$now   = time();

		$job = array(
			'id'               => $id,
			'status'           => 'running',
			'steps'            => $steps,
			'step_index'       => 0,
			'percent'          => 0,
			'current_step'     => $steps[0],
			'current_label'    => self::step_labels()[ $steps[0] ] ?? $steps[0],
			'eta_seconds'      => self::estimate_remaining( $steps, 0, array(), $now, $now ),
			'started_at'       => $now,
			'step_started_at'  => $now,
			'updated_at'       => $now,
			'timings'          => array(),
			'estimates'        => self::merged_estimates(),
			'temp_dir'         => $temp_dir,
			'zip_path'         => $zip_path,
			'filename'         => $filename,
			'exclude_patterns' => $settings['exclude_patterns'],
			'skip_prune'       => ! empty( $args['skip_prune'] ),
			'retention'        => (int) $settings['retention'],
			'error'            => null,
			'record'           => null,
			'manifest'         => array(
				'id'         => $id,
				'created_at' => $now,
				'site_url'   => home_url( '/' ),
				'wp_version' => get_bloginfo( 'version' ),
				'plugin'     => 'kpf-core',
				'plugin_ver' => defined( 'KPF_CORE_VERSION' ) ? KPF_CORE_VERSION : '',
				'components' => $selected,
				'db_prefix'  => $GLOBALS['wpdb']->prefix ?? 'wp_',
				'charset'    => defined( 'DB_CHARSET' ) ? DB_CHARSET : 'utf8mb4',
				'trigger'    => sanitize_key( (string) ( $args['trigger'] ?? 'manual' ) ),
				'label'      => sanitize_text_field( (string) ( $args['label'] ?? '' ) ),
				'note'       => sanitize_textarea_field( (string) ( $args['note'] ?? '' ) ),
				'tags'       => Storage::sanitize_tags( $args['tags'] ?? array() ),
			),
		);

		set_transient( Exporter::LOCK_KEY, $id, self::TTL );
		self::save( $job );

		return self::public_view( $job );
	}

	/**
	 * Advance one step. Call repeatedly until status is complete|failed.
	 *
	 * @return array<string, mixed>|WP_Error
	 */
	public static function step( string $id ) {
		$job = self::get( $id );
		if ( null === $job ) {
			return new WP_Error( 'kpf_backups_job_missing', __( 'Backup job not found or expired.', 'kpf-core' ), array( 'status' => 404 ) );
		}

		if ( 'complete' === $job['status'] || 'failed' === $job['status'] ) {
			return self::public_view( $job );
		}

		$steps = $job['steps'];
		$index = (int) $job['step_index'];
		if ( $index >= count( $steps ) ) {
			$job['status']  = 'complete';
			$job['percent'] = 100;
			self::save( $job );
			return self::public_view( $job );
		}

		$step = (string) $steps[ $index ];
		@set_time_limit( 0 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( function_exists( 'wp_raise_memory_limit' ) ) {
			wp_raise_memory_limit( 'admin' );
		}

		$step_start = time();
		try {
			$done = Exporter::run_job_step( $job, $step );
		} catch ( \Throwable $e ) {
			$job['status'] = 'failed';
			$job['error']  = $e->getMessage();
			$job['updated_at'] = time();
			Exporter::cleanup_job_workspace( $job );
			delete_transient( Exporter::LOCK_KEY );
			Exporter::notify_failure_message( $e->getMessage() );
			self::save( $job );
			return self::public_view( $job );
		}

		$job['updated_at'] = time();

		if ( ! $done ) {
			// Still inside this component — refresh percent/ETA from chunk progress.
			$job['percent']     = self::percent_for(
				$steps,
				$index,
				(int) ( $job['step_started_at'] ?? $job['started_at'] ),
				$step,
				(float) ( $job['step_progress'] ?? 0 )
			);
			$job['eta_seconds'] = self::estimate_remaining(
				$steps,
				$index,
				is_array( $job['timings'] ?? null ) ? $job['timings'] : array(),
				(int) $job['started_at'],
				(int) ( $job['step_started_at'] ?? $job['started_at'] ),
				(float) ( $job['step_progress'] ?? 0 )
			);
			self::save( $job );
			return self::public_view( $job );
		}

		$duration = max( 1, time() - (int) ( $job['step_started_at'] ?? $step_start ) );
		$job['timings'][ $step ] = (int) ( $job['timings'][ $step ] ?? 0 ) + $duration;
		self::remember_timing( $step, (int) $job['timings'][ $step ] );
		$job['step_progress'] = 0;
		$job['step_index']    = $index + 1;

		if ( $job['step_index'] >= count( $steps ) ) {
			$job['status']         = 'complete';
			$job['percent']        = 100;
			$job['current_step']   = 'done';
			$job['current_label']  = __( 'Backup complete', 'kpf-core' );
			$job['eta_seconds']    = 0;
			delete_transient( Exporter::LOCK_KEY );
		} else {
			$next = (string) $steps[ $job['step_index'] ];
			$job['current_step']    = $next;
			$job['current_label']   = self::step_labels()[ $next ] ?? $next;
			$job['step_started_at'] = time();
			$job['percent']         = self::percent_for(
				$steps,
				$job['step_index'],
				(int) $job['step_started_at'],
				(string) $job['current_step'],
				0.0
			);
			$job['eta_seconds']     = self::estimate_remaining(
				$steps,
				$job['step_index'],
				$job['timings'],
				(int) $job['started_at'],
				(int) $job['step_started_at'],
				0.0
			);
		}

		self::save( $job );
		return self::public_view( $job );
	}

	/**
	 * Currently running job (if any), for admin-bar resume across pages.
	 *
	 * @return array<string, mixed>|null
	 */
	public static function active(): ?array {
		self::clear_stale_lock();

		$lock = get_transient( Exporter::LOCK_KEY );
		if ( ! is_string( $lock ) || ! preg_match( '/^[a-f0-9]{16,}$/', $lock ) ) {
			return null;
		}

		$job = self::get( $lock );
		if ( null === $job || 'running' !== ( $job['status'] ?? '' ) ) {
			return null;
		}

		return self::public_view( $job );
	}

	/**
	 * Drop locks that no longer point at a running job.
	 */
	public static function clear_stale_lock(): void {
		$lock = get_transient( Exporter::LOCK_KEY );
		if ( false === $lock || null === $lock ) {
			return;
		}

		if ( is_string( $lock ) && preg_match( '/^[a-f0-9]{16,}$/', $lock ) ) {
			$job = self::get( $lock );
			if ( null === $job || 'running' !== ( $job['status'] ?? '' ) ) {
				delete_transient( Exporter::LOCK_KEY );
			}
			return;
		}

		// Restore locks store a timestamp int. Clear if older than 30 minutes.
		if ( is_numeric( $lock ) && ( time() - (int) $lock ) > 30 * MINUTE_IN_SECONDS ) {
			delete_transient( Exporter::LOCK_KEY );
		}
	}

	/**
	 * Whether a backup or restore lock is currently held.
	 */
	public static function is_locked(): bool {
		self::clear_stale_lock();
		return (bool) get_transient( Exporter::LOCK_KEY );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function get( string $id ): ?array {
		$id  = sanitize_key( $id );
		$raw = get_transient( self::TRANSIENT_PREFIX . $id );
		return is_array( $raw ) ? $raw : null;
	}

	/**
	 * Read-only public status (does not advance the job).
	 *
	 * @return array<string, mixed>|WP_Error
	 */
	public static function view( string $id ) {
		$job = self::get( $id );
		if ( null === $job ) {
			return new WP_Error( 'kpf_backups_job_missing', __( 'Backup job not found or expired.', 'kpf-core' ), array( 'status' => 404 ) );
		}
		return self::public_view( $job );
	}

	/**
	 * Run an entire job synchronously (scheduled / pre-restore).
	 *
	 * @param array<string, mixed> $args
	 * @return array<string, mixed>|WP_Error
	 */
	public static function run_to_completion( array $args = array() ) {
		$started = self::start( $args );
		if ( is_wp_error( $started ) ) {
			return $started;
		}

		$id    = (string) $started['id'];
		$guard = 0;
		while ( $guard < 2000 ) {
			++$guard;
			$result = self::step( $id );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			if ( 'complete' === ( $result['status'] ?? '' ) ) {
				return is_array( $result['record'] ?? null ) ? $result['record'] : $result;
			}
			if ( 'failed' === ( $result['status'] ?? '' ) ) {
				return new WP_Error(
					'kpf_backups_failed',
					(string) ( $result['error'] ?? __( 'Backup failed.', 'kpf-core' ) ),
					array( 'status' => 500 )
				);
			}
		}

		return new WP_Error( 'kpf_backups_timeout', __( 'Backup job exceeded the step limit.', 'kpf-core' ), array( 'status' => 500 ) );
	}

	/**
	 * @param array<string, mixed> $job
	 */
	private static function save( array $job ): void {
		set_transient( self::TRANSIENT_PREFIX . $job['id'], $job, self::TTL );
	}

	/**
	 * Public payload for REST / UI (omit filesystem paths).
	 *
	 * @param array<string, mixed> $job
	 * @return array<string, mixed>
	 */
	private static function public_view( array $job ): array {
		$steps = $job['steps'];
		$index = (int) $job['step_index'];
		if ( 'running' === $job['status'] ) {
			$progress = (float) ( $job['step_progress'] ?? 0 );
			$job['percent']     = self::percent_for(
				$steps,
				$index,
				(int) ( $job['step_started_at'] ?? $job['started_at'] ),
				(string) ( $job['current_step'] ?? '' ),
				$progress
			);
			$job['eta_seconds'] = self::estimate_remaining(
				$steps,
				$index,
				is_array( $job['timings'] ?? null ) ? $job['timings'] : array(),
				(int) $job['started_at'],
				(int) ( $job['step_started_at'] ?? $job['started_at'] ),
				$progress
			);
		}

		return array(
			'id'            => $job['id'],
			'status'        => $job['status'],
			'steps'         => $job['steps'],
			'step_index'    => (int) $job['step_index'],
			'steps_total'   => count( $job['steps'] ),
			'percent'       => (int) round( (float) $job['percent'] ),
			'current_step'  => $job['current_step'],
			'current_label' => $job['current_label'],
			'eta_seconds'   => max( 0, (int) $job['eta_seconds'] ),
			'started_at'    => (int) $job['started_at'],
			'updated_at'    => (int) ( $job['updated_at'] ?? $job['started_at'] ),
			'error'         => $job['error'],
			'record'        => $job['record'],
		);
	}

	/**
	 * @param list<string>         $steps
	 * @param array<string, int>   $timings
	 */
	private static function estimate_remaining(
		array $steps,
		int $index,
		array $timings,
		int $started_at,
		int $step_started_at,
		float $step_progress = 0.0
	): int {
		$estimates = self::merged_estimates();
		$remaining = 0;
		$total     = count( $steps );
		$progress  = max( 0.0, min( 0.99, $step_progress ) );

		for ( $i = $index; $i < $total; $i++ ) {
			$step = $steps[ $i ];
			$est  = (int) ( $estimates[ $step ] ?? 5 );
			if ( $i === $index ) {
				$remaining += max( 3, (int) ceil( $est * ( 1 - $progress ) ) );
			} else {
				$remaining += $est;
			}
		}

		// If this step is overrunning its estimate, keep ETA from collapsing to zero.
		$elapsed_step = max( 0, time() - $step_started_at );
		$est_current  = (int) ( $estimates[ $steps[ $index ] ?? '' ] ?? 5 );
		if ( $elapsed_step > $est_current ) {
			$remaining = max( $remaining, 8 + ( $elapsed_step - $est_current ) );
		}

		$completed = max( 0, $index );
		if ( $completed > 0 ) {
			$elapsed_total = max( 1, time() - $started_at );
			$pace          = $elapsed_total / max( 0.01, $completed + $progress );
			$pace_eta      = (int) ceil( $pace * ( $total - $index - $progress ) );
			$remaining     = (int) round( ( $remaining * 0.5 ) + ( $pace_eta * 0.5 ) );
		}

		return max( 3, $remaining );
	}

	/**
	 * @param list<string> $steps
	 */
	private static function percent_for(
		array $steps,
		int $index,
		int $step_started_at = 0,
		string $current_step = '',
		float $step_progress = 0.0
	): float {
		$total = count( $steps );
		if ( $total <= 0 ) {
			return 100.0;
		}
		if ( $index >= $total ) {
			return 100.0;
		}

		$base  = ( $index / $total ) * 100;
		$slice = 100 / $total;
		$partial = max( 0.0, min( 0.99, $step_progress ) );
		if ( $partial <= 0 && $step_started_at > 0 ) {
			$est     = (int) ( self::merged_estimates()[ $current_step ] ?? 5 );
			$elapsed = max( 0, time() - $step_started_at );
			$partial = $est > 0 ? min( 0.85, $elapsed / $est ) : 0;
		}

		return min( 99.0, $base + ( $slice * $partial ) );
	}

	/**
	 * @return array<string, int>
	 */
	private static function merged_estimates(): array {
		$stored = get_option( self::ESTIMATES_OPTION, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		$out = self::default_estimates();
		foreach ( $out as $key => $default ) {
			if ( isset( $stored[ $key ] ) && is_numeric( $stored[ $key ] ) ) {
				$out[ $key ] = max( 1, (int) round( (float) $stored[ $key ] ) );
			}
		}
		return $out;
	}

	private static function remember_timing( string $step, int $seconds ): void {
		$stored = get_option( self::ESTIMATES_OPTION, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		$prev = isset( $stored[ $step ] ) ? (float) $stored[ $step ] : (float) ( self::default_estimates()[ $step ] ?? 5 );
		// Exponential moving average so ETA adapts to this site.
		$stored[ $step ] = ( $prev * 0.65 ) + ( (float) $seconds * 0.35 );
		update_option( self::ESTIMATES_OPTION, $stored, false );
	}

	private static function generate_id(): string {
		try {
			return bin2hex( random_bytes( 16 ) );
		} catch ( \Exception $e ) {
			return md5( uniqid( (string) wp_rand(), true ) );
		}
	}
}

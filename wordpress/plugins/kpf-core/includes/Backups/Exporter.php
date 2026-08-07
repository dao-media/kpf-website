<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;
use WP_Error;
use ZipArchive;

final class Exporter {
	public const LOCK_KEY     = 'kpf_backups_lock';
	public const CHUNK_BUDGET = 2; // seconds of work per HTTP step

	/**
	 * @param array{
	 *   components?: array<string, bool>,
	 *   label?: string,
	 *   trigger?: string,
	 *   note?: string,
	 *   skip_prune?: bool
	 * } $args
	 * @return array<string, mixed>|WP_Error
	 */
	public static function create( array $args = array() ) {
		return Job::run_to_completion( $args );
	}

	/**
	 * Execute (or continue) a job step. Returns true when the named step is fully done.
	 *
	 * @param array<string, mixed> $job
	 */
	public static function run_job_step( array &$job, string $step ): bool {
		$temp_dir = (string) $job['temp_dir'];
		$patterns = is_array( $job['exclude_patterns'] ?? null ) ? $job['exclude_patterns'] : array();

		if ( ! isset( $job['cursor'] ) || ! is_array( $job['cursor'] ) ) {
			$job['cursor'] = array();
		}

		switch ( $step ) {
			case 'database':
				return self::chunk_database( $job, $temp_dir . '/database.sql.gz' );

			case 'media':
				return self::chunk_copy_tree(
					$job,
					'media',
					wp_upload_dir()['basedir'] ?? '',
					$temp_dir . '/files/uploads',
					$patterns,
					array( Storage::DIR_NAME )
				);

			case 'plugins':
				return self::chunk_copy_tree( $job, 'plugins', WP_PLUGIN_DIR, $temp_dir . '/files/plugins', $patterns );

			case 'themes':
				return self::chunk_copy_tree( $job, 'themes', get_theme_root(), $temp_dir . '/files/themes', $patterns );

			case 'config':
				self::export_config( $temp_dir . '/config', $patterns );
				$job['step_progress'] = 1;
				return true;

			case 'manifest':
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
				file_put_contents(
					$temp_dir . '/manifest.json',
					wp_json_encode( $job['manifest'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES )
				);
				$job['step_progress'] = 1;
				return true;

			case 'pack':
				return self::chunk_pack( $job, $temp_dir, (string) $job['zip_path'] );

			case 'finalize':
				self::finalize_job( $job );
				$job['step_progress'] = 1;
				return true;

			default:
				throw new \RuntimeException(
					sprintf(
						/* translators: %s: step name */
						__( 'Unknown backup step: %s', 'kpf-core' ),
						$step
					)
				);
		}
	}

	/**
	 * @param array<string, mixed> $job
	 */
	public static function cleanup_job_workspace( array $job ): void {
		$temp_dir = (string) ( $job['temp_dir'] ?? '' );
		$zip_path = (string) ( $job['zip_path'] ?? '' );
		if ( '' !== $temp_dir ) {
			self::rrmdir( $temp_dir );
		}
		if ( '' !== $zip_path && is_file( $zip_path ) ) {
			wp_delete_file( $zip_path );
		}
	}

	public static function notify_failure_message( string $message ): void {
		self::notify_failure( $message );
	}

	/**
	 * @param array<string, mixed> $job
	 */
	private static function finalize_job( array &$job ): void {
		$filename = (string) $job['filename'];
		$zip_path = (string) $job['zip_path'];
		$dest     = Storage::path_for( $filename );

		if ( ! @rename( $zip_path, $dest ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( ! copy( $zip_path, $dest ) ) {
				throw new \RuntimeException( __( 'Could not move the backup into storage.', 'kpf-core' ) );
			}
			wp_delete_file( $zip_path );
		}

		$checksum = hash_file( 'sha256', $dest );
		$size     = (int) filesize( $dest );
		$manifest = is_array( $job['manifest'] ?? null ) ? $job['manifest'] : array();
		$created  = (int) ( $manifest['created_at'] ?? time() );

		$record = array(
			'id'         => (string) $job['id'],
			'file'       => $filename,
			'created_at' => $created,
			'size'       => $size,
			'checksum'   => $checksum,
			'components' => is_array( $manifest['components'] ?? null ) ? $manifest['components'] : array(),
			'trigger'    => (string) ( $manifest['trigger'] ?? 'manual' ),
			'label'      => sanitize_text_field( (string) ( $manifest['label'] ?? '' ) ),
			'note'       => sanitize_textarea_field( (string) ( $manifest['note'] ?? '' ) ),
			'tags'       => Storage::sanitize_tags( $manifest['tags'] ?? array() ),
			'site_url'   => (string) ( $manifest['site_url'] ?? '' ),
			'wp_version' => (string) ( $manifest['wp_version'] ?? '' ),
		);

		Storage::add_record( $record );
		if ( empty( $job['skip_prune'] ) ) {
			Storage::prune( (int) ( $job['retention'] ?? 5 ) );
		}

		self::cleanup_job_workspace( $job );
		$job['record'] = $record;
	}

	/**
	 * Stream a gzipped SQL dump in time-budgeted chunks.
	 *
	 * @param array<string, mixed> $job
	 */
	private static function chunk_database( array &$job, string $target ): bool {
		global $wpdb;

		$cursor = is_array( $job['cursor']['database'] ?? null ) ? $job['cursor']['database'] : array();
		if ( empty( $cursor ) ) {
			$tables = $wpdb->get_col( 'SHOW TABLES' );
			$cursor = array(
				'tables'      => is_array( $tables ) ? array_values( array_map( 'strval', $tables ) ) : array(),
				'table_index' => 0,
				'row_offset'  => 0,
				'opened'      => false,
			);
		}

		$tables = $cursor['tables'];
		$total  = max( 1, count( $tables ) );
		$start  = microtime( true );

		// phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		$gz = @gzopen( $target, ! empty( $cursor['opened'] ) ? 'ab9' : 'wb9' );
		if ( false === $gz ) {
			throw new \RuntimeException( __( 'Could not open the database dump for writing.', 'kpf-core' ) );
		}

		if ( empty( $cursor['opened'] ) ) {
			$header  = "-- KPF WordPress database backup\n";
			$header .= '-- Generated: ' . gmdate( 'c' ) . "\n";
			$header .= '-- Site: ' . home_url( '/' ) . "\n\n";
			$header .= "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n";
			gzwrite( $gz, $header );
			$cursor['opened'] = true;
		}

		$batch = 150;
		while ( (int) $cursor['table_index'] < count( $tables ) ) {
			if ( ( microtime( true ) - $start ) >= self::CHUNK_BUDGET ) {
				break;
			}

			$table = (string) $tables[ (int) $cursor['table_index'] ];
			$offset = (int) $cursor['row_offset'];

			if ( 0 === $offset ) {
				$create = $wpdb->get_row( "SHOW CREATE TABLE `{$table}`", ARRAY_N ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				if ( is_array( $create ) && ! empty( $create[1] ) ) {
					gzwrite( $gz, "DROP TABLE IF EXISTS `{$table}`;\n" );
					gzwrite( $gz, $create[1] . ";\n\n" );
				} else {
					++$cursor['table_index'];
					$cursor['row_offset'] = 0;
					continue;
				}
			}

			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM `{$table}` LIMIT %d OFFSET %d", $batch, $offset ), ARRAY_A );
			if ( ! is_array( $rows ) || empty( $rows ) ) {
				gzwrite( $gz, "\n" );
				++$cursor['table_index'];
				$cursor['row_offset'] = 0;
				continue;
			}

			foreach ( $rows as $row ) {
				$columns = array();
				$values  = array();
				foreach ( $row as $col => $value ) {
					$columns[] = '`' . str_replace( '`', '``', (string) $col ) . '`';
					if ( null === $value ) {
						$values[] = 'NULL';
					} else {
						$values[] = "'" . $wpdb->_escape( (string) $value ) . "'";
					}
				}
				gzwrite(
					$gz,
					'INSERT INTO `' . $table . '` (' . implode( ',', $columns ) . ') VALUES (' . implode( ',', $values ) . ");\n"
				);
			}

			$cursor['row_offset'] = $offset + count( $rows );
			if ( count( $rows ) < $batch ) {
				gzwrite( $gz, "\n" );
				++$cursor['table_index'];
				$cursor['row_offset'] = 0;
			}
		}

		$done = (int) $cursor['table_index'] >= count( $tables );
		if ( $done ) {
			gzwrite( $gz, "SET FOREIGN_KEY_CHECKS=1;\n" );
		}
		gzclose( $gz );

		$job['cursor']['database'] = $cursor;
		$job['step_progress']      = min( 0.99, (int) $cursor['table_index'] / $total );
		$job['current_label']      = sprintf(
			/* translators: 1: completed tables, 2: total tables */
			__( 'Exporting database… (%1$d/%2$d tables)', 'kpf-core' ),
			min( (int) $cursor['table_index'], $total ),
			$total
		);

		if ( $done ) {
			$job['step_progress'] = 1;
			unset( $job['cursor']['database'] );
		}

		return $done;
	}

	/**
	 * @param array<string, mixed> $job
	 * @param list<string>         $exclude_patterns
	 * @param list<string>         $exclude_dir_names
	 */
	private static function chunk_copy_tree(
		array &$job,
		string $key,
		string $source,
		string $dest,
		array $exclude_patterns,
		array $exclude_dir_names = array()
	): bool {
		if ( '' === $source || ! is_dir( $source ) ) {
			$job['step_progress'] = 1;
			return true;
		}

		$cursor = is_array( $job['cursor'][ $key ] ?? null ) ? $job['cursor'][ $key ] : array();
		if ( empty( $cursor['files'] ) ) {
			$cursor = array(
				'files' => self::list_files( $source, $exclude_patterns, $exclude_dir_names ),
				'index' => 0,
			);
		}

		$files = $cursor['files'];
		$total = max( 1, count( $files ) );
		$start = microtime( true );
		$index = (int) $cursor['index'];

		while ( $index < count( $files ) ) {
			if ( ( microtime( true ) - $start ) >= self::CHUNK_BUDGET ) {
				break;
			}

			$rel    = (string) $files[ $index ];
			$from   = trailingslashit( $source ) . $rel;
			$target = trailingslashit( $dest ) . $rel;
			wp_mkdir_p( dirname( $target ) );
			if ( is_file( $from ) ) {
				copy( $from, $target );
			}
			++$index;
		}

		$cursor['index']         = $index;
		$job['cursor'][ $key ]   = $cursor;
		$job['step_progress']    = min( 0.99, $index / $total );
		$job['current_label']    = sprintf(
			/* translators: 1: component label, 2: copied files, 3: total files */
			__( 'Copying %1$s… (%2$d/%3$d files)', 'kpf-core' ),
			$key,
			min( $index, $total ),
			$total
		);

		$done = $index >= count( $files );
		if ( $done ) {
			$job['step_progress'] = 1;
			unset( $job['cursor'][ $key ] );
		}

		return $done;
	}

	/**
	 * @param array<string, mixed> $job
	 */
	private static function chunk_pack( array &$job, string $source, string $zip_path ): bool {
		$cursor = is_array( $job['cursor']['pack'] ?? null ) ? $job['cursor']['pack'] : array();
		if ( empty( $cursor['files'] ) ) {
			$cursor = array(
				'files'  => self::list_files( $source, array(), array() ),
				'index'  => 0,
				'opened' => false,
			);
		}

		$files = $cursor['files'];
		$total = max( 1, count( $files ) );
		$index = (int) $cursor['index'];
		$start = microtime( true );

		$zip    = new ZipArchive();
		$flags  = ! empty( $cursor['opened'] ) ? 0 : ( ZipArchive::CREATE | ZipArchive::OVERWRITE );
		$result = $zip->open( $zip_path, $flags );
		if ( true !== $result ) {
			throw new \RuntimeException( __( 'Could not open the backup archive.', 'kpf-core' ) );
		}
		$cursor['opened'] = true;

		while ( $index < count( $files ) ) {
			if ( ( microtime( true ) - $start ) >= self::CHUNK_BUDGET ) {
				break;
			}

			$rel  = (string) $files[ $index ];
			$full = trailingslashit( $source ) . $rel;
			if ( is_file( $full ) ) {
				$zip->addFile( $full, $rel );
				if ( method_exists( $zip, 'setCompressionName' ) ) {
					$zip->setCompressionName( $rel, ZipArchive::CM_DEFLATE, 9 );
				}
			}
			++$index;
		}

		$zip->close();

		$cursor['index']        = $index;
		$job['cursor']['pack']  = $cursor;
		$job['step_progress']   = min( 0.99, $index / $total );
		$job['current_label']   = sprintf(
			/* translators: 1: packed files, 2: total files */
			__( 'Compressing archive… (%1$d/%2$d files)', 'kpf-core' ),
			min( $index, $total ),
			$total
		);

		$done = $index >= count( $files );
		if ( $done ) {
			$job['step_progress'] = 1;
			unset( $job['cursor']['pack'] );
		}

		return $done;
	}

	/**
	 * @param list<string> $exclude_patterns
	 * @param list<string> $exclude_dir_names
	 * @return list<string>
	 */
	private static function list_files( string $source, array $exclude_patterns, array $exclude_dir_names = array() ): array {
		if ( '' === $source || ! is_dir( $source ) ) {
			return array();
		}

		$out         = array();
		$backup_root = wp_normalize_path( Storage::directory() );
		$iterator    = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $source, RecursiveDirectoryIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::LEAVES_ONLY
		);

		/** @var SplFileInfo $file */
		foreach ( $iterator as $file ) {
			if ( ! $file->isFile() ) {
				continue;
			}
			$path = $file->getPathname();
			$norm = wp_normalize_path( $path );
			if ( str_starts_with( $norm, $backup_root ) ) {
				continue;
			}
			$rel = ltrim( substr( $norm, strlen( wp_normalize_path( $source ) ) ), '/' );
			if ( '' === $rel ) {
				continue;
			}
			$skip = false;
			foreach ( $exclude_dir_names as $name ) {
				if ( $name === $rel || str_starts_with( $rel, $name . '/' ) ) {
					$skip = true;
					break;
				}
			}
			if ( $skip || self::matches_exclude( $rel, $exclude_patterns ) ) {
				continue;
			}
			$out[] = $rel;
		}

		return $out;
	}

	/**
	 * @param list<string> $exclude_patterns
	 */
	private static function export_config( string $dest, array $exclude_patterns ): void {
		wp_mkdir_p( $dest );

		$files = array(
			ABSPATH . 'wp-config.php' => 'wp-config.php',
			ABSPATH . '.htaccess'     => '.htaccess',
			ABSPATH . 'web.config'    => 'web.config',
		);

		foreach ( $files as $src => $name ) {
			if ( is_readable( $src ) ) {
				copy( $src, $dest . '/' . $name );
			}
		}

		$mu = defined( 'WPMU_PLUGIN_DIR' ) ? WPMU_PLUGIN_DIR : trailingslashit( WP_CONTENT_DIR ) . 'mu-plugins';
		if ( is_dir( $mu ) ) {
			foreach ( self::list_files( $mu, $exclude_patterns ) as $rel ) {
				$from   = trailingslashit( $mu ) . $rel;
				$target = $dest . '/mu-plugins/' . $rel;
				wp_mkdir_p( dirname( $target ) );
				copy( $from, $target );
			}
		}

		$dropins = array(
			'object-cache.php',
			'advanced-cache.php',
			'db.php',
			'db-error.php',
			'sunrise.php',
			'maintenance.php',
			'php-error.php',
			'fatal-error-handler.php',
		);
		$drop_dest = $dest . '/drop-ins';
		wp_mkdir_p( $drop_dest );
		foreach ( $dropins as $dropin ) {
			$src = trailingslashit( WP_CONTENT_DIR ) . $dropin;
			if ( is_readable( $src ) ) {
				copy( $src, $drop_dest . '/' . $dropin );
			}
		}
	}

	/**
	 * @param list<string> $patterns
	 */
	private static function matches_exclude( string $relative, array $patterns ): bool {
		foreach ( $patterns as $pattern ) {
			if ( fnmatch( $pattern, $relative, FNM_PATHNAME | FNM_CASEFOLD )
				|| fnmatch( $pattern, basename( $relative ), FNM_CASEFOLD )
			) {
				return true;
			}
		}
		return false;
	}

	private static function notify_failure( string $message ): void {
		$settings = Settings::get();
		if ( empty( $settings['notify_on_failure'] ) ) {
			return;
		}
		$email = $settings['notify_email'];
		if ( '' === $email ) {
			$email = (string) get_option( 'admin_email' );
		}
		if ( ! is_email( $email ) ) {
			return;
		}

		wp_mail(
			$email,
			sprintf( '[%s] Backup failed', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) ),
			$message
		);
	}

	private static function rrmdir( string $dir ): void {
		if ( '' === $dir || ! is_dir( $dir ) ) {
			return;
		}
		$items = scandir( $dir );
		if ( ! is_array( $items ) ) {
			return;
		}
		foreach ( $items as $item ) {
			if ( '.' === $item || '..' === $item ) {
				continue;
			}
			$path = $dir . '/' . $item;
			if ( is_dir( $path ) ) {
				self::rrmdir( $path );
			} else {
				wp_delete_file( $path );
			}
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir
		rmdir( $dir );
	}
}

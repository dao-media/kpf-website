<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

use KPF\Core\Support\SiteDateTime;

final class Scheduler {
	public const HOOK           = 'kpf_backups_run_scheduled';
	public const CUSTOM_SCHEDULE = 'kpf_backups_custom';

	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) );
		add_action( self::HOOK, array( self::class, 'run' ) );
		add_action( 'init', array( self::class, 'maybe_resync' ), 20 );
	}

	/**
	 * @param array<string, array{interval:int,display:string}> $schedules
	 * @return array<string, array{interval:int,display:string}>
	 */
	public static function schedules( array $schedules ): array {
		$settings = Settings::get();
		$hours    = max( 1, (int) ( $settings['schedule']['custom_hours'] ?? 24 ) );

		$schedules[ self::CUSTOM_SCHEDULE ] = array(
			'interval' => $hours * HOUR_IN_SECONDS,
			'display'  => sprintf(
				/* translators: %d: hours */
				__( 'Every %d hours (KPF Backups)', 'kpf-core' ),
				$hours
			),
		);

		$schedules['kpf_backups_weekly'] = array(
			'interval' => WEEK_IN_SECONDS,
			'display'  => __( 'Once Weekly (KPF Backups)', 'kpf-core' ),
		);

		$schedules['kpf_backups_monthly'] = array(
			'interval' => 30 * DAY_IN_SECONDS,
			'display'  => __( 'Once Monthly (KPF Backups)', 'kpf-core' ),
		);

		return $schedules;
	}

	public static function maybe_resync(): void {
		$settings = Settings::get();
		$enabled  = ! empty( $settings['schedule']['enabled'] );
		$next     = wp_next_scheduled( self::HOOK );

		if ( ! $enabled && $next ) {
			wp_clear_scheduled_hook( self::HOOK );
			return;
		}

		if ( $enabled && ! $next ) {
			self::resync();
		}
	}

	public static function resync(): void {
		wp_clear_scheduled_hook( self::HOOK );

		$settings = Settings::get();
		if ( empty( $settings['schedule']['enabled'] ) ) {
			return;
		}

		$recurrence = self::recurrence_for( (string) $settings['schedule']['cadence'] );
		$timestamp  = self::next_timestamp( (string) $settings['schedule']['time'] );

		wp_schedule_event( $timestamp, $recurrence, self::HOOK );
	}

	public static function run(): void {
		$result = Exporter::create(
			array(
				'trigger' => 'scheduled',
				'label'   => __( 'Scheduled backup', 'kpf-core' ),
			)
		);

		if ( is_wp_error( $result ) ) {
			/**
			 * Fires when a scheduled backup fails.
			 *
			 * @param \WP_Error $result Failure details.
			 */
			do_action( 'kpf_backups_scheduled_failed', $result );
		}
	}

	/**
	 * @return array{enabled:bool,cadence:string,next_run:int|null,next_run_label:string|null,timezone:string,timezone_abbr:string,recurrence:string}
	 */
	public static function status(): array {
		$settings  = Settings::get();
		$next      = wp_next_scheduled( self::HOOK );
		$date_time = SiteDateTime::config();

		return array(
			'enabled'        => ! empty( $settings['schedule']['enabled'] ),
			'cadence'        => (string) $settings['schedule']['cadence'],
			'next_run'       => $next ? (int) $next : null,
			'next_run_label' => $next ? SiteDateTime::format( (int) $next ) : null,
			'timezone'       => $date_time['timezone'],
			'timezone_abbr'  => $date_time['timezoneAbbr'],
			'recurrence'     => self::recurrence_for( (string) $settings['schedule']['cadence'] ),
		);
	}

	private static function recurrence_for( string $cadence ): string {
		return match ( $cadence ) {
			'hourly'     => 'hourly',
			'twicedaily' => 'twicedaily',
			'weekly'     => 'kpf_backups_weekly',
			'monthly'    => 'kpf_backups_monthly',
			'custom'     => self::CUSTOM_SCHEDULE,
			default      => 'daily',
		};
	}

	/**
	 * Next Unix timestamp for the preferred HH:MM in the site timezone.
	 */
	private static function next_timestamp( string $time ): int {
		$tz = wp_timezone();
		try {
			if ( ! preg_match( '/^([01]\d|2[0-3]):([0-5]\d)$/', $time ) ) {
				$time = '02:00';
			}

			$now  = new \DateTimeImmutable( 'now', $tz );
			$next = \DateTimeImmutable::createFromFormat( 'Y-m-d H:i:s', $now->format( 'Y-m-d' ) . ' ' . $time . ':00', $tz );
			if ( ! $next instanceof \DateTimeImmutable ) {
				return time() + MINUTE_IN_SECONDS;
			}

			// createFromFormat can inherit unexpected fields; normalize to the intended wall clock.
			$next = $next->setTimezone( $tz )->setTime(
				(int) substr( $time, 0, 2 ),
				(int) substr( $time, 3, 2 ),
				0
			);

			if ( $next->getTimestamp() <= $now->getTimestamp() ) {
				$next = $next->modify( '+1 day' );
			}

			return $next->getTimestamp();
		} catch ( \Exception $e ) {
			return time() + MINUTE_IN_SECONDS;
		}
	}
}

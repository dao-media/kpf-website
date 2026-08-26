<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

final class Settings {
	public const OPTION_KEY = 'kpf_backups_settings';
	public const VERSION    = 1;

	public static function register(): void {
		add_action(
			'init',
			static function (): void {
				register_setting(
					'kpf_backups',
					self::OPTION_KEY,
					array(
						'type'              => 'object',
						'default'           => self::defaults(),
						'sanitize_callback' => array( self::class, 'sanitize' ),
						'show_in_rest'      => false,
					)
				);
			}
		);
	}

	public static function ensure_defaults(): void {
		$current = get_option( self::OPTION_KEY, null );
		if ( ! is_array( $current ) ) {
			update_option( self::OPTION_KEY, self::defaults(), false );
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'           => self::VERSION,
			'components'        => Components::default_selection(),
			'schedule'          => array(
				'enabled'      => false,
				'cadence'      => 'weekly',
				'custom_hours' => 24,
				'time'         => '02:00',
				'weekday'      => 0,
			),
			'retention'         => 5,
			'notify_on_failure' => true,
			'notify_email'      => '',
			'exclude_patterns'  => array(
				'*.log',
				'*/cache/*',
				'*/node_modules/*',
				'*/.git/*',
			),
			'create_pre_restore' => true,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return self::sanitize( array_replace_recursive( self::defaults(), $stored ) );
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function update( array $settings ): array {
		$clean = self::sanitize( array_replace_recursive( self::get(), $settings ) );
		update_option( self::OPTION_KEY, $clean, false );
		Scheduler::resync();
		return self::get();
	}

	/**
	 * @param mixed $settings
	 * @return array<string, mixed>
	 */
	public static function sanitize( $settings ): array {
		$defaults = self::defaults();
		if ( ! is_array( $settings ) ) {
			return $defaults;
		}

		$components = array();
		$incoming   = is_array( $settings['components'] ?? null ) ? $settings['components'] : array();
		foreach ( array_keys( Components::definitions() ) as $key ) {
			$components[ $key ] = ! empty( $incoming[ $key ] );
		}
		if ( ! in_array( true, $components, true ) ) {
			$components = Components::default_selection();
		}

		$schedule_in = is_array( $settings['schedule'] ?? null ) ? $settings['schedule'] : array();
		$cadence     = sanitize_key( (string) ( $schedule_in['cadence'] ?? $defaults['schedule']['cadence'] ) );
		$allowed     = array( 'hourly', 'twicedaily', 'daily', 'weekly', 'monthly', 'custom' );
		if ( ! in_array( $cadence, $allowed, true ) ) {
			$cadence = 'weekly';
		}

		$custom_hours = absint( $schedule_in['custom_hours'] ?? $defaults['schedule']['custom_hours'] );
		$custom_hours = max( 1, min( 168, $custom_hours ) );

		$time = (string) ( $schedule_in['time'] ?? $defaults['schedule']['time'] );
		if ( ! preg_match( '/^([01]\d|2[0-3]):([0-5]\d)$/', $time ) ) {
			$time = '02:00';
		}

		$weekday = absint( $schedule_in['weekday'] ?? $defaults['schedule']['weekday'] );
		if ( $weekday > 6 ) {
			$weekday = 0;
		}

		$retention = absint( $settings['retention'] ?? $defaults['retention'] );
		$retention = max( 1, min( 50, $retention ) );

		$email = sanitize_email( (string) ( $settings['notify_email'] ?? '' ) );
		if ( '' === $email ) {
			$email = '';
		}

		$patterns = array();
		$raw      = $settings['exclude_patterns'] ?? $defaults['exclude_patterns'];
		if ( is_string( $raw ) ) {
			$raw = preg_split( '/[\r\n,]+/', $raw ) ?: array();
		}
		if ( is_array( $raw ) ) {
			foreach ( $raw as $pattern ) {
				$pattern = trim( sanitize_text_field( (string) $pattern ) );
				if ( '' !== $pattern && strlen( $pattern ) < 200 ) {
					$patterns[] = $pattern;
				}
			}
		}
		$patterns = array_values( array_unique( $patterns ) );

		return array(
			'version'            => self::VERSION,
			'components'         => $components,
			'schedule'           => array(
				'enabled'      => ! empty( $schedule_in['enabled'] ),
				'cadence'      => $cadence,
				'custom_hours' => $custom_hours,
				'time'         => $time,
				'weekday'      => $weekday,
			),
			'retention'          => $retention,
			'notify_on_failure'  => ! empty( $settings['notify_on_failure'] ),
			'notify_email'       => $email,
			'exclude_patterns'   => $patterns,
			'create_pre_restore' => array_key_exists( 'create_pre_restore', $settings )
				? ! empty( $settings['create_pre_restore'] )
				: true,
		);
	}
}

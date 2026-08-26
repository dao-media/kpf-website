<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

final class Settings {
	public const OPTION_KEY = 'kpf_performance_settings';
	public const VERSION    = 1;

	public static function register(): void {
		add_action(
			'init',
			static function (): void {
				register_setting(
					'kpf_performance',
					self::OPTION_KEY,
					array(
						'type'              => 'object',
						'default'           => self::defaults(),
						'sanitize_callback' => array( Sanitizer::class, 'sanitize_settings' ),
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
			return;
		}

		$migrated = self::migrate_headless_classic_assets( $current );
		if ( $migrated !== $current ) {
			update_option( self::OPTION_KEY, Sanitizer::sanitize_settings( $migrated ), false );
		}
	}

	/**
	 * Classic theme combine/delay/unused/critical CSS only affect wp_head.
	 * On this headless install they mainly risk wp-admin after core updates.
	 *
	 * @param array<string, mixed> $stored
	 * @return array<string, mixed>
	 */
	private static function migrate_headless_classic_assets( array $stored ): array {
		$code = is_array( $stored['code'] ?? null ) ? $stored['code'] : array();
		$classic = array( 'combine_css', 'combine_js', 'delay_js', 'remove_unused_css', 'critical_css' );
		$changed = false;
		foreach ( $classic as $key ) {
			if ( ! empty( $code[ $key ] ) ) {
				$code[ $key ] = false;
				$changed      = true;
			}
		}
		if ( $changed ) {
			$stored['code'] = $code;
		}
		if ( ( $stored['preset'] ?? '' ) === 'aggressive' ) {
			$stored['preset'] = 'balanced';
			$changed          = true;
		}
		return $stored;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		$balanced = Presets::balanced();

		return array_merge(
			array(
				'version' => self::VERSION,
				'preset'  => 'balanced',
			),
			$balanced
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

		return self::merge_defaults( $stored );
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function update( array $settings ): array {
		$clean = Sanitizer::sanitize_settings( $settings );
		update_option( self::OPTION_KEY, $clean, false );
		return self::get();
	}

	/**
	 * @param array<string, mixed> $stored
	 * @return array<string, mixed>
	 */
	private static function merge_defaults( array $stored ): array {
		$defaults = self::defaults();

		return array(
			'version'  => self::VERSION,
			'preset'   => sanitize_key( (string) ( $stored['preset'] ?? $defaults['preset'] ) ),
			'pages'    => array_merge( $defaults['pages'], is_array( $stored['pages'] ?? null ) ? $stored['pages'] : array() ),
			'media'    => array_merge( $defaults['media'], is_array( $stored['media'] ?? null ) ? $stored['media'] : array() ),
			'code'     => array_merge( $defaults['code'], is_array( $stored['code'] ?? null ) ? $stored['code'] : array() ),
			'browser'  => array_merge( $defaults['browser'], is_array( $stored['browser'] ?? null ) ? $stored['browser'] : array() ),
			'cdn'      => array_merge( $defaults['cdn'], is_array( $stored['cdn'] ?? null ) ? $stored['cdn'] : array() ),
			'advanced' => array_merge( $defaults['advanced'], is_array( $stored['advanced'] ?? null ) ? $stored['advanced'] : array() ),
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

final class Settings {
	public const OPTION_KEY = 'kpf_design_settings';
	public const VERSION    = 1;

	public const ROLE_FALLBACK     = 'fallback';
	public const ROLE_MAINTENANCE  = 'maintenance';
	public const DEFAULT_PATH      = '/coming-soon/';

	public static function register(): void {
		add_action(
			'init',
			static function (): void {
				register_setting(
					'kpf_designs',
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
			'version'               => self::VERSION,
			'fallback_design_id'    => 0,
			'maintenance_enabled'   => false,
			'maintenance_design_id' => 0,
			'maintenance_path'      => self::DEFAULT_PATH,
			'maintenance_allowlist' => self::default_allowlist(),
		);
	}

	/**
	 * @return array<int, string>
	 */
	public static function default_allowlist(): array {
		return array(
			'/wp-admin',
			'/wp-login.php',
			'/wp-json',
			'/preview',
			'/api',
			'/coming-soon',
		);
	}

	/**
	 * @return array<int, string>
	 */
	public static function roles(): array {
		return array( self::ROLE_FALLBACK, self::ROLE_MAINTENANCE );
	}

	public static function is_valid_role( string $role ): bool {
		return in_array( $role, self::roles(), true );
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return self::sanitize( array_merge( self::defaults(), $stored ) );
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function update( array $settings ): array {
		$current = self::get();
		$clean   = self::sanitize( array_merge( $current, $settings ) );

		// Cannot enable maintenance without a ready design.
		if ( $clean['maintenance_enabled'] && ! Meta::design_is_ready( (int) $clean['maintenance_design_id'] ) ) {
			$clean['maintenance_enabled'] = false;
		}

		update_option( self::OPTION_KEY, $clean, false );
		return self::get();
	}

	public static function design_id_for_role( string $role ): int {
		$settings = self::get();
		if ( self::ROLE_FALLBACK === $role ) {
			return (int) $settings['fallback_design_id'];
		}
		if ( self::ROLE_MAINTENANCE === $role ) {
			return (int) $settings['maintenance_design_id'];
		}
		return 0;
	}

	public static function set_design_id_for_role( string $role, int $design_id ): void {
		$settings = self::get();
		if ( self::ROLE_FALLBACK === $role ) {
			$settings['fallback_design_id'] = max( 0, $design_id );
		} elseif ( self::ROLE_MAINTENANCE === $role ) {
			$settings['maintenance_design_id'] = max( 0, $design_id );
			if ( $design_id < 1 ) {
				$settings['maintenance_enabled'] = false;
			}
		} else {
			return;
		}

		update_option( self::OPTION_KEY, self::sanitize( $settings ), false );
	}

	/**
	 * Public payload for Next.js middleware (fail-open friendly).
	 *
	 * @return array<string, mixed>
	 */
	public static function public_maintenance(): array {
		$settings = self::get();
		$path     = self::normalize_path( (string) $settings['maintenance_path'] );
		$ready    = Meta::design_is_ready( (int) $settings['maintenance_design_id'] );
		$enabled  = (bool) $settings['maintenance_enabled'] && $ready;

		$allowlist = array_values(
			array_unique(
				array_merge(
					(array) $settings['maintenance_allowlist'],
					array( $path, rtrim( $path, '/' ) )
				)
			)
		);

		return array(
			'enabled'   => $enabled,
			'path'      => $path,
			'ready'     => $ready,
			'allowlist' => $allowlist,
		);
	}

	/**
	 * Admin/API settings payload (camelCase).
	 *
	 * @return array<string, mixed>
	 */
	public static function admin_payload(): array {
		$settings = self::get();

		return array(
			'historyLimit'         => Meta::history_limit(),
			'minimum'              => Meta::HISTORY_MIN,
			'maximum'              => Meta::HISTORY_MAX,
			'fallbackDesignId'     => (int) $settings['fallback_design_id'],
			'maintenanceEnabled'   => (bool) $settings['maintenance_enabled'],
			'maintenanceDesignId'  => (int) $settings['maintenance_design_id'],
			'maintenancePath'      => self::normalize_path( (string) $settings['maintenance_path'] ),
			'maintenanceAllowlist' => array_values( (array) $settings['maintenance_allowlist'] ),
			'system'               => array(
				self::system_row( self::ROLE_FALLBACK ),
				self::system_row( self::ROLE_MAINTENANCE ),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function system_row( string $role ): array {
		$design_id = self::design_id_for_role( $role );
		$design    = $design_id > 0 ? Meta::get_design( $design_id ) : Meta::design_defaults();
		$ready     = Meta::design_is_ready( $design_id );
		$title     = self::ROLE_MAINTENANCE === $role
			? __( 'Coming soon / maintenance', 'kpf-core' )
			: __( 'Fallback page design', 'kpf-core' );
		$path      = self::ROLE_MAINTENANCE === $role
			? self::normalize_path( (string) self::get()['maintenance_path'] )
			: __( 'Any page without its own design', 'kpf-core' );

		return array(
			'kind'         => 'system',
			'id'           => 'system:' . $role,
			'role'         => $role,
			'title'        => $title,
			'status'       => 'system',
			'path'         => $path,
			'url'          => self::ROLE_MAINTENANCE === $role ? home_url( $path ) : '',
			'ready'        => $ready,
			'designId'     => $design_id,
			'htmlFilename' => (string) ( $design['html_filename'] ?? '' ),
			'cssFilename'  => (string) ( $design['css_filename'] ?? '' ),
		);
	}

	/**
	 * @param mixed $value Raw settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$value   = is_array( $value ) ? $value : array();
		$defaults = self::defaults();

		$fallback_id    = Meta::sanitize_page_design_id( $value['fallback_design_id'] ?? 0 );
		$maintenance_id = Meta::sanitize_page_design_id( $value['maintenance_design_id'] ?? 0 );
		$path           = self::normalize_path( (string) ( $value['maintenance_path'] ?? $defaults['maintenance_path'] ) );
		if ( '' === $path || '/' === $path ) {
			$path = self::DEFAULT_PATH;
		}

		$allowlist = array();
		$raw_list  = $value['maintenance_allowlist'] ?? $defaults['maintenance_allowlist'];
		if ( is_array( $raw_list ) ) {
			foreach ( $raw_list as $item ) {
				$item = self::normalize_path( (string) $item );
				if ( '' !== $item && '/' !== $item ) {
					$allowlist[] = $item;
				}
			}
		}
		$allowlist = array_values( array_unique( array_merge( self::default_allowlist(), $allowlist ) ) );

		return array(
			'version'               => self::VERSION,
			'fallback_design_id'    => $fallback_id,
			'maintenance_enabled'   => ! empty( $value['maintenance_enabled'] ),
			'maintenance_design_id' => $maintenance_id,
			'maintenance_path'      => $path,
			'maintenance_allowlist' => $allowlist,
		);
	}

	public static function normalize_path( string $path ): string {
		$path = trim( $path );
		if ( '' === $path ) {
			return '';
		}

		if ( preg_match( '#^https?://#i', $path ) ) {
			$parsed = wp_parse_url( $path, PHP_URL_PATH );
			$path   = is_string( $parsed ) ? $parsed : '/';
		}

		$path = '/' . ltrim( $path, '/' );
		if ( ! str_ends_with( $path, '/' ) && ! str_contains( basename( $path ), '.' ) ) {
			$path .= '/';
		}

		return $path;
	}
}

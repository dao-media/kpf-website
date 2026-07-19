<?php

declare(strict_types=1);

namespace KPF\Core\Accessibility;

final class Admin {
	public const MENU_SLUG = 'kpf-accessibility';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	/**
	 * @return array<string, string>
	 */
	public static function sections(): array {
		return array(
			'overview'    => __( 'Overview', 'kpf-core' ),
			'navigation'  => __( 'Navigation', 'kpf-core' ),
			'content'     => __( 'Content', 'kpf-core' ),
			'media'       => __( 'Media', 'kpf-core' ),
			'motion'      => __( 'Motion', 'kpf-core' ),
			'forms'       => __( 'Forms', 'kpf-core' ),
			'advanced'    => __( 'Advanced', 'kpf-core' ),
		);
	}

	public static function menu_slug_for_tab( string $tab ): string {
		return 'overview' === $tab ? self::MENU_SLUG : self::MENU_SLUG . '-' . $tab;
	}

	public static function tab_from_page( ?string $page = null ): string {
		$page = $page ?? ( isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: self::MENU_SLUG );

		if ( self::MENU_SLUG === $page ) {
			return 'overview';
		}

		$prefix = self::MENU_SLUG . '-';
		if ( str_starts_with( $page, $prefix ) ) {
			$tab = substr( $page, strlen( $prefix ) );
			if ( isset( self::sections()[ $tab ] ) ) {
				return $tab;
			}
		}

		return 'overview';
	}

	public static function menu(): void {
		$first = true;
		foreach ( self::sections() as $tab => $label ) {
			$slug = self::menu_slug_for_tab( $tab );
			if ( $first ) {
				add_menu_page(
					__( 'Accessibility', 'kpf-core' ),
					__( 'Accessibility', 'kpf-core' ),
					'manage_options',
					$slug,
					array( self::class, 'render' ),
					// Icon is provided by Lucide in admin-shell (`Accessibility`).
					'none',
					60
				);
				$first = false;
			}

			add_submenu_page(
				self::MENU_SLUG,
				'overview' === $tab ? __( 'Overview', 'kpf-core' ) : $label,
				'overview' === $tab ? __( 'Overview', 'kpf-core' ) : $label,
				'manage_options',
				$slug,
				array( self::class, 'render' )
			);
		}
	}

	public static function render(): void {
		echo '<div class="wrap kpf-accessibility-wrap"><div id="kpf-accessibility-admin-root"></div></div>';
	}

	public static function enqueue( string $hook ): void {
		if ( ! self::is_accessibility_screen( $hook ) ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/accessibility-admin.asset.php';
		$asset      = is_readable( $asset_file ) ? require $asset_file : array(
			'dependencies' => array( 'wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n' ),
			'version'      => KPF_CORE_VERSION,
		);

		wp_enqueue_style( 'wp-components' );
		$style_file = KPF_CORE_PATH . 'build/accessibility-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-accessibility-admin',
				KPF_CORE_URL . 'build/accessibility-admin.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-accessibility-admin',
			KPF_CORE_URL . 'build/accessibility-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		$preset_meta = array();
		foreach ( Presets::all() as $key => $preset ) {
			$preset_meta[ $key ] = array(
				'label'       => $preset['label'],
				'description' => $preset['description'],
			);
		}

		wp_localize_script(
			'kpf-accessibility-admin',
			'kpfAccessibilityAdmin',
			array(
				'restUrl'    => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'nonce'      => wp_create_nonce( 'wp_rest' ),
				'adminUrl'   => admin_url(),
				'initialTab' => self::tab_from_page(),
				'sections'   => self::sections(),
				'presets'    => $preset_meta,
			)
		);
	}

	private static function is_accessibility_screen( string $hook ): bool {
		if ( str_contains( $hook, self::MENU_SLUG ) ) {
			return true;
		}

		$page = isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		return self::MENU_SLUG === $page || str_starts_with( $page, self::MENU_SLUG . '-' );
	}
}

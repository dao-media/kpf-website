<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

final class Admin {
	public const MENU_SLUG = 'kpf-performance';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	/**
	 * @return array<string, string>
	 */
	public static function sections(): array {
		return array(
			'overview' => __( 'Overview', 'kpf-core' ),
			'pages'    => __( 'Pages', 'kpf-core' ),
			'media'    => __( 'Media', 'kpf-core' ),
			'code'     => __( 'Code', 'kpf-core' ),
			'browser'  => __( 'Browser', 'kpf-core' ),
			'cdn'      => __( 'CDN', 'kpf-core' ),
			'advanced' => __( 'Advanced', 'kpf-core' ),
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
					__( 'Performance', 'kpf-core' ),
					__( 'Performance', 'kpf-core' ),
					'manage_options',
					$slug,
					array( self::class, 'render' ),
					'dashicons-performance',
					59
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
		echo '<div class="wrap kpf-performance-wrap"><div id="kpf-performance-admin-root"></div></div>';
	}

	public static function enqueue( string $hook ): void {
		if ( ! self::is_performance_screen( $hook ) ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/performance-admin.asset.php';
		$asset      = is_readable( $asset_file ) ? require $asset_file : array(
			'dependencies' => array( 'wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n', 'wp-notices' ),
			'version'      => KPF_CORE_VERSION,
		);

		wp_enqueue_style( 'wp-components' );
		$style_file = KPF_CORE_PATH . 'build/performance-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-performance-admin',
				KPF_CORE_URL . 'build/performance-admin.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-performance-admin',
			KPF_CORE_URL . 'build/performance-admin.js',
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
			'kpf-performance-admin',
			'kpfPerformanceAdmin',
			array(
				'restUrl'    => esc_url_raw( rest_url( 'kpf-performance/v1' ) ),
				'nonce'      => wp_create_nonce( 'wp_rest' ),
				'adminUrl'   => admin_url(),
				'initialTab' => self::tab_from_page(),
				'sections'   => self::sections(),
				'presets'           => $preset_meta,
				'ttlOptions'        => self::ttl_options(),
				'dnsPrefetch'       => DnsPrefetch::catalog(),
				'dnsPrefetchGroups' => DnsPrefetch::groups(),
			)
		);
	}

	/**
	 * @return array<int, array{label:string,value:int}>
	 */
	public static function ttl_options(): array {
		return array(
			array( 'label' => __( 'No cache (0)', 'kpf-core' ), 'value' => 0 ),
			array( 'label' => __( '30 seconds', 'kpf-core' ), 'value' => 30 ),
			array( 'label' => __( '1 minute', 'kpf-core' ), 'value' => 60 ),
			array( 'label' => __( '5 minutes', 'kpf-core' ), 'value' => 300 ),
			array( 'label' => __( '15 minutes', 'kpf-core' ), 'value' => 900 ),
			array( 'label' => __( '1 hour', 'kpf-core' ), 'value' => 3600 ),
			array( 'label' => __( '6 hours', 'kpf-core' ), 'value' => 21600 ),
			array( 'label' => __( '1 day', 'kpf-core' ), 'value' => 86400 ),
			array( 'label' => __( '7 days', 'kpf-core' ), 'value' => 604800 ),
			array( 'label' => __( '30 days', 'kpf-core' ), 'value' => 2592000 ),
			array( 'label' => __( '1 year', 'kpf-core' ), 'value' => 31536000 ),
		);
	}

	private static function is_performance_screen( string $hook ): bool {
		if ( str_contains( $hook, self::MENU_SLUG ) ) {
			return true;
		}

		$page = isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		return self::MENU_SLUG === $page || str_starts_with( $page, self::MENU_SLUG . '-' );
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Design\Icons;

use KPF\Core\Design\Admin as DesignAdmin;
use KPF\Core\Design\Tokens\Registry;
use KPF\Core\Stylesheet\Assets as StylesheetAssets;
use KPF\Core\Stylesheet\Defaults as StylesheetDefaults;

/**
 * Design → Icons admin (Lucide catalog, copy, stylesheet class, PNG export).
 */
final class Admin {
	public const MENU_SLUG = 'kpf-icons';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 27 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	public static function menu(): void {
		add_submenu_page(
			DesignAdmin::MENU_SLUG,
			__( 'Icons', 'kpf-core' ),
			__( 'Icons', 'kpf-core' ),
			'edit_theme_options',
			self::MENU_SLUG,
			array( self::class, 'render' )
		);
	}

	public static function enqueue( string $hook ): void {
		unset( $hook );
		$page = isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';
		if ( self::MENU_SLUG !== $page ) {
			return;
		}

		// Design token CSS vars (e.g. --kpf-color-icon-brand) so color presets resolve in preview.
		$foundation      = StylesheetDefaults::path();
		$style_deps      = array( 'wp-components' );
		$foundation_ok   = is_readable( $foundation );
		if ( $foundation_ok ) {
			wp_enqueue_style(
				StylesheetAssets::FOUNDATION_HANDLE,
				KPF_CORE_URL . 'assets/stylesheet/foundation.css',
				array(),
				KPF_CORE_VERSION . '.' . (string) filemtime( $foundation )
			);
			$style_deps[] = StylesheetAssets::FOUNDATION_HANDLE;
		}

		wp_enqueue_style(
			'kpf-icons-admin',
			KPF_CORE_URL . 'build/icons-admin.css',
			$style_deps,
			KPF_CORE_VERSION
		);

		$managed_tokens = Registry::compile_block();
		if ( '' !== trim( $managed_tokens ) ) {
			wp_add_inline_style( 'kpf-icons-admin', $managed_tokens );
		}

		$asset_file = KPF_CORE_PATH . 'build/icons-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-components', 'wp-element', 'wp-i18n' ),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_script(
			'kpf-icons-admin',
			KPF_CORE_URL . 'build/icons-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-icons-admin',
			'kpfIconsAdmin',
			array(
				'nonce'         => wp_create_nonce( 'wp_rest' ),
				'restBase'      => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'stylesheetUrl' => admin_url( 'admin.php?page=kpf-stylesheet' ),
				'tokensUrl'     => admin_url( 'admin.php?page=kpf-design-tokens' ),
				'defaults'      => array(
					'size'           => 20,
					'strokeWidth'    => 1.75,
					'strokeLinecap'  => 'round',
					'strokeLinejoin' => 'round',
					'color'          => 'currentColor',
					'padding'        => '0',
					'margin'         => '0',
				),
				'colorTokens'   => array(
					array(
						'label' => __( 'Inherit (currentColor)', 'kpf-core' ),
						'value' => 'currentColor',
					),
					array(
						'label' => __( 'Primary', 'kpf-core' ),
						'value' => 'var(--kpf-color-icon-primary)',
					),
					array(
						'label' => __( 'Brand', 'kpf-core' ),
						'value' => 'var(--kpf-color-icon-brand)',
					),
					array(
						'label' => __( 'Muted', 'kpf-core' ),
						'value' => 'var(--kpf-color-icon-muted)',
					),
					array(
						'label' => __( 'On brand', 'kpf-core' ),
						'value' => 'var(--kpf-color-icon-on-brand)',
					),
				),
			)
		);
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage icons.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-icons-admin">';
		echo '<div id="kpf-icons-admin-root"></div>';
		echo '</div>';
	}
}

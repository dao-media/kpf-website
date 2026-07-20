<?php

declare(strict_types=1);

namespace KPF\Core\DynamicContent;

/**
 * Admin screen under Code → Dynamic Content.
 */
final class Admin {
	public const MENU_SLUG = 'kpf-dynamic-content';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 20 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	public static function menu(): void {
		add_submenu_page(
			'edit.php?post_type=kpf_code',
			__( 'Dynamic Content', 'kpf-core' ),
			__( 'Dynamic Content', 'kpf-core' ),
			'edit_theme_options',
			self::MENU_SLUG,
			array( self::class, 'render' )
		);
	}

	public static function enqueue( string $hook ): void {
		if ( 'kpf_code_page_' . self::MENU_SLUG !== $hook ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/dynamic-content-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-element', 'wp-i18n', 'wp-components' ),
				'version'      => KPF_CORE_VERSION,
			);

		$style_file = KPF_CORE_PATH . 'build/dynamic-content-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-dynamic-content-admin',
				KPF_CORE_URL . 'build/dynamic-content-admin.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-dynamic-content-admin',
			KPF_CORE_URL . 'build/dynamic-content-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-dynamic-content-admin',
			'kpfDynamicContentAdmin',
			array(
				'restUrl' => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
			)
		);
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage dynamic content.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-dynamic-content-wrap">';
		echo '<div id="kpf-dynamic-content-admin-root"></div>';
		echo '</div>';
	}
}

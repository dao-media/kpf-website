<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

final class Admin {
	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 25 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	public static function menu(): void {
		add_menu_page(
			__( 'Stylesheet', 'kpf-core' ),
			__( 'Stylesheet', 'kpf-core' ),
			'edit_theme_options',
			ContentType::MENU_SLUG,
			array( self::class, 'render' ),
			'dashicons-editor-code',
			58
		);
	}

	public static function enqueue( string $hook ): void {
		if ( 'toplevel_page_' . ContentType::MENU_SLUG !== $hook ) {
			return;
		}

		$code_editor_settings = wp_enqueue_code_editor( array( 'type' => 'text/css' ) );
		wp_enqueue_style(
			'kpf-stylesheet-admin',
			KPF_CORE_URL . 'build/stylesheet-admin.css',
			array( 'wp-components' ),
			KPF_CORE_VERSION
		);

		$asset_file = KPF_CORE_PATH . 'build/stylesheet-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-components', 'wp-element', 'wp-i18n' ),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_script(
			'kpf-stylesheet-admin',
			KPF_CORE_URL . 'build/stylesheet-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-stylesheet-admin',
			'kpfStylesheetAdmin',
			array(
				'nonce'          => wp_create_nonce( 'wp_rest' ),
				'restBase'       => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'maxBytes'       => Meta::MAX_BYTES,
				'codeEditor'     => is_array( $code_editor_settings ) ? $code_editor_settings : array(),
				'frontendUrl'    => esc_url_raw( home_url( '/' ) ),
				'stylesheetName' => __( 'Global stylesheet', 'kpf-core' ),
			)
		);
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to edit the stylesheet.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-stylesheet-admin">';
		echo '<div id="kpf-stylesheet-admin-root"></div>';
		echo '</div>';
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Design\Tokens;

use KPF\Core\Design\Admin as DesignAdmin;

final class Admin {
	public const MENU_SLUG = 'kpf-design-tokens';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 26 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	public static function menu(): void {
		add_submenu_page(
			DesignAdmin::MENU_SLUG,
			__( 'Tokens', 'kpf-core' ),
			__( 'Tokens', 'kpf-core' ),
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

		wp_enqueue_style(
			'kpf-tokens-admin',
			KPF_CORE_URL . 'build/tokens-admin.css',
			array( 'wp-components' ),
			KPF_CORE_VERSION
		);

		$asset_file = KPF_CORE_PATH . 'build/tokens-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-components', 'wp-element', 'wp-i18n' ),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_script(
			'kpf-tokens-admin',
			KPF_CORE_URL . 'build/tokens-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-tokens-admin',
			'kpfTokensAdmin',
			array(
				'nonce'      => wp_create_nonce( 'wp_rest' ),
				'restBase'   => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'designsUrl' => admin_url( 'edit.php?post_type=page&page=kpf-designs' ),
			)
		);
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage design tokens.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-tokens-admin">';
		echo '<div id="kpf-tokens-admin-root"></div>';
		echo '</div>';
	}
}

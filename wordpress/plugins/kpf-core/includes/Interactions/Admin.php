<?php

declare(strict_types=1);

namespace KPF\Core\Interactions;

final class Admin {
	public const MENU_SLUG = 'kpf-interactions';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 30 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	public static function menu(): void {
		add_menu_page(
			__( 'Interactions', 'kpf-core' ),
			__( 'Interactions', 'kpf-core' ),
			'edit_pages',
			self::MENU_SLUG,
			array( self::class, 'render' ),
			'dashicons-controls-play',
			62
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'GSAP Animation Builder', 'kpf-core' ),
			__( 'GSAP', 'kpf-core' ),
			'edit_pages',
			'kpf-gsap',
			array( self::class, 'render' )
		);

		remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG );
	}

	public static function enqueue( string $hook ): void {
		unset( $hook );
		$page = isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';
		if ( ! in_array( $page, array( self::MENU_SLUG, 'kpf-gsap' ), true ) ) {
			return;
		}

		wp_enqueue_style(
			'kpf-gsap-admin',
			KPF_CORE_URL . 'build/gsap-admin.css',
			array( 'wp-components' ),
			KPF_CORE_VERSION
		);

		$asset_file = KPF_CORE_PATH . 'build/gsap-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-components', 'wp-element', 'wp-i18n' ),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_script(
			'kpf-gsap-admin',
			KPF_CORE_URL . 'build/gsap-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-gsap-admin',
			'kpfGsapAdmin',
			array(
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'restBase' => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
			)
		);
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_pages' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage interactions.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-gsap-admin">';
		echo '<div id="kpf-gsap-admin-root"></div>';
		echo '</div>';
	}
}

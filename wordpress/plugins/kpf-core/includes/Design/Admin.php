<?php

declare(strict_types=1);

namespace KPF\Core\Design;

use KPF\Core\Stylesheet\ContentType as StylesheetContentType;

/**
 * Utilities → Design parent menu (Stylesheet, Tokens, Icons, Components).
 */
final class Admin {
	public const MENU_SLUG = 'kpf-design';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 24 );
		add_action( 'admin_menu', array( self::class, 'prune_duplicate' ), 99 );
	}

	public static function menu(): void {
		add_menu_page(
			__( 'Design', 'kpf-core' ),
			__( 'Design', 'kpf-core' ),
			'edit_posts',
			self::MENU_SLUG,
			array( self::class, 'redirect' ),
			'dashicons-art',
			58
		);
	}

	/**
	 * Remove the auto-added "Design" duplicate under itself so only real children show.
	 */
	public static function prune_duplicate(): void {
		remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG );
	}

	public static function redirect(): void {
		if ( current_user_can( 'edit_theme_options' ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . StylesheetContentType::MENU_SLUG ) );
			exit;
		}

		if ( current_user_can( 'edit_posts' ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=kpf-components' ) );
			exit;
		}

		wp_die( esc_html__( 'You do not have permission to manage design.', 'kpf-core' ) );
	}
}

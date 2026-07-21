<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

/**
 * Strip WordPress theme-admin chrome for this headless install.
 *
 * Faust's disable_theme already removes Themes / Customizer / Site Editor.
 * This finishes the job: drop the Appearance parent menu and any leftover
 * submenu items (Menus, Fonts) once Stylesheet is a top-level screen.
 */
final class HeadlessAppearance {
	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'remove_appearance_menu' ), 999 );
		add_action( 'admin_bar_menu', array( self::class, 'remove_admin_bar_nodes' ), 999 );
		add_action( 'load-themes.php', array( self::class, 'block_themes_screen' ) );
		add_action( 'load-theme-install.php', array( self::class, 'block_themes_screen' ) );
		add_filter( 'map_meta_cap', array( self::class, 'map_meta_cap' ), 10, 2 );
	}

	public static function remove_appearance_menu(): void {
		remove_menu_page( 'themes.php' );

		global $submenu;
		if ( isset( $submenu['themes.php'] ) ) {
			unset( $submenu['themes.php'] );
		}
	}

	/**
	 * @param \WP_Admin_Bar $bar Admin bar.
	 */
	public static function remove_admin_bar_nodes( \WP_Admin_Bar $bar ): void {
		foreach ( array( 'themes', 'customize', 'widgets', 'site-editor', 'menus', 'background', 'header' ) as $id ) {
			$bar->remove_node( $id );
		}
	}

	public static function block_themes_screen(): void {
		wp_safe_redirect( admin_url( 'admin.php?page=kpf-stylesheet' ) );
		exit;
	}

	/**
	 * Soft-disable theme install / update capabilities in the admin UI.
	 * Leaves edit_theme_options intact (Stylesheet, Code, Dynamic Content).
	 *
	 * @param string[] $caps Primed capabilities.
	 * @param string   $cap  Capability being checked.
	 * @return string[]
	 */
	public static function map_meta_cap( array $caps, string $cap ): array {
		if ( in_array( $cap, array( 'install_themes', 'delete_themes', 'update_themes', 'edit_themes' ), true ) ) {
			return array( 'do_not_allow' );
		}

		return $caps;
	}
}

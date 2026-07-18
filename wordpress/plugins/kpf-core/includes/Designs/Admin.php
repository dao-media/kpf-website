<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

final class Admin {
	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 20 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	public static function menu(): void {
		add_submenu_page(
			'edit.php?post_type=page',
			__( 'Designs', 'kpf-core' ),
			__( 'Designs', 'kpf-core' ),
			'edit_pages',
			ContentType::MENU_SLUG,
			array( self::class, 'render' )
		);
	}

	public static function enqueue( string $hook ): void {
		if ( 'pages_page_' . ContentType::MENU_SLUG !== $hook ) {
			return;
		}

		$code_editor_settings = wp_enqueue_code_editor( array( 'type' => 'text/html' ) );

		wp_enqueue_style(
			'kpf-designs-admin',
			KPF_CORE_URL . 'build/designs-admin.css',
			array(),
			KPF_CORE_VERSION
		);

		$asset_file = KPF_CORE_PATH . 'build/designs-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-element', 'wp-i18n', 'wp-components' ),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_script(
			'kpf-designs-admin',
			KPF_CORE_URL . 'build/designs-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-designs-admin',
			'kpfDesignsAdmin',
			array(
				'nonce'             => wp_create_nonce( 'wp_rest' ),
				'restBase'          => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'maxSourceBytes'    => Meta::MAX_SOURCE_BYTES,
				'codeEditor'        => is_array( $code_editor_settings ) ? $code_editor_settings : array(),
				'canManageSettings' => current_user_can( 'manage_options' ),
			)
		);
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_pages' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage page designs.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-designs-admin">';
		echo '<h1>' . esc_html__( 'Designs', 'kpf-core' ) . '</h1>';
		echo '<p>' . esc_html__(
			'Upload an HTML or SVG design (and optional CSS) for each site URL, then edit its copy or source code in the browser.',
			'kpf-core'
		) . '</p>';
		echo '<div id="kpf-designs-admin-root"></div>';
		echo '</div>';
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function site_urls(): array {
		$pages = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		$rows = array();
		foreach ( $pages as $page ) {
			$page_id = (int) $page->ID;
			$design_id = (int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true );
			$design    = $design_id > 0 ? Meta::get_design( $design_id ) : Meta::design_defaults();
			$ready     = Meta::page_has_design( $page_id );
			$permalink = (string) get_permalink( $page_id );
			$path      = wp_parse_url( $permalink, PHP_URL_PATH );
			$path      = is_string( $path ) && '' !== $path ? $path : '/';

			$rows[] = array(
				'id'           => $page_id,
				'title'        => get_the_title( $page ) ?: __( '(no title)', 'kpf-core' ),
				'status'       => (string) $page->post_status,
				'url'          => $permalink,
				'path'         => $path,
				'ready'        => $ready,
				'designId'     => $design_id,
				'htmlFilename' => (string) ( $design['html_filename'] ?? '' ),
				'cssFilename'  => (string) ( $design['css_filename'] ?? '' ),
			);
		}

		return $rows;
	}
}

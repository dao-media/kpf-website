<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

/**
 * Adds sidebar section labels and keeps grouped items as visible top-level menus.
 */
final class MenuOrganizer {
	public const CONTENT_LABEL_SLUG        = 'kpf-section-content';
	public const COMMUNICATIONS_LABEL_SLUG = 'kpf-section-communications';
	public const UTILITIES_LABEL_SLUG      = 'kpf-section-utilities';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'reorganize' ), 9999 );
		add_action( 'init', array( self::class, 'rename_posts_to_blogs' ), 20 );
		add_filter( 'parent_file', array( self::class, 'parent_file' ), 30 );
		add_filter( 'submenu_file', array( self::class, 'submenu_file' ), 30 );
		add_action( 'admin_head', array( self::class, 'styles' ) );
		add_action( 'admin_footer', array( self::class, 'label_accessibility' ) );
	}

	public static function rename_posts_to_blogs(): void {
		$post_type = get_post_type_object( 'post' );
		if ( ! $post_type || ! isset( $post_type->labels ) ) {
			return;
		}

		$labels                       = $post_type->labels;
		$labels->name                 = __( 'Blogs', 'kpf-core' );
		$labels->singular_name        = __( 'Blog', 'kpf-core' );
		$labels->add_new              = __( 'Add Blog', 'kpf-core' );
		$labels->add_new_item         = __( 'Add Blog', 'kpf-core' );
		$labels->edit_item            = __( 'Edit Blog', 'kpf-core' );
		$labels->new_item             = __( 'Blog', 'kpf-core' );
		$labels->view_item            = __( 'View Blog', 'kpf-core' );
		$labels->view_items           = __( 'View Blogs', 'kpf-core' );
		$labels->search_items         = __( 'Search Blogs', 'kpf-core' );
		$labels->not_found            = __( 'No blogs found.', 'kpf-core' );
		$labels->not_found_in_trash   = __( 'No blogs found in Trash.', 'kpf-core' );
		$labels->all_items            = __( 'All Blogs', 'kpf-core' );
		$labels->menu_name            = __( 'Blogs', 'kpf-core' );
		$labels->name_admin_bar       = __( 'Blog', 'kpf-core' );
		$labels->archives             = __( 'Blog Archives', 'kpf-core' );
	}

	public static function reorganize(): void {
		global $menu;

		if ( ! is_array( $menu ) ) {
			$menu = array();
		}

		self::split_media_menu();
		self::insert_section_labels();
		self::reorder_menu();
	}

	private static function split_media_menu(): void {
		global $menu;

		remove_menu_page( 'upload.php' );

		$menu['10.1'] = array(
			__( 'Images', 'kpf-core' ),
			'upload_files',
			'upload.php?attachment-filter=post_mime_type:image',
			'',
			'menu-top menu-icon-media',
			'menu-media-images',
			'dashicons-format-image',
		);

		$menu['10.2'] = array(
			__( 'Videos', 'kpf-core' ),
			'upload_files',
			'upload.php?attachment-filter=post_mime_type:video',
			'',
			'menu-top menu-icon-media',
			'menu-media-videos',
			'dashicons-video-alt3',
		);
	}

	private static function insert_section_labels(): void {
		global $menu;

		$menu['4.9'] = self::label_item(
			__( 'Content', 'kpf-core' ),
			self::CONTENT_LABEL_SLUG
		);

		$menu['24.9'] = self::label_item(
			__( 'Communications', 'kpf-core' ),
			self::COMMUNICATIONS_LABEL_SLUG
		);

		$menu['57.9'] = self::label_item(
			__( 'Utilities', 'kpf-core' ),
			self::UTILITIES_LABEL_SLUG
		);
	}

	/**
	 * @return array{0: string, 1: string, 2: string, 3: string, 4: string, 5: string, 6: string}
	 */
	private static function label_item( string $title, string $slug ): array {
		return array(
			$title,
			'read',
			$slug,
			'',
			'wp-menu-separator kpf-menu-section-label',
			'kpf-menu-section-' . $slug,
			'none',
		);
	}

	private static function reorder_menu(): void {
		global $menu;

		$desired = array(
			'index.php',
			self::CONTENT_LABEL_SLUG,
			'edit.php',
			'upload.php?attachment-filter=post_mime_type:image',
			'upload.php?attachment-filter=post_mime_type:video',
			'edit.php?post_type=page',
			'edit.php?post_type=kpf_scrapbook',
			'kpf-components',
			self::COMMUNICATIONS_LABEL_SLUG,
			'kpf-inbox',
			self::UTILITIES_LABEL_SLUG,
			'kpf-seo',
			'kpf-performance',
			'themes.php',
			'kpf-interactions',
			'plugins.php',
			'users.php',
			'tools.php',
			'options-general.php',
			'graphiql-ide',
		);

		$by_slug = array();
		foreach ( $menu as $item ) {
			if ( ! is_array( $item ) || empty( $item[2] ) ) {
				continue;
			}
			$by_slug[ (string) $item[2] ] = $item;
		}

		$ordered = array();
		$used    = array();

		foreach ( $desired as $slug ) {
			if ( ! isset( $by_slug[ $slug ] ) ) {
				continue;
			}
			$ordered[]  = $by_slug[ $slug ];
			$used[ $slug ] = true;
		}

		// Append remaining items (GraphQL, separators, third-party) in original relative order.
		foreach ( $menu as $item ) {
			if ( ! is_array( $item ) || empty( $item[2] ) ) {
				continue;
			}
			$slug = (string) $item[2];
			if ( isset( $used[ $slug ] ) ) {
				continue;
			}
			// Drop default WP separators that collide with our labeled sections.
			if ( str_starts_with( $slug, 'separator' ) ) {
				continue;
			}
			$ordered[] = $item;
		}

		// Re-index with spaced keys so WP keeps a stable visual order.
		$menu   = array();
		$cursor = 2;
		foreach ( $ordered as $item ) {
			$menu[ (string) $cursor ] = $item;
			$cursor += 1;
		}
	}

	/**
	 * Keep Images / Videos highlighted as the active top-level item.
	 *
	 * @param string $parent_file Current parent file.
	 */
	public static function parent_file( string $parent_file ): string {
		global $pagenow;

		if ( 'upload.php' !== $pagenow && 'media-new.php' !== $pagenow && 'async-upload.php' !== $pagenow ) {
			return $parent_file;
		}

		$filter = isset( $_GET['attachment-filter'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_text_field( wp_unslash( (string) $_GET['attachment-filter'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		if ( 'post_mime_type:video' === $filter ) {
			return 'upload.php?attachment-filter=post_mime_type:video';
		}

		return 'upload.php?attachment-filter=post_mime_type:image';
	}

	/**
	 * Highlight Images vs Videos under the split Media entries.
	 *
	 * @param string|null $submenu_file Current submenu file.
	 */
	public static function submenu_file( ?string $submenu_file ): ?string {
		global $pagenow;

		if ( 'upload.php' !== $pagenow && 'media-new.php' !== $pagenow ) {
			return $submenu_file;
		}

		$filter = isset( $_GET['attachment-filter'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_text_field( wp_unslash( (string) $_GET['attachment-filter'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		if ( 'post_mime_type:video' === $filter ) {
			return 'upload.php?attachment-filter=post_mime_type:video';
		}

		return 'upload.php?attachment-filter=post_mime_type:image';
	}

	public static function styles(): void {
		$content        = wp_json_encode( __( 'Content', 'kpf-core' ) );
		$communications = wp_json_encode( __( 'Communications', 'kpf-core' ) );
		$utilities      = wp_json_encode( __( 'Utilities', 'kpf-core' ) );

		echo '<style id="kpf-admin-menu-organizer">
			#adminmenu li.kpf-menu-section-label {
				box-sizing: border-box;
				display: block;
				height: auto;
				margin: 10px 0 3px;
				padding: 0;
				pointer-events: none;
				width: 100%;
			}
			#adminmenu li.kpf-menu-section-label .separator {
				box-sizing: border-box;
				color: #99a1a7 !important;
				display: block;
				font-size: 11px;
				font-weight: 700;
				height: auto;
				letter-spacing: 0.055em;
				line-height: 1.2;
				margin: 0;
				padding: 7px 12px 5px;
				text-transform: uppercase;
				width: 100%;
			}
			#kpf-menu-section-kpf-section-content .separator::after {
				content: ' . $content . ';
			}
			#kpf-menu-section-kpf-section-communications .separator::after {
				content: ' . $communications . ';
			}
			#kpf-menu-section-kpf-section-utilities .separator::after {
				content: ' . $utilities . ';
			}
			#adminmenu li.wp-menu-separator {
				margin: 0;
				height: 0;
				padding: 0;
				border: 0;
			}
			#adminmenu li.wp-menu-separator.kpf-menu-section-label {
				height: auto;
				margin: 10px 0 3px;
			}
			.folded #adminmenu li.kpf-menu-section-label {
				display: none;
			}
		</style>';
	}

	public static function label_accessibility(): void {
		$labels = array(
			'kpf-menu-section-kpf-section-content'        => __( 'Content section', 'kpf-core' ),
			'kpf-menu-section-kpf-section-communications' => __( 'Communications section', 'kpf-core' ),
			'kpf-menu-section-kpf-section-utilities'      => __( 'Utilities section', 'kpf-core' ),
		);

		echo '<script id="kpf-admin-menu-label-accessibility">
			(function () {
				var labels = ' . wp_json_encode( $labels ) . ';
				Object.keys(labels).forEach(function (id) {
					var item = document.getElementById(id);
					if (!item || item.querySelector(".screen-reader-text")) {
						return;
					}
					item.removeAttribute("aria-hidden");
					var text = document.createElement("span");
					text.className = "screen-reader-text";
					text.textContent = labels[id];
					item.appendChild(text);
				});
			})();
		</script>';
	}
}

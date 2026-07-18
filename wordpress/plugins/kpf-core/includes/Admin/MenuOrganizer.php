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
	private const PLUGINS_DIVIDER_SLUG     = 'kpf-plugins-divider';
	private const SCF_MENU_SLUG            = 'edit.php?post_type=acf-field-group';
	private const SCF_POST_TYPES           = array(
		'acf-field-group',
		'acf-post-type',
		'acf-taxonomy',
		'acf-ui-options-page',
	);

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'reorganize' ), 9999 );
		add_action( 'init', array( self::class, 'rename_posts_to_blogs' ), 20 );
		add_action( 'init', array( self::class, 'rename_post_tags_to_topics' ), 20 );
		add_action( 'init', array( self::class, 'rename_pages_menu' ), 20 );
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

	public static function rename_post_tags_to_topics(): void {
		$taxonomy = get_taxonomy( 'post_tag' );
		if ( ! $taxonomy || ! isset( $taxonomy->labels ) ) {
			return;
		}

		$labels                              = $taxonomy->labels;
		$labels->name                       = __( 'Topics', 'kpf-core' );
		$labels->singular_name              = __( 'Topic', 'kpf-core' );
		$labels->search_items               = __( 'Search Topics', 'kpf-core' );
		$labels->popular_items              = __( 'Popular Topics', 'kpf-core' );
		$labels->all_items                  = __( 'All Topics', 'kpf-core' );
		$labels->edit_item                  = __( 'Edit Topic', 'kpf-core' );
		$labels->view_item                  = __( 'View Topic', 'kpf-core' );
		$labels->update_item                = __( 'Update Topic', 'kpf-core' );
		$labels->add_new_item               = __( 'Add New Topic', 'kpf-core' );
		$labels->new_item_name              = __( 'New Topic Name', 'kpf-core' );
		$labels->separate_items_with_commas = __( 'Separate topics with commas', 'kpf-core' );
		$labels->add_or_remove_items         = __( 'Add or remove topics', 'kpf-core' );
		$labels->choose_from_most_used       = __( 'Choose from the most used topics', 'kpf-core' );
		$labels->not_found                   = __( 'No topics found.', 'kpf-core' );
		$labels->no_terms                    = __( 'No topics', 'kpf-core' );
		$labels->items_list_navigation       = __( 'Topics list navigation', 'kpf-core' );
		$labels->items_list                  = __( 'Topics list', 'kpf-core' );
		$labels->most_used                   = __( 'Most Used', 'kpf-core' );
		$labels->back_to_items               = __( 'Back to Topics', 'kpf-core' );
		$labels->menu_name                   = __( 'Topics', 'kpf-core' );

		$taxonomy->label = __( 'Topics', 'kpf-core' );
		if ( ! is_array( $taxonomy->rewrite ) ) {
			$taxonomy->rewrite = array();
		}
		$taxonomy->rewrite['slug'] = 'topics';

		global $wp_rewrite;
		if ( $wp_rewrite instanceof \WP_Rewrite ) {
			$wp_rewrite->set_tag_base( 'topics' );
			if ( isset( $wp_rewrite->extra_permastructs['post_tag'] ) ) {
				$wp_rewrite->extra_permastructs['post_tag']['struct'] = 'topics/%post_tag%';
			}
		}

		if ( 'topics' !== get_option( 'tag_base' ) ) {
			update_option( 'tag_base', 'topics' );
			flush_rewrite_rules( false );
		}
	}

	public static function rename_pages_menu(): void {
		$post_type = get_post_type_object( 'page' );
		if ( ! $post_type || ! isset( $post_type->labels ) ) {
			return;
		}

		$post_type->labels->all_items = __( 'Manage', 'kpf-core' );
	}

	public static function reorganize(): void {
		global $menu;

		if ( ! is_array( $menu ) ) {
			$menu = array();
		}

		self::split_media_menu();
		self::customize_pages_submenu();
		self::customize_plugins_submenu();
		self::move_scf_to_tools();
		self::insert_section_labels();
		self::reorder_menu();
	}

	/**
	 * Nest Secure Custom Fields under Tools instead of a top-level sidebar item.
	 */
	private static function move_scf_to_tools(): void {
		global $submenu;

		$scf_parent = self::SCF_MENU_SLUG;
		if ( ! is_array( $submenu[ $scf_parent ] ?? null ) ) {
			remove_menu_page( $scf_parent );
			return;
		}

		$capability = 'manage_options';
		$moved      = array();
		foreach ( $submenu[ $scf_parent ] as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$slug = (string) ( $item[2] ?? '' );
			if ( '' === $slug ) {
				continue;
			}

			$capability = (string) ( $item[1] ?? $capability );

			if ( $slug === $scf_parent ) {
				$item[0] = __( 'SCF', 'kpf-core' );
			} elseif ( 'acf-tools' === $slug ) {
				// Avoid Tools → Tools when nesting under the core Tools menu.
				$item[0] = __( 'SCF Import / Export', 'kpf-core' );
			}

			$moved[] = $item;
		}

		unset( $submenu[ $scf_parent ] );
		remove_menu_page( $scf_parent );

		if ( $moved === array() ) {
			return;
		}

		if ( ! is_array( $submenu['tools.php'] ?? null ) ) {
			$submenu['tools.php'] = array();
		}

		$submenu['tools.php'][] = array(
			'<span class="kpf-tools-menu-divider" aria-hidden="true"></span>',
			$capability,
			'kpf-tools-scf-divider',
		);

		foreach ( $moved as $item ) {
			$submenu['tools.php'][] = $item;
		}
	}

	private static function customize_pages_submenu(): void {
		remove_submenu_page( 'edit.php?post_type=page', 'post-new.php?post_type=page' );

		global $submenu;
		$parent = 'edit.php?post_type=page';
		if ( ! is_array( $submenu[ $parent ] ?? null ) ) {
			return;
		}

		foreach ( $submenu[ $parent ] as $index => $item ) {
			if ( ( $item[2] ?? '' ) === $parent ) {
				$submenu[ $parent ][ $index ][0] = __( 'Manage', 'kpf-core' );
			}
		}
	}

	private static function customize_plugins_submenu(): void {
		global $submenu;

		$parent = 'plugins.php';
		if ( ! is_array( $submenu[ $parent ] ?? null ) ) {
			return;
		}

		$by_slug = array();
		foreach ( $submenu[ $parent ] as $item ) {
			$slug = (string) ( $item[2] ?? '' );
			if ( '' !== $slug ) {
				$by_slug[ $slug ] = $item;
			}
		}

		if ( ! isset( $by_slug[ $parent ] ) ) {
			return;
		}

		$installed    = $by_slug[ $parent ];
		$capability   = (string) ( $installed[1] ?? 'activate_plugins' );
		$installed[0] = __( 'Installed', 'kpf-core' );

		$active    = $installed;
		$active[0] = __( 'Active', 'kpf-core' );
		$active[2] = 'plugins.php?plugin_status=active';

		$inactive    = $installed;
		$inactive[0] = __( 'Inactive', 'kpf-core' );
		$inactive[2] = 'plugins.php?plugin_status=inactive';

		$ordered = array(
			$installed,
			$active,
			$inactive,
			array(
				'<span class="kpf-plugins-menu-divider" aria-hidden="true"></span>',
				$capability,
				self::PLUGINS_DIVIDER_SLUG,
			),
		);

		if ( isset( $by_slug['plugin-install.php'] ) ) {
			$add_new    = $by_slug['plugin-install.php'];
			$add_new[0] = __( 'Add New', 'kpf-core' );
			$ordered[]  = $add_new;
		}

		$submenu[ $parent ] = $ordered;
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
		global $pagenow, $plugin_page, $typenow;

		if ( self::SCF_MENU_SLUG === $parent_file ) {
			return 'tools.php';
		}

		$post_type = $typenow;
		if ( ! is_string( $post_type ) || '' === $post_type ) {
			$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
			$post_type = is_object( $screen ) ? (string) ( $screen->post_type ?? '' ) : '';
		}

		if ( in_array( $post_type, self::SCF_POST_TYPES, true ) ) {
			return 'tools.php';
		}

		if ( in_array( (string) $plugin_page, array( 'acf-tools', 'scf-beta-features' ), true ) ) {
			return 'tools.php';
		}

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

		if ( 'plugins.php' === $pagenow ) {
			$status = isset( $_GET['plugin_status'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				? sanitize_key( wp_unslash( (string) $_GET['plugin_status'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				: '';

			if ( in_array( $status, array( 'active', 'inactive' ), true ) ) {
				return 'plugins.php?plugin_status=' . $status;
			}

			return 'plugins.php';
		}

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
			#adminmenu #menu-plugins .wp-submenu li a[href*="' . self::PLUGINS_DIVIDER_SLUG . '"] {
				background: transparent !important;
				box-shadow: none !important;
				cursor: default;
				height: 1px;
				margin: 8px 12px 7px;
				min-height: 0;
				overflow: hidden;
				padding: 0;
				pointer-events: none;
				transform: none !important;
			}
			#adminmenu #menu-plugins .wp-submenu .kpf-plugins-menu-divider {
				background: #d7dde7;
				display: block;
				height: 1px;
				width: 100%;
			}
			#adminmenu #menu-tools .wp-submenu li a[href*="kpf-tools-scf-divider"] {
				background: transparent !important;
				box-shadow: none !important;
				cursor: default;
				height: 1px;
				margin: 8px 12px 7px;
				min-height: 0;
				overflow: hidden;
				padding: 0;
				pointer-events: none;
				transform: none !important;
			}
			#adminmenu #menu-tools .wp-submenu .kpf-tools-menu-divider {
				background: #d7dde7;
				display: block;
				height: 1px;
				width: 100%;
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

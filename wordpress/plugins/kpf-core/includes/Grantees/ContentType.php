<?php

declare(strict_types=1);

namespace KPF\Core\Grantees;

final class ContentType {
	public const POST_TYPE = 'kpf_grantee';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
		add_action( 'after_setup_theme', array( self::class, 'ensure_thumbnails' ), 20 );
	}

	/**
	 * Featured-image UI requires theme support for post-thumbnails.
	 * Headless / stub themes often omit it, which hides Logo on grantees.
	 */
	public static function ensure_thumbnails(): void {
		if ( ! current_theme_supports( 'post-thumbnails' ) ) {
			add_theme_support( 'post-thumbnails' );
		}
		add_post_type_support( self::POST_TYPE, 'thumbnail' );
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'                  => __( 'Grantees', 'kpf-core' ),
					'singular_name'         => __( 'Grantee', 'kpf-core' ),
					'add_new'               => __( 'Add New', 'kpf-core' ),
					'add_new_item'          => __( 'Add grantee', 'kpf-core' ),
					'edit_item'             => __( 'Edit grantee', 'kpf-core' ),
					'new_item'              => __( 'New grantee', 'kpf-core' ),
					'view_item'             => __( 'View grantee', 'kpf-core' ),
					'search_items'          => __( 'Search grantees', 'kpf-core' ),
					'not_found'             => __( 'No grantees found.', 'kpf-core' ),
					'not_found_in_trash'    => __( 'No grantees found in Trash.', 'kpf-core' ),
					'all_items'             => __( 'Grantees', 'kpf-core' ),
					'item_published'        => __( 'Grantee published.', 'kpf-core' ),
					'item_updated'          => __( 'Grantee updated.', 'kpf-core' ),
					'featured_image'        => __( 'Logo / profile image', 'kpf-core' ),
					'set_featured_image'    => __( 'Set logo / profile image', 'kpf-core' ),
					'remove_featured_image' => __( 'Remove logo / profile image', 'kpf-core' ),
					'use_featured_image'    => __( 'Use as logo / profile image', 'kpf-core' ),
					'menu_name'             => __( 'Grantees', 'kpf-core' ),
				),
				'description'         => __(
					'Organizations that receive Foundation grants. Selectable as grant recipients; also used for the partners slider.',
					'kpf-core'
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'show_ui'             => true,
				// Nest under Grants (kpf_grant must register first — priority 5 both; Grants registers in Plugin before Grantees).
				'show_in_menu'        => 'edit.php?post_type=kpf_grant',
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'grantee',
				'graphql_plural_name' => 'grantees',
				// Icon unused when nested; Grants top-level uses Lucide.
				'menu_icon'           => 'none',
				'menu_position'       => null,
				'supports'            => array(
					'title',
					'thumbnail',
					'revisions',
					'custom-fields',
				),
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'delete_with_user'    => false,
				'map_meta_cap'        => true,
				'capability_type'     => 'post',
			)
		);
	}
}

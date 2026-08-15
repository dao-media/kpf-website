<?php

declare(strict_types=1);

namespace KPF\Core\Kevin;

/**
 * About-page history slides — nested under Scrapbook in wp-admin.
 * Each post: featured image + title (header) + content (body).
 */
final class ContentType {
	public const POST_TYPE = 'kpf_kevin';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
		add_action( 'after_setup_theme', array( self::class, 'ensure_thumbnails' ), 20 );
	}

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
					'name'                  => __( 'Kevin', 'kpf-core' ),
					'singular_name'         => __( 'Kevin slide', 'kpf-core' ),
					'add_new'               => __( 'Add New', 'kpf-core' ),
					'add_new_item'          => __( 'Add Kevin slide', 'kpf-core' ),
					'edit_item'             => __( 'Edit Kevin slide', 'kpf-core' ),
					'new_item'              => __( 'New Kevin slide', 'kpf-core' ),
					'view_item'             => __( 'View Kevin slide', 'kpf-core' ),
					'search_items'          => __( 'Search Kevin slides', 'kpf-core' ),
					'not_found'             => __( 'No Kevin slides found.', 'kpf-core' ),
					'not_found_in_trash'    => __( 'No Kevin slides found in Trash.', 'kpf-core' ),
					'all_items'             => __( 'Kevin', 'kpf-core' ),
					'item_published'        => __( 'Kevin slide published.', 'kpf-core' ),
					'item_updated'          => __( 'Kevin slide updated.', 'kpf-core' ),
					'featured_image'        => __( 'Slide photo', 'kpf-core' ),
					'set_featured_image'    => __( 'Set slide photo', 'kpf-core' ),
					'remove_featured_image' => __( 'Remove slide photo', 'kpf-core' ),
					'use_featured_image'    => __( 'Use as slide photo', 'kpf-core' ),
					'menu_name'             => __( 'Kevin', 'kpf-core' ),
				),
				'description'         => __(
					'Photo + header + body slides for the About page “Who Kevin was” stack.',
					'kpf-core'
				),
				/* Public like Scrapbook so Code → Queries can target this type; not front-routable. */
				'public'              => true,
				'publicly_queryable'  => false,
				'show_ui'             => true,
				'show_in_menu'        => 'edit.php?post_type=kpf_scrapbook',
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'kevinSlide',
				'graphql_plural_name' => 'kevinSlides',
				'menu_icon'           => 'none',
				'menu_position'       => null,
				'supports'            => array(
					'title',
					'editor',
					'thumbnail',
					'page-attributes', // menu_order
					'revisions',
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

<?php

declare(strict_types=1);

namespace KPF\Core\Scrapbook;

final class ContentType {
	public const POST_TYPE = 'kpf_scrapbook';
	public const TAXONOMY  = 'kpf_decade';

	public static function register(): void {
		add_action('init', array( self::class, 'register_content' ), 5);
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'             => array(
					'name'                  => __('Scrapbook', 'kpf-core'),
					'singular_name'         => __('Scrapbook item', 'kpf-core'),
					'add_new'               => __('Add scrapbook item', 'kpf-core'),
					'add_new_item'          => __('Add a scrapbook photo or story', 'kpf-core'),
					'edit_item'             => __('Edit scrapbook item', 'kpf-core'),
					'new_item'              => __('New scrapbook item', 'kpf-core'),
					'view_item'             => __('View scrapbook item', 'kpf-core'),
					'search_items'          => __('Search scrapbook', 'kpf-core'),
					'not_found'             => __('No scrapbook items found.', 'kpf-core'),
					'not_found_in_trash'    => __('No scrapbook items found in Trash.', 'kpf-core'),
					'all_items'             => __('All scrapbook items', 'kpf-core'),
					'item_published'        => __('Scrapbook item published.', 'kpf-core'),
					'item_updated'          => __('Scrapbook item updated.', 'kpf-core'),
					'featured_image'        => __('Cover image', 'kpf-core'),
					'set_featured_image'    => __('Choose cover image', 'kpf-core'),
					'remove_featured_image' => __('Remove cover image', 'kpf-core'),
					'menu_name'             => __('Scrapbook', 'kpf-core'),
				),
				'description'        => __(
					'Photos and photo stories with dates, places, source details, and historical notes.',
					'kpf-core'
				),
				'public'             => true,
				'publicly_queryable' => false,
				'show_ui'            => true,
				'show_in_menu'       => true,
				'show_in_rest'       => true,
				'show_in_graphql'    => true,
				'graphql_single_name' => 'scrapbookItem',
				'graphql_plural_name' => 'scrapbookItems',
				'menu_icon'          => 'dashicons-format-gallery',
				'menu_position'      => null,
				'supports'           => array(
					'title',
					'editor',
					'excerpt',
					'thumbnail',
					'revisions',
					'custom-fields',
				),
				'has_archive'        => false,
				'rewrite'            => false,
				'query_var'          => false,
				'delete_with_user'   => false,
				'map_meta_cap'       => true,
				'capability_type'    => array( 'scrapbook_item', 'scrapbook_items' ),
				'capabilities'       => self::capabilities(),
			)
		);

		register_taxonomy(
			self::TAXONOMY,
			array( self::POST_TYPE ),
			array(
				'labels'            => array(
					'name'                       => __('Decades', 'kpf-core'),
					'singular_name'              => __('Decade', 'kpf-core'),
					'search_items'               => __('Search decades', 'kpf-core'),
					'all_items'                  => __('All decades', 'kpf-core'),
					'edit_item'                  => __('Edit decade', 'kpf-core'),
					'update_item'                => __('Update decade', 'kpf-core'),
					'add_new_item'               => __('Add decade', 'kpf-core'),
					'new_item_name'              => __('New decade', 'kpf-core'),
					'separate_items_with_commas' => __('Separate decades with commas', 'kpf-core'),
					'add_or_remove_items'        => __('Add or remove decades', 'kpf-core'),
					'choose_from_most_used'      => __('Choose from the most used decades', 'kpf-core'),
				),
				'description'       => __('Use decades to group items when the exact year is unknown.', 'kpf-core'),
				'public'            => false,
				'show_ui'           => true,
				'show_admin_column' => true,
				'show_in_rest'      => true,
				'show_in_graphql'   => true,
				'graphql_single_name' => 'scrapbookDecade',
				'graphql_plural_name' => 'scrapbookDecades',
				'hierarchical'      => false,
				'rewrite'           => false,
			)
		);
	}

	/**
	 * Use familiar post-editing permissions instead of requiring a separate
	 * role-management step for this site-specific collection.
	 *
	 * @return array<string, string>
	 */
	private static function capabilities(): array {
		return array(
			'edit_post'              => 'edit_post',
			'read_post'              => 'read_post',
			'delete_post'            => 'delete_post',
			'edit_posts'             => 'edit_posts',
			'edit_others_posts'      => 'edit_others_posts',
			'publish_posts'          => 'publish_posts',
			'read_private_posts'     => 'read_private_posts',
			'delete_posts'           => 'delete_posts',
			'delete_private_posts'   => 'delete_private_posts',
			'delete_published_posts' => 'delete_published_posts',
			'delete_others_posts'    => 'delete_others_posts',
			'edit_private_posts'     => 'edit_private_posts',
			'edit_published_posts'   => 'edit_published_posts',
			'create_posts'           => 'edit_posts',
		);
	}
}

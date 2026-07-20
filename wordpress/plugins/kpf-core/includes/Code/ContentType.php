<?php

declare(strict_types=1);

namespace KPF\Core\Code;

final class ContentType {
	public const POST_TYPE = 'kpf_code';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
		add_filter( 'use_block_editor_for_post_type', array( self::class, 'disable_block_editor' ), 10, 2 );
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'               => __( 'Code', 'kpf-core' ),
					'singular_name'      => __( 'Code snippet', 'kpf-core' ),
					'add_new'            => __( 'Add New', 'kpf-core' ),
					'add_new_item'       => __( 'Add Code Snippet', 'kpf-core' ),
					'edit_item'          => __( 'Edit Code Snippet', 'kpf-core' ),
					'new_item'           => __( 'New Code Snippet', 'kpf-core' ),
					'view_item'          => __( 'View Code Snippet', 'kpf-core' ),
					'search_items'       => __( 'Search code snippets', 'kpf-core' ),
					'not_found'          => __( 'No code snippets found.', 'kpf-core' ),
					'not_found_in_trash' => __( 'No code snippets found in Trash.', 'kpf-core' ),
					'all_items'          => __( 'All Code', 'kpf-core' ),
					'menu_name'          => __( 'Code', 'kpf-core' ),
					'item_published'     => __( 'Code snippet activated.', 'kpf-core' ),
					'item_updated'       => __( 'Code snippet updated.', 'kpf-core' ),
				),
				'description'         => __( 'Header and footer code snippets for the public site.', 'kpf-core' ),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => false,
				'show_in_graphql'     => false,
				// Icon provided by Lucide in admin-shell (`Code2`).
				'menu_icon'           => 'none',
				'menu_position'       => null,
				'supports'            => array( 'title', 'revisions' ),
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'delete_with_user'    => false,
				'map_meta_cap'        => false,
				'capability_type'     => array( 'kpf_code', 'kpf_codes' ),
				'capabilities'        => self::capabilities(),
			)
		);
	}

	/**
	 * Restrict snippet management to theme editors (raw HTML/JS is trusted site code).
	 *
	 * @return array<string, string>
	 */
	private static function capabilities(): array {
		return array(
			'edit_post'              => 'edit_theme_options',
			'read_post'              => 'edit_theme_options',
			'delete_post'            => 'edit_theme_options',
			'edit_posts'             => 'edit_theme_options',
			'edit_others_posts'      => 'edit_theme_options',
			'publish_posts'          => 'edit_theme_options',
			'read_private_posts'     => 'edit_theme_options',
			'delete_posts'           => 'edit_theme_options',
			'delete_private_posts'   => 'edit_theme_options',
			'delete_published_posts' => 'edit_theme_options',
			'delete_others_posts'    => 'edit_theme_options',
			'edit_private_posts'     => 'edit_theme_options',
			'edit_published_posts'   => 'edit_theme_options',
			'create_posts'           => 'edit_theme_options',
		);
	}

	public static function disable_block_editor( bool $use, string $post_type ): bool {
		return self::POST_TYPE === $post_type ? false : $use;
	}
}

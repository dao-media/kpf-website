<?php

declare(strict_types=1);

namespace KPF\Core\Queries;

final class ContentType {
	public const POST_TYPE = 'kpf_query';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
		add_filter( 'use_block_editor_for_post_type', array( self::class, 'disable_block_editor' ), 10, 2 );
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Queries', 'kpf-core' ),
					'singular_name' => __( 'Query', 'kpf-core' ),
					'add_new_item'  => __( 'Add Query', 'kpf-core' ),
					'edit_item'     => __( 'Edit Query', 'kpf-core' ),
					'menu_name'     => __( 'Queries', 'kpf-core' ),
				),
				'description'         => __( 'Reusable content queries for page design loops.', 'kpf-core' ),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_rest'        => false,
				'show_in_graphql'     => false,
				'supports'            => array( 'title', 'revisions' ),
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'delete_with_user'    => false,
				'map_meta_cap'        => false,
				'capability_type'     => array( 'kpf_query', 'kpf_queries' ),
				'capabilities'        => self::capabilities(),
			)
		);
	}

	/**
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

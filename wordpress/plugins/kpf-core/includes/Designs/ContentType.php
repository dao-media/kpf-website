<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

final class ContentType {
	public const POST_TYPE = 'kpf_design';
	public const MENU_SLUG = 'kpf-designs';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
	}

	public static function register_content(): void {
		add_post_type_support( 'page', 'excerpt' );
		// Keep page editor support so WPGraphQL still exposes content/editorBlocks for Faust.
		// The admin UI is replaced by Pages\Editor via replace_editor — not by removing support.

		$capabilities = array(
			'edit_post'              => 'manage_options',
			'read_post'              => 'manage_options',
			'delete_post'            => 'manage_options',
			'edit_posts'             => 'manage_options',
			'edit_others_posts'      => 'manage_options',
			'publish_posts'          => 'manage_options',
			'read_private_posts'     => 'manage_options',
			'delete_posts'           => 'manage_options',
			'delete_private_posts'   => 'manage_options',
			'delete_published_posts' => 'manage_options',
			'delete_others_posts'    => 'manage_options',
			'edit_private_posts'     => 'manage_options',
			'edit_published_posts'   => 'manage_options',
			'create_posts'           => 'manage_options',
		);

		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Designs', 'kpf-core' ),
					'singular_name' => __( 'Design', 'kpf-core' ),
					'menu_name'     => __( 'Designs', 'kpf-core' ),
				),
				'description'         => __( 'HTML/CSS page designs assigned to site URLs.', 'kpf-core' ),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_rest'        => true,
				'show_in_graphql'     => false,
				'supports'            => array( 'title', 'revisions' ),
				'capabilities'        => $capabilities,
				'map_meta_cap'        => false,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
			)
		);
	}
}

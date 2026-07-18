<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

final class ContentType {
	public const POST_TYPE = 'kpf_stylesheet';
	public const MENU_SLUG = 'kpf-stylesheet';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Stylesheets', 'kpf-core' ),
					'singular_name' => __( 'Stylesheet', 'kpf-core' ),
				),
				'description'         => __( 'Versioned global CSS for the headless frontend.', 'kpf-core' ),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_rest'        => false,
				'show_in_graphql'     => false,
				'supports'            => array( 'title', 'revisions' ),
				'capability_type'     => 'post',
				'map_meta_cap'        => true,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
			)
		);
	}
}

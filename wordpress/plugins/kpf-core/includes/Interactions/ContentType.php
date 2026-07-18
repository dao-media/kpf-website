<?php

declare(strict_types=1);

namespace KPF\Core\Interactions;

final class ContentType {
	public const POST_TYPE = 'kpf_animation';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Animations', 'kpf-core' ),
					'singular_name' => __( 'Animation', 'kpf-core' ),
				),
				'description'         => __( 'GSAP interactions attached to frontend CSS selectors.', 'kpf-core' ),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_rest'        => false,
				'show_in_graphql'     => false,
				'supports'            => array( 'title', 'revisions' ),
				'capability_type'     => 'page',
				'map_meta_cap'        => true,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
			)
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Interactions;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfGsapAnimation',
			array(
				'description' => 'An active GSAP animation targeting frontend elements.',
				'fields'      => array(
					'databaseId' => array( 'type' => 'Int' ),
					'name'       => array( 'type' => 'String' ),
					'selector'   => array( 'type' => 'String' ),
					'trigger'    => array( 'type' => 'String' ),
					'method'     => array( 'type' => 'String' ),
					'configJson' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfGsapAnimations',
			array(
				'type'        => array( 'list_of' => 'KpfGsapAnimation' ),
				'description' => 'Active GSAP interactions for the frontend runtime.',
				'resolve'     => static fn(): array => self::active_animations(),
			)
		);
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function active_animations(): array {
		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => array( 'menu_order' => 'ASC', 'modified' => 'ASC' ),
			)
		);

		$animations = array();
		foreach ( $posts as $post ) {
			$config = Meta::get( (int) $post->ID );
			if ( ! $config['active'] || '' === $config['selector'] ) {
				continue;
			}
			$animations[] = array(
				'databaseId' => (int) $post->ID,
				'name'       => get_the_title( $post ),
				'selector'   => (string) $config['selector'],
				'trigger'    => (string) $config['trigger'],
				'method'     => (string) $config['method'],
				'configJson' => wp_json_encode( $config ),
			);
		}
		return $animations;
	}
}

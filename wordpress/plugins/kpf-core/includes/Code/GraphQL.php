<?php

declare(strict_types=1);

namespace KPF\Core\Code;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_object_type' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfCodeSnippet',
			array(
				'description' => 'An active header or footer code snippet for the public site.',
				'fields'      => array(
					'databaseId' => array( 'type' => 'Int' ),
					'name'       => array( 'type' => 'String' ),
					'location'   => array( 'type' => 'String' ),
					'type'       => array( 'type' => 'String' ),
					'code'       => array( 'type' => 'String' ),
					'scope'      => array( 'type' => 'String' ),
					'urls'       => array( 'type' => array( 'list_of' => 'String' ) ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfCodeSnippets',
			array(
				'type'        => array( 'list_of' => 'KpfCodeSnippet' ),
				'description' => 'Active code snippets for the current path (or all global snippets when path is omitted).',
				'args'        => array(
					'path' => array(
						'type'        => 'String',
						'description' => 'Frontend path used to filter URL-scoped snippets, e.g. /about.',
					),
				),
				'resolve'     => static function ( $source, array $args ): array {
					unset( $source );
					$path = isset( $args['path'] ) ? (string) $args['path'] : '';
					return self::active_snippets( $path );
				},
			)
		);
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function active_snippets( string $path = '' ): array {
		$posts = get_posts(
			array(
				'post_type'              => ContentType::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => 100,
				'orderby'                => array(
					'menu_order' => 'ASC',
					'date'       => 'ASC',
				),
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		$out = array();
		foreach ( $posts as $post ) {
			$meta = Meta::get( (int) $post->ID );
			if ( '' === trim( (string) $meta['code'] ) ) {
				continue;
			}
			if ( '' !== $path && ! Matching::snippet_applies( $meta, $path ) ) {
				continue;
			}
			// When path is empty, still return URL-scoped snippets so the client can filter.
			$out[] = array(
				'databaseId' => (int) $post->ID,
				'name'       => get_the_title( $post ),
				'location'   => (string) $meta['location'],
				'type'       => (string) $meta['type'],
				'code'       => (string) $meta['code'],
				'scope'      => (string) $meta['scope'],
				'urls'       => array_values( $meta['urls'] ),
			);
		}

		return $out;
	}
}

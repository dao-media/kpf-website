<?php

declare(strict_types=1);

namespace KPF\Core\Queries;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfQueryItemImage',
			array(
				'description' => 'Featured image for a query result item.',
				'fields'      => array(
					'url' => array( 'type' => 'String' ),
					'alt' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfQueryItem',
			array(
				'description' => 'A single item returned by a saved content query.',
				'fields'      => array(
					'databaseId'    => array( 'type' => 'Int' ),
					'title'         => array( 'type' => 'String' ),
					'excerpt'       => array( 'type' => 'String' ),
					'link'          => array( 'type' => 'String' ),
					'uri'           => array( 'type' => 'String' ),
					'slug'          => array( 'type' => 'String' ),
					'date'          => array( 'type' => 'String' ),
					'modified'      => array( 'type' => 'String' ),
					'postType'      => array( 'type' => 'String' ),
					'featuredImage' => array( 'type' => 'KpfQueryItemImage' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfQueryPagination',
			array(
				'description' => 'Pagination metadata for a saved content query.',
				'fields'      => array(
					'page'        => array( 'type' => 'Int' ),
					'perPage'     => array( 'type' => 'Int' ),
					'total'       => array( 'type' => 'Int' ),
					'totalPages'  => array( 'type' => 'Int' ),
					'hasNext'     => array( 'type' => 'Boolean' ),
					'hasPrevious' => array( 'type' => 'Boolean' ),
					'enabled'     => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfQueryResult',
			array(
				'description' => 'Resolved items for a saved content query slug.',
				'fields'      => array(
					'slug'       => array( 'type' => 'String' ),
					'title'      => array( 'type' => 'String' ),
					'items'      => array( 'type' => array( 'list_of' => 'KpfQueryItem' ) ),
					'pagination' => array( 'type' => 'KpfQueryPagination' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfQuery',
			array(
				'type'        => 'KpfQueryResult',
				'description' => 'Resolve a single saved content query by slug.',
				'args'        => array(
					'slug'      => array( 'type' => array( 'non_null' => 'String' ) ),
					'contextId' => array( 'type' => 'Int' ),
					'page'      => array( 'type' => 'Int' ),
				),
				'resolve'     => static function ( $source, array $args ): ?array {
					unset( $source );
					return self::resolve_slug(
						(string) ( $args['slug'] ?? '' ),
						(int) ( $args['contextId'] ?? 0 ),
						max( 1, (int) ( $args['page'] ?? 1 ) )
					);
				},
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfQueries',
			array(
				'type'        => array( 'list_of' => 'KpfQueryResult' ),
				'description' => 'Resolve multiple saved content queries by slug.',
				'args'        => array(
					'slugs'     => array( 'type' => array( 'list_of' => 'String' ) ),
					'contextId' => array( 'type' => 'Int' ),
					'page'      => array( 'type' => 'Int' ),
				),
				'resolve'     => static function ( $source, array $args ): array {
					unset( $source );
					$slugs = array_values(
						array_unique(
							array_filter(
								array_map(
									static fn( $slug ): string => sanitize_title( (string) $slug ),
									(array) ( $args['slugs'] ?? array() )
								)
							)
						)
					);
					$context_id = (int) ( $args['contextId'] ?? 0 );
					$page       = max( 1, (int) ( $args['page'] ?? 1 ) );
					$results    = array();
					foreach ( $slugs as $slug ) {
						$resolved = self::resolve_slug( $slug, $context_id, $page );
						if ( $resolved ) {
							$results[] = $resolved;
						}
					}
					return $results;
				},
			)
		);

		// Attach after Designs registers KpfPageDesign.
		add_action( 'graphql_register_types', array( self::class, 'register_design_fields' ), 20 );
	}

	public static function register_design_fields(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_field(
			'KpfPageDesign',
			'queries',
			array(
				'type'        => array( 'list_of' => 'KpfQueryResult' ),
				'description' => 'Saved queries referenced by {{#each queries.slug}} in this design.',
				'args'        => array(
					'page' => array(
						'type'        => 'Int',
						'description' => 'Pagination page for queries that enable pagination.',
					),
				),
				'resolve'     => static function ( $source, array $args ): array {
					$html       = is_array( $source ) ? (string) ( $source['html'] ?? '' ) : '';
					$context_id = is_array( $source ) ? (int) ( $source['contextId'] ?? 0 ) : 0;
					$page       = max( 1, (int) ( $args['page'] ?? 1 ) );
					$slugs      = Resolver::discover_slugs_in_html( $html );
					$results    = array();
					foreach ( $slugs as $slug ) {
						$resolved = self::resolve_slug( $slug, $context_id, $page );
						if ( $resolved ) {
							$results[] = $resolved;
						}
					}
					return $results;
				},
			)
		);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function resolve_slug( string $slug, int $context_id = 0, int $page = 1 ): ?array {
		$post_id = Resolver::find_by_slug( $slug );
		if ( $post_id < 1 ) {
			return null;
		}

		$post = get_post( $post_id );
		if ( ! $post || 'publish' !== $post->post_status ) {
			return null;
		}

		$result = Resolver::run( Meta::get( $post_id ), $context_id, $page );

		return array(
			'slug'       => (string) $post->post_name,
			'title'      => get_the_title( $post ),
			'items'      => $result['items'],
			'pagination' => $result['pagination'],
		);
	}
}

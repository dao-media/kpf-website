<?php

declare(strict_types=1);

namespace KPF\Core\Scaffold;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_object_type' ) || ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfScaffoldMediaItem',
			array(
				'description' => 'A named Media Library asset for Faust page scaffolds.',
				'fields'      => array(
					'key'        => array( 'type' => 'String' ),
					'databaseId' => array( 'type' => 'Int' ),
					'sourceUrl'  => array( 'type' => 'String' ),
					'altText'    => array( 'type' => 'String' ),
					'title'      => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfScaffoldMedia',
			array(
				'type'        => array( 'list_of' => 'KpfScaffoldMediaItem' ),
				'description' => 'Named scaffold images (Home / About / Events / partners) from the Media Library.',
				'args'        => array(
					'prefixes' => array(
						'type'        => array( 'list_of' => 'String' ),
						'description' => 'Only return items whose key starts with one of these prefixes (e.g. "about."). Omit for the full catalog.',
					),
				),
				'resolve'     => static function ( $root, array $args ): array {
					$prefixes = $args['prefixes'] ?? array();
					if ( ! is_array( $prefixes ) ) {
						$prefixes = array();
					}
					return Media::resolve_items( $prefixes );
				},
			)
		);
	}
}

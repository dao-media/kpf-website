<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfFormDefinition',
			array(
				'description' => 'A saved Forms builder definition.',
				'fields'      => array(
					'databaseId'       => array( 'type' => 'Int' ),
					'title'            => array( 'type' => 'String' ),
					'slug'             => array( 'type' => 'String' ),
					'definitionJson'   => array(
						'type'    => 'String',
						'resolve' => static function ( $source ): string {
							$definition = is_array( $source['definition'] ?? null ) ? $source['definition'] : array();
							return wp_json_encode( $definition ) ?: '{}';
						},
					),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfForm',
			array(
				'type'        => 'KpfFormDefinition',
				'description' => 'Resolve a single active form by slug.',
				'args'        => array(
					'slug' => array( 'type' => array( 'non_null' => 'String' ) ),
				),
				'resolve'     => static function ( $source, array $args ): ?array {
					unset( $source );
					$id = Definition::find_by_slug( (string) ( $args['slug'] ?? '' ) );
					return $id ? Definition::public_payload( $id ) : null;
				},
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfForms',
			array(
				'type'        => array( 'list_of' => 'KpfFormDefinition' ),
				'description' => 'Resolve multiple forms by slug.',
				'args'        => array(
					'slugs' => array( 'type' => array( 'list_of' => 'String' ) ),
				),
				'resolve'     => static function ( $source, array $args ): array {
					unset( $source );
					$slugs = array_map( 'strval', (array) ( $args['slugs'] ?? array() ) );
					return Definition::public_payloads_for_slugs( $slugs );
				},
			)
		);

		add_action( 'graphql_register_types', array( self::class, 'register_design_fields' ), 20 );
	}

	public static function register_design_fields(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_field(
			'KpfPageDesign',
			'forms',
			array(
				'type'        => array( 'list_of' => 'KpfFormDefinition' ),
				'description' => 'Forms referenced via {{form:slug}} in the design HTML.',
				'resolve'     => static function ( $source ): array {
					$html  = is_array( $source ) ? (string) ( $source['html'] ?? '' ) : '';
					$slugs = Definition::slugs_in_html( $html );
					return Definition::public_payloads_for_slugs( $slugs );
				},
			)
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfPageDesign',
			array(
				'description' => 'A published HTML/CSS design assigned to a page.',
				'fields'      => array(
					'databaseId' => array( 'type' => 'Int' ),
					'title'      => array( 'type' => 'String' ),
					'html'       => array( 'type' => 'String' ),
					'css'        => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfPageDesignField',
			array(
				'description' => 'A custom key/value field available to a page design.',
				'fields'      => array(
					'key'   => array( 'type' => 'String' ),
					'value' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_field(
			'Page',
			'kpfPageDesign',
			array(
				'type'        => 'KpfPageDesign',
				'description' => 'The assigned, published HTML/CSS page design.',
				'resolve'     => static fn( $source ): ?array => self::resolve_design( self::source_id( $source ) ),
			)
		);

		register_graphql_field(
			'Page',
			'kpfDesignFields',
			array(
				'type'        => array( 'list_of' => 'KpfPageDesignField' ),
				'description' => 'Custom values available to the assigned page design.',
				'resolve'     => static fn( $source ): array => Meta::get_page_fields( self::source_id( $source ) ),
			)
		);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function resolve_design( int $page_id ): ?array {
		if ( $page_id < 1 || 'page' !== get_post_type( $page_id ) ) {
			return null;
		}

		$design_id = (int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true );
		$post      = $design_id > 0 ? get_post( $design_id ) : null;
		if ( ! $post || ContentType::POST_TYPE !== $post->post_type || 'publish' !== $post->post_status ) {
			return null;
		}

		$meta = Meta::get_design( $design_id );
		if ( '' === trim( (string) $meta['html'] ) ) {
			return null;
		}

		return array(
			'databaseId' => $design_id,
			'title'      => get_the_title( $design_id ),
			'html'       => (string) $meta['html'],
			'css'        => (string) $meta['css'],
		);
	}

	/**
	 * @param mixed $source GraphQL source object.
	 */
	private static function source_id( $source ): int {
		if ( is_object( $source ) ) {
			return isset( $source->databaseId ) ? (int) $source->databaseId : (int) ( $source->ID ?? 0 );
		}
		if ( is_array( $source ) ) {
			return (int) ( $source['databaseId'] ?? $source['ID'] ?? 0 );
		}
		return 0;
	}
}

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
					'source'     => array( 'type' => 'String' ),
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

		register_graphql_object_type(
			'KpfDesignTemplate',
			array(
				'description' => 'A published HTML/CSS design for a post-type singular or archive template.',
				'fields'      => array(
					'databaseId' => array( 'type' => 'Int' ),
					'title'      => array( 'type' => 'String' ),
					'postType'   => array( 'type' => 'String' ),
					'view'       => array( 'type' => 'String' ),
					'html'       => array( 'type' => 'String' ),
					'css'        => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfMaintenanceMode',
			array(
				'description' => 'Coming soon / maintenance mode status for the headless frontend.',
				'fields'      => array(
					'enabled' => array( 'type' => 'Boolean' ),
					'path'    => array( 'type' => 'String' ),
					'ready'   => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_field(
			'Page',
			'kpfPageDesign',
			array(
				'type'        => 'KpfPageDesign',
				'description' => 'The assigned page design, or the site fallback design when none is assigned.',
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

		register_graphql_field(
			'RootQuery',
			'kpfDesignTemplate',
			array(
				'type'        => 'KpfDesignTemplate',
				'description' => 'Published HTML/CSS design for a post-type singular or archive template.',
				'args'        => array(
					'postType' => array(
						'type'        => array( 'non_null' => 'String' ),
						'description' => 'WordPress post type name (e.g. post, page, kpf_event).',
					),
					'view'     => array(
						'type'        => array( 'non_null' => 'String' ),
						'description' => 'Template view: singular or archive.',
					),
				),
				'resolve'     => static function ( $source, array $args ): ?array {
					unset( $source );
					return self::resolve_template(
						(string) ( $args['postType'] ?? '' ),
						(string) ( $args['view'] ?? '' )
					);
				},
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfFallbackDesign',
			array(
				'type'        => 'KpfPageDesign',
				'description' => 'Site-wide fallback page design used when a page has no assigned design.',
				'resolve'     => static fn(): ?array => self::resolve_fallback(),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfMaintenanceDesign',
			array(
				'type'        => 'KpfPageDesign',
				'description' => 'Coming soon / maintenance page design.',
				'resolve'     => static fn(): ?array => self::resolve_maintenance_design(),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfMaintenanceMode',
			array(
				'type'        => 'KpfMaintenanceMode',
				'description' => 'Whether coming soon / maintenance mode is active.',
				'resolve'     => static function (): array {
					$status = Settings::public_maintenance();
					return array(
						'enabled' => (bool) $status['enabled'],
						'path'    => (string) $status['path'],
						'ready'   => (bool) $status['ready'],
					);
				},
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
		$resolved  = Meta::resolve_published_design( $design_id );
		if ( $resolved ) {
			$resolved['source'] = 'page';
			return $resolved;
		}

		$fallback = self::resolve_fallback();
		if ( $fallback ) {
			$fallback['source'] = 'fallback';
			return $fallback;
		}

		return null;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function resolve_fallback(): ?array {
		$design_id = Settings::design_id_for_role( Settings::ROLE_FALLBACK );
		$resolved  = Meta::resolve_published_design( $design_id );
		if ( ! $resolved ) {
			return null;
		}

		$resolved['source'] = 'fallback';
		return $resolved;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function resolve_maintenance_design(): ?array {
		$design_id = Settings::design_id_for_role( Settings::ROLE_MAINTENANCE );
		$resolved  = Meta::resolve_published_design( $design_id );
		if ( ! $resolved ) {
			return null;
		}

		$resolved['source'] = 'maintenance';
		return $resolved;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function resolve_template( string $post_type, string $view ): ?array {
		$post_type = sanitize_key( $post_type );
		$view      = sanitize_key( $view );
		if ( ! Templates::is_valid_post_type( $post_type ) || ! Templates::is_valid_view( $view ) ) {
			return null;
		}

		$design_id = Meta::find_template_design_id( $post_type, $view );
		$resolved  = Meta::resolve_published_design( $design_id );
		if ( ! $resolved ) {
			return null;
		}

		$resolved['postType'] = $post_type;
		$resolved['view']     = $view;
		return $resolved;
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

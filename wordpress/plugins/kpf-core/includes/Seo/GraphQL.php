<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class GraphQL {
	public static function register(): void {
		add_action('graphql_register_types', array( self::class, 'register_types' ));
	}

	public static function register_types(): void {
		if (! function_exists('register_graphql_object_type')) {
			return;
		}

		register_graphql_object_type(
			'KpfSeoRobots',
			array(
				'description' => 'Robots directives for a resource.',
				'fields'      => array(
					'index'     => array( 'type' => 'Boolean' ),
					'follow'    => array( 'type' => 'Boolean' ),
					'noarchive' => array( 'type' => 'Boolean' ),
					'nosnippet' => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfSeoOpenGraph',
			array(
				'description' => 'Open Graph metadata.',
				'fields'      => array(
					'title'       => array( 'type' => 'String' ),
					'description' => array( 'type' => 'String' ),
					'imageUrl'    => array( 'type' => 'String' ),
					'type'        => array( 'type' => 'String' ),
					'url'         => array( 'type' => 'String' ),
					'section'     => array(
						'type'        => 'String',
						'description' => 'Primary category name for article:section.',
					),
					'tags'        => array(
						'type'        => array( 'list_of' => 'String' ),
						'description' => 'Topic names for article:tag.',
					),
				),
			)
		);

		register_graphql_object_type(
			'KpfSeoTwitter',
			array(
				'description' => 'Twitter/X card metadata.',
				'fields'      => array(
					'card'        => array( 'type' => 'String' ),
					'site'        => array( 'type' => 'String' ),
					'title'       => array( 'type' => 'String' ),
					'description' => array( 'type' => 'String' ),
					'imageUrl'    => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfSeoCustomMeta',
			array(
				'description' => 'A custom meta or link tag.',
				'fields'      => array(
					'name'     => array( 'type' => 'String' ),
					'property' => array( 'type' => 'String' ),
					'content'  => array( 'type' => 'String' ),
					'rel'      => array( 'type' => 'String' ),
					'href'     => array( 'type' => 'String' ),
					'media'    => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfSeoTerm',
			array(
				'description' => 'A primary taxonomy term used for SEO.',
				'fields'      => array(
					'id'   => array( 'type' => 'Int' ),
					'name' => array( 'type' => 'String' ),
					'slug' => array( 'type' => 'String' ),
					'url'  => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfSeoBreadcrumb',
			array(
				'description' => 'A breadcrumb trail item.',
				'fields'      => array(
					'name' => array( 'type' => 'String' ),
					'url'  => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfSeo',
			array(
				'description' => 'Resolved KPF SEO metadata.',
				'fields'      => array(
					'title'           => array( 'type' => 'String' ),
					'description'     => array( 'type' => 'String' ),
					'canonical'       => array( 'type' => 'String' ),
					'robots'          => array( 'type' => 'KpfSeoRobots' ),
					'openGraph'       => array( 'type' => 'KpfSeoOpenGraph' ),
					'twitter'         => array( 'type' => 'KpfSeoTwitter' ),
					'customMeta'      => array( 'type' => array( 'list_of' => 'KpfSeoCustomMeta' ) ),
					'schemaJson'      => array(
						'type'        => 'String',
						'description' => 'JSON-LD graph encoded as a string.',
					),
					'showInSitemap'   => array( 'type' => 'Boolean' ),
					'focusKeyphrase'  => array( 'type' => 'String' ),
					'primaryCategory' => array( 'type' => 'KpfSeoTerm' ),
					'primaryTopic'    => array( 'type' => 'KpfSeoTerm' ),
					'breadcrumbs'     => array( 'type' => array( 'list_of' => 'KpfSeoBreadcrumb' ) ),
				),
			)
		);

		$resolver = static function ( $source ) {
			$post_id = 0;
			if (is_object($source) && isset($source->databaseId)) {
				$post_id = (int) $source->databaseId;
			} elseif (is_object($source) && isset($source->ID)) {
				$post_id = (int) $source->ID;
			}

			$payload = $post_id > 0 ? Resolver::for_post($post_id) : Resolver::empty_payload();
			return self::to_graphql($payload);
		};

		register_graphql_field(
			'ContentNode',
			'kpfSeo',
			array(
				'type'        => 'KpfSeo',
				'description' => 'Resolved KPF SEO metadata for this content node.',
				'resolve'     => $resolver,
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfSeoHome',
			array(
				'type'        => 'KpfSeo',
				'description' => 'Resolved SEO metadata for the site homepage.',
				'resolve'     => static function () {
					return self::to_graphql(Resolver::for_home());
				},
			)
		);
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>
	 */
	private static function to_graphql(array $payload): array {
		return array(
			'title'           => (string) ($payload['title'] ?? ''),
			'description'     => (string) ($payload['description'] ?? ''),
			'canonical'       => (string) ($payload['canonical'] ?? ''),
			'robots'          => $payload['robots'] ?? array(),
			'openGraph'       => $payload['openGraph'] ?? array(),
			'twitter'         => $payload['twitter'] ?? array(),
			'customMeta'      => array_values((array) ($payload['customMeta'] ?? array())),
			'schemaJson'      => wp_json_encode($payload['schema'] ?? array()) ?: '{}',
			'showInSitemap'   => (bool) ($payload['showInSitemap'] ?? false),
			'focusKeyphrase'  => (string) ($payload['focusKeyphrase'] ?? ''),
			'primaryCategory' => $payload['primaryCategory'] ?? null,
			'primaryTopic'    => $payload['primaryTopic'] ?? null,
			'breadcrumbs'     => array_values((array) ($payload['breadcrumbs'] ?? array())),
		);
	}
}

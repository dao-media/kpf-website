<?php

declare(strict_types=1);

namespace KPF\Core\Scrapbook;

use WP_REST_Request;

final class Rest {
	public static function register(): void {
		add_action('rest_api_init', array( self::class, 'register_fields' ));
		add_filter(
			'rest_' . ContentType::POST_TYPE . '_collection_params',
			array( self::class, 'collection_params' )
		);
		add_filter(
			'rest_' . ContentType::POST_TYPE . '_query',
			array( self::class, 'collection_query' ),
			10,
			2
		);
	}

	public static function register_fields(): void {
		register_rest_field(
			ContentType::POST_TYPE,
			'scrapbookDetails',
			array(
				'get_callback' => static function (array $object): array {
					return GraphQL::details((int) ($object['id'] ?? 0));
				},
				'schema'       => array(
					'description' => __('Resolved scrapbook details with ordered image data.', 'kpf-core'),
					'type'        => 'object',
					'readonly'    => true,
					'context'     => array( 'view', 'edit', 'embed' ),
					'properties'  => self::details_schema(),
				),
			)
		);
	}

	/**
	 * @param array<string, mixed> $params
	 * @return array<string, mixed>
	 */
	public static function collection_params(array $params): array {
		$params['entry_type'] = array(
			'description'       => __('Only return single photos or photo stories.', 'kpf-core'),
			'type'              => 'string',
			'enum'              => array( 'photo', 'story' ),
			'sanitize_callback' => 'sanitize_key',
		);
		$params['featured'] = array(
			'description' => __('Only return featured or non-featured items.', 'kpf-core'),
			'type'        => 'boolean',
		);
		$params['decade'] = array(
			'description'       => __('Only return items in a decade slug, such as 1990.', 'kpf-core'),
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_title',
		);

		if (isset($params['orderby']['enum']) && is_array($params['orderby']['enum'])) {
			$params['orderby']['enum'][] = 'display_order';
		}

		return $params;
	}

	/**
	 * @param array<string, mixed> $args
	 * @return array<string, mixed>
	 */
	public static function collection_query(array $args, WP_REST_Request $request): array {
		$meta_query = is_array($args['meta_query'] ?? null) ? $args['meta_query'] : array();

		$entry_type = (string) $request->get_param('entry_type');
		if (in_array($entry_type, array( 'photo', 'story' ), true)) {
			$meta_query[] = array(
				'key'   => Meta::ENTRY_TYPE_META,
				'value' => $entry_type,
			);
		}

		if (null !== $request->get_param('featured')) {
			$meta_query[] = array(
				'key'   => Meta::FEATURED_META,
				'value' => rest_sanitize_boolean($request->get_param('featured')) ? '1' : '0',
			);
		}

		if ($meta_query) {
			$args['meta_query'] = $meta_query;
		}

		$decade = sanitize_title((string) $request->get_param('decade'));
		if ('' !== $decade) {
			$args['tax_query'] = array(
				array(
					'taxonomy' => ContentType::TAXONOMY,
					'field'    => 'slug',
					'terms'    => $decade,
				),
			);
		}

		if ('display_order' === $request->get_param('orderby')) {
			$args['meta_key'] = Meta::DISPLAY_ORDER_META;
			$args['orderby']  = array(
				'meta_value_num' => 'ASC',
				'date'           => 'DESC',
			);
		}

		return $args;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function details_schema(): array {
		return array(
			'entryType'       => array(
				'type' => 'string',
				'enum' => array( 'photo', 'story' ),
			),
			'eventDate'       => array( 'type' => 'string' ),
			'datePrecision'   => array(
				'type' => 'string',
				'enum' => array( 'exact', 'month', 'year', 'decade', 'unknown' ),
			),
			'location'        => array( 'type' => 'string' ),
			'photographer'    => array( 'type' => 'string' ),
			'source'          => array( 'type' => 'string' ),
			'historicalNotes' => array( 'type' => 'string' ),
			'featured'        => array( 'type' => 'boolean' ),
			'displayOrder'    => array( 'type' => 'integer' ),
			'images'          => array(
				'type'  => 'array',
				'items' => array(
					'type'       => 'object',
					'properties' => array(
						'attachmentId' => array( 'type' => 'integer' ),
						'sourceUrl'    => array( 'type' => 'string' ),
						'srcSet'       => array( 'type' => 'string' ),
						'width'        => array( 'type' => 'integer' ),
						'height'       => array( 'type' => 'integer' ),
						'mimeType'     => array( 'type' => 'string' ),
						'altText'      => array( 'type' => 'string' ),
						'caption'      => array( 'type' => 'string' ),
						'index'        => array( 'type' => 'integer' ),
					),
				),
			),
		);
	}
}

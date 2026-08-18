<?php

declare(strict_types=1);

namespace KPF\Core\Scrapbook;

final class GraphQL {
	private const GRAPHQL_TYPE = 'ScrapbookItem';

	public static function register(): void {
		add_action('graphql_register_types', array( self::class, 'register_types' ));
		add_filter('graphql_connection_query_args', array( self::class, 'connection_query_args' ), 10, 3);
	}

	public static function register_types(): void {
		if (! function_exists('register_graphql_object_type')) {
			return;
		}

		register_graphql_enum_type(
			'KpfScrapbookEntryTypeEnum',
			array(
				'description' => 'Whether a scrapbook entry is one photo or a multi-photo story.',
				'values'      => array(
					'PHOTO' => array(
						'value'       => 'photo',
						'description' => 'A single-photo scrapbook entry.',
					),
					'STORY' => array(
						'value'       => 'story',
						'description' => 'A story with one or more ordered photos.',
					),
				),
			)
		);

		register_graphql_enum_type(
			'KpfScrapbookDatePrecisionEnum',
			array(
				'description' => 'How precise the historical date is.',
				'values'      => array(
					'EXACT'   => array( 'value' => 'exact' ),
					'MONTH'   => array( 'value' => 'month' ),
					'YEAR'    => array( 'value' => 'year' ),
					'DECADE'  => array( 'value' => 'decade' ),
					'UNKNOWN' => array( 'value' => 'unknown' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfScrapbookImage',
			array(
				'description' => 'An ordered image placement within a scrapbook item.',
				'fields'      => array(
					'attachmentId' => array( 'type' => 'Int' ),
					'mediaItem'    => array(
						'type'        => 'MediaItem',
						'description' => 'The WordPress media item.',
						'resolve'     => static function (array $image, array $args, $context) {
							unset($args);
							$attachment_id = (int) ($image['attachmentId'] ?? 0);
							if ($attachment_id < 1 || ! class_exists('\WPGraphQL\Data\DataSource')) {
								return null;
							}
							return \WPGraphQL\Data\DataSource::resolve_post_object($attachment_id, $context);
						},
					),
					'sourceUrl'     => array( 'type' => 'String' ),
					'srcSet'        => array( 'type' => 'String' ),
					'width'         => array( 'type' => 'Int' ),
					'height'        => array( 'type' => 'Int' ),
					'mimeType'      => array( 'type' => 'String' ),
					'altText'       => array( 'type' => 'String' ),
					'caption'       => array( 'type' => 'String' ),
					'index'         => array( 'type' => 'Int' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfScrapbookDetails',
			array(
				'description' => 'Story details and ordered images for a scrapbook item.',
				'fields'      => array(
					'entryType'       => array( 'type' => 'KpfScrapbookEntryTypeEnum' ),
					'eventDate'       => array( 'type' => 'String' ),
					'datePrecision'   => array( 'type' => 'KpfScrapbookDatePrecisionEnum' ),
					'location'        => array( 'type' => 'String' ),
					'photographer'    => array( 'type' => 'String' ),
					'source'          => array( 'type' => 'String' ),
					'historicalNotes' => array( 'type' => 'String' ),
					'featured'        => array( 'type' => 'Boolean' ),
					'displayOrder'    => array( 'type' => 'Int' ),
					'images'          => array(
						'type' => array( 'list_of' => 'KpfScrapbookImage' ),
					),
				),
			)
		);

		register_graphql_field(
			self::GRAPHQL_TYPE,
			'scrapbookDetails',
			array(
				'type'        => 'KpfScrapbookDetails',
				'description' => 'Structured scrapbook details and ordered images.',
				'resolve'     => static function ($source): array {
					$post_id = isset($source->databaseId)
						? (int) $source->databaseId
						: (int) ($source->ID ?? 0);
					return self::details($post_id);
				},
			)
		);

		register_graphql_object_type(
			'KpfScrapbookTile',
			array(
				'description' => 'A single scrapbook image for the About “The Work” gallery.',
				'fields'      => array(
					'id'            => array( 'type' => 'String' ),
					'databaseId'    => array( 'type' => 'Int' ),
					'attachmentId'  => array( 'type' => 'Int' ),
					'sourceUrl'     => array( 'type' => 'String' ),
					'altText'       => array( 'type' => 'String' ),
					'caption'       => array( 'type' => 'String' ),
					'eventDate'     => array( 'type' => 'String' ),
					'datePrecision' => array( 'type' => 'KpfScrapbookDatePrecisionEnum' ),
					'title'         => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfScrapbookTiles',
			array(
				'type'        => array( 'list_of' => 'KpfScrapbookTile' ),
				'description' => 'All images from published Scrapbook posts (kpf_scrapbook only — never Kevin slides). Flattened for The Work mosaic.',
				'args'        => array(
					'first'  => array(
						'type'        => 'Int',
						'description' => 'Max tiles to return (default 48, max 200).',
					),
					'offset' => array(
						'type'        => 'Int',
						'description' => 'Number of tiles to skip (for infinite load).',
					),
				),
				'resolve'     => static function ( $source, array $args ): array {
					unset( $source );
					$first  = isset( $args['first'] ) ? (int) $args['first'] : 48;
					$offset = isset( $args['offset'] ) ? (int) $args['offset'] : 0;
					return self::tile_list( $first, $offset );
				},
			)
		);

		$where_type = 'RootQueryTo' . self::GRAPHQL_TYPE . 'ConnectionWhereArgs';
		register_graphql_field(
			$where_type,
			'entryType',
			array(
				'type'        => 'KpfScrapbookEntryTypeEnum',
				'description' => 'Only return single-photo entries or multi-photo stories.',
			)
		);
		register_graphql_field(
			$where_type,
			'featured',
			array(
				'type'        => 'Boolean',
				'description' => 'Filter by featured status.',
			)
		);
		register_graphql_field(
			$where_type,
			'decade',
			array(
				'type'        => 'String',
				'description' => 'Filter by decade slug, such as "1980".',
			)
		);
		register_graphql_field(
			$where_type,
			'orderByDisplay',
			array(
				'type'        => 'Boolean',
				'description' => 'Order by the manual display order, lowest number first.',
			)
		);
	}

	/**
	 * @param array<string, mixed> $query_args
	 * @param mixed                $source
	 * @param array<string, mixed> $args
	 * @return array<string, mixed>
	 */
	public static function connection_query_args(
		array $query_args,
		$source,
		array $args
	): array {
		unset($source);

		$post_types = array_map('strval', (array) ($query_args['post_type'] ?? array()));
		if (! in_array(ContentType::POST_TYPE, $post_types, true)) {
			return $query_args;
		}

		$where      = is_array($args['where'] ?? null) ? $args['where'] : array();
		$meta_query = is_array($query_args['meta_query'] ?? null) ? $query_args['meta_query'] : array();

		if (! empty($where['entryType']) && in_array($where['entryType'], array( 'photo', 'story' ), true)) {
			$meta_query[] = array(
				'key'   => Meta::ENTRY_TYPE_META,
				'value' => $where['entryType'],
			);
		}

		if (array_key_exists('featured', $where)) {
			$meta_query[] = array(
				'key'   => Meta::FEATURED_META,
				'value' => $where['featured'] ? '1' : '0',
			);
		}

		if ($meta_query) {
			$query_args['meta_query'] = $meta_query;
		}

		if (! empty($where['decade'])) {
			$query_args['tax_query'] = array(
				array(
					'taxonomy' => ContentType::TAXONOMY,
					'field'    => 'slug',
					'terms'    => sanitize_title((string) $where['decade']),
				),
			);
		}

		if (! empty($where['orderByDisplay'])) {
			$query_args['meta_key'] = Meta::DISPLAY_ORDER_META;
			$query_args['orderby']  = array(
				'meta_value_num' => 'ASC',
				'date'           => 'DESC',
			);
		}

		return $query_args;
	}

	/**
	 * Flatten every image from every published Scrapbook CPT post.
	 * Post type is always kpf_scrapbook — Kevin slides (kpf_kevin) are never included.
	 *
	 * @return list<array<string, mixed>>
	 */
	public static function tile_list( int $first = 48, int $offset = 0 ): array {
		$first  = max( 1, min( 200, $first > 0 ? $first : 48 ) );
		$offset = max( 0, $offset );

		$query = new \WP_Query(
			array(
				'post_type'              => ContentType::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => -1,
				'orderby'                => array(
					'date' => 'DESC',
				),
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		$posts = $query->posts;
		usort(
			$posts,
			static function ( $a, $b ): int {
				$order_a = (int) get_post_meta( (int) $a->ID, Meta::DISPLAY_ORDER_META, true );
				$order_b = (int) get_post_meta( (int) $b->ID, Meta::DISPLAY_ORDER_META, true );
				if ( $order_a !== $order_b ) {
					return $order_a <=> $order_b;
				}
				return strcmp( (string) $b->post_date, (string) $a->post_date );
			}
		);

		$tiles = array();
		foreach ( $posts as $post ) {
			// Defensive: never surface Kevin CPT rows if a filter is widened later.
			if ( ContentType::POST_TYPE !== get_post_type( $post ) ) {
				continue;
			}

			$details = self::details( (int) $post->ID );
			$title   = html_entity_decode(
				trim( (string) get_the_title( $post ) ),
				ENT_QUOTES | ENT_HTML5,
				'UTF-8'
			);
			foreach ( (array) $details['images'] as $image ) {
				$source_url = (string) ( $image['sourceUrl'] ?? '' );
				if ( '' === $source_url ) {
					continue;
				}
				$attachment_id = (int) ( $image['attachmentId'] ?? 0 );
				$alt           = trim( (string) ( $image['altText'] ?? '' ) );
				if ( '' === $alt ) {
					$alt = $title !== '' ? $title : __( 'Scrapbook photo', 'kpf-core' );
				}

				$tiles[] = array(
					'id'            => (int) $post->ID . '-' . $attachment_id . '-' . (int) ( $image['index'] ?? 0 ),
					'databaseId'    => (int) $post->ID,
					'attachmentId'  => $attachment_id,
					'sourceUrl'     => $source_url,
					'altText'       => $alt,
					'caption'       => (string) ( $image['caption'] ?? '' ),
					'eventDate'     => (string) ( $details['eventDate'] ?? '' ),
					'datePrecision' => (string) ( $details['datePrecision'] ?? 'unknown' ),
					'title'         => $title,
				);
			}
		}

		if ( $offset >= count( $tiles ) ) {
			return array();
		}

		return array_values( array_slice( $tiles, $offset, $first ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function details(int $post_id): array {
		$meta   = Meta::get($post_id);
		$images = array();

		foreach ((array) $meta['images'] as $index => $placement) {
			$attachment_id = (int) ($placement['attachment_id'] ?? 0);
			if ($attachment_id < 1 || 'attachment' !== get_post_type($attachment_id)) {
				continue;
			}

			$attachment = get_post($attachment_id);
			$metadata   = wp_get_attachment_metadata($attachment_id);
			$source_url = wp_get_attachment_url($attachment_id);

			$placement_alt    = trim((string) ($placement['alt_text'] ?? ''));
			$attachment_alt   = (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true);
			$placement_caption = trim((string) ($placement['caption'] ?? ''));

			$images[] = array(
				'attachmentId' => $attachment_id,
				'sourceUrl'    => $source_url ? (string) $source_url : '',
				'srcSet'       => (string) (wp_get_attachment_image_srcset($attachment_id, 'full') ?: ''),
				'width'        => is_array($metadata) ? (int) ($metadata['width'] ?? 0) : 0,
				'height'       => is_array($metadata) ? (int) ($metadata['height'] ?? 0) : 0,
				'mimeType'     => (string) get_post_mime_type($attachment_id),
				'altText'      => $placement_alt !== '' ? $placement_alt : $attachment_alt,
				'caption'      => $placement_caption !== ''
					? $placement_caption
					: (string) ($attachment->post_excerpt ?? ''),
				'index'        => (int) $index,
			);
		}

		return array(
			'entryType'       => (string) $meta['entry_type'],
			'eventDate'       => (string) $meta['event_date'],
			'datePrecision'   => (string) $meta['date_precision'],
			'location'        => (string) $meta['location'],
			'photographer'    => (string) $meta['photographer'],
			'source'          => (string) $meta['source'],
			'historicalNotes' => (string) $meta['historical_notes'],
			'featured'        => (bool) $meta['featured'],
			'displayOrder'    => (int) $meta['display_order'],
			'images'          => $images,
		);
	}
}

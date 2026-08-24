<?php

declare(strict_types=1);

namespace KPF\Core\Queries;

/**
 * Resolve allowlisted query definitions into item lists.
 */
final class Resolver {
	/**
	 * @param array<string, mixed> $definition Sanitized query definition.
	 * @return array{items: array<int, array<string, mixed>>, pagination: array<string, mixed>}
	 */
	public static function run( array $definition, int $context_id = 0, int $page = 1 ): array {
		$definition = Meta::sanitize( $definition );
		$page       = max( 1, $page );
		$per_page   = ! empty( $definition['pagination']['enabled'] )
			? (int) $definition['pagination']['perPage']
			: (int) $definition['perPage'];
		$per_page   = max( 1, min( Meta::MAX_PER_PAGE, $per_page ) );

		$args = array(
			'post_type'              => $definition['postType'],
			'post_status'            => $definition['status'],
			'posts_per_page'         => $per_page,
			'paged'                  => $page,
			'orderby'                => $definition['orderby'],
			'order'                  => $definition['order'],
			'ignore_sticky_posts'    => true,
			'no_found_rows'          => false,
			'update_post_meta_cache' => true,
			'update_post_term_cache' => true,
		);

		$meta_key = sanitize_key( (string) ( $definition['metaKey'] ?? '' ) );
		if (
			'' !== $meta_key
			&& in_array( (string) $definition['orderby'], array( 'meta_value', 'meta_value_num' ), true )
		) {
			$args['meta_key'] = $meta_key;
		}

		$exclude = array_map( 'absint', (array) $definition['excludeIds'] );
		if ( ! empty( $definition['excludeCurrent'] ) && $context_id > 0 ) {
			$exclude[] = $context_id;
		}
		$exclude = array_values( array_filter( array_unique( $exclude ) ) );
		if ( $exclude ) {
			$args['post__not_in'] = $exclude;
		}

		$include = array_map( 'absint', (array) $definition['includeIds'] );
		$include = array_values( array_filter( array_unique( $include ) ) );
		if ( $include ) {
			$args['post__in'] = $include;
			$args['orderby']  = 'post__in';
		}

		$tax_query = array();
		foreach ( (array) $definition['taxonomies'] as $tax ) {
			if ( ! is_array( $tax ) || empty( $tax['taxonomy'] ) || empty( $tax['terms'] ) ) {
				continue;
			}
			$tax_query[] = array(
				'taxonomy' => (string) $tax['taxonomy'],
				'field'    => (string) ( $tax['field'] ?? 'slug' ),
				'terms'    => (array) $tax['terms'],
				'operator' => (string) ( $tax['operator'] ?? 'IN' ),
			);
		}

		$related = self::related_tax_query( $definition, $context_id );
		if ( $related ) {
			$tax_query[] = $related;
		}

		if ( $tax_query ) {
			if ( count( $tax_query ) > 1 ) {
				$tax_query['relation'] = 'AND';
			}
			$args['tax_query'] = $tax_query;
		}

		$meta_query = array();
		foreach ( (array) $definition['metaQuery'] as $meta ) {
			if ( ! is_array( $meta ) || empty( $meta['key'] ) ) {
				continue;
			}
			$clause = array(
				'key'     => (string) $meta['key'],
				'compare' => (string) ( $meta['compare'] ?? '=' ),
			);
			if ( ! in_array( $clause['compare'], array( 'EXISTS', 'NOT EXISTS' ), true ) ) {
				$clause['value'] = (string) ( $meta['value'] ?? '' );
				$clause['type']  = (string) ( $meta['type'] ?? 'CHAR' );
			}
			$meta_query[] = $clause;
		}
		if ( $meta_query ) {
			if ( count( $meta_query ) > 1 ) {
				$meta_query['relation'] = 'AND';
			}
			$args['meta_query'] = $meta_query;
		}

		$query = new \WP_Query( $args );
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = self::map_item( $post );
		}

		$total       = (int) $query->found_posts;
		$total_pages = max( 1, (int) $query->max_num_pages );

		return array(
			'items'      => $items,
			'pagination' => array(
				'page'        => $page,
				'perPage'     => $per_page,
				'total'       => $total,
				'totalPages'  => $total_pages,
				'hasNext'     => $page < $total_pages,
				'hasPrevious' => $page > 1,
				'enabled'     => ! empty( $definition['pagination']['enabled'] ),
			),
		);
	}

	/**
	 * @param array<string, mixed> $definition
	 * @return array<string, mixed>|null
	 */
	private static function related_tax_query( array $definition, int $context_id ): ?array {
		$related = is_array( $definition['related'] ?? null ) ? $definition['related'] : array();
		if ( empty( $related['enabled'] ) || $context_id < 1 ) {
			return null;
		}

		$by = (string) ( $related['by'] ?? 'category' );
		if ( 'none' === $by || 'post_type' === $by ) {
			return null;
		}

		$taxonomy = 'category';
		if ( 'tag' === $by ) {
			$taxonomy = 'post_tag';
		} elseif ( 'taxonomy' === $by ) {
			$taxonomy = sanitize_key( (string) ( $related['taxonomy'] ?? '' ) );
		}

		if ( '' === $taxonomy || ! taxonomy_exists( $taxonomy ) ) {
			return null;
		}

		$terms = wp_get_post_terms( $context_id, $taxonomy, array( 'fields' => 'ids' ) );
		if ( is_wp_error( $terms ) || ! $terms ) {
			return null;
		}

		return array(
			'taxonomy' => $taxonomy,
			'field'    => 'term_id',
			'terms'    => array_map( 'absint', $terms ),
			'operator' => 'IN',
		);
	}

	/**
	 * @param \WP_Post $post Post object.
	 * @return array<string, mixed>
	 */
	public static function map_item( \WP_Post $post ): array {
		$image_id = (int) get_post_thumbnail_id( $post );
		$image    = array(
			'url' => '',
			'alt' => '',
		);
		if ( $image_id > 0 ) {
			$src = wp_get_attachment_image_src( $image_id, 'large' );
			$image['url'] = is_array( $src ) ? (string) $src[0] : '';
			$image['alt'] = (string) get_post_meta( $image_id, '_wp_attachment_image_alt', true );
		}

		$content = trim( wp_strip_all_tags( (string) $post->post_content ) );
		$excerpt = has_excerpt( $post )
			? trim( wp_strip_all_tags( (string) $post->post_excerpt ) )
			: $content;

		$item = array(
			'databaseId'        => (int) $post->ID,
			'title'             => get_the_title( $post ),
			'excerpt'           => $excerpt,
			'content'           => $content,
			'link'              => (string) get_permalink( $post ),
			'uri'               => (string) ( wp_parse_url( (string) get_permalink( $post ), PHP_URL_PATH ) ?: '/' ),
			'slug'              => (string) $post->post_name,
			'date'              => get_post_time( 'c', true, $post ),
			'modified'          => get_post_modified_time( 'c', true, $post ),
			'postType'          => (string) $post->post_type,
			'featuredImage'     => $image,
			'recipientName'     => '',
			'blurb'             => '',
			'grantAmountLabel'  => '',
			'awardedLabel'      => '',
			'checkPhotoUrl'     => '',
			'logoUrl'           => '',
			'website'           => '',
		);

		if ( \KPF\Core\Grants\ContentType::POST_TYPE === $post->post_type ) {
			$item = array_merge( $item, self::map_grant_fields( $post ) );
		}

		return $item;
	}

	/**
	 * Enrich grant query items for About grantee cards.
	 *
	 * @return array{
	 *   recipientName: string,
	 *   blurb: string,
	 *   grantAmountLabel: string,
	 *   awardedLabel: string,
	 *   checkPhotoUrl: string,
	 *   logoUrl: string,
	 *   website: string,
	 *   featuredImage?: array{url: string, alt: string}
	 * }
	 */
	private static function map_grant_fields( \WP_Post $post ): array {
		$details = \KPF\Core\Grants\GraphQL::details( (int) $post->ID );
		$grantee_id = (int) ( $details['granteeId'] ?? 0 );
		$grantee    = $grantee_id > 0 ? \KPF\Core\Grantees\GraphQL::details( $grantee_id ) : array();

		$recipient = trim(
			html_entity_decode(
				(string) ( $details['recipientName'] ?? '' ),
				ENT_QUOTES | ENT_HTML5,
				'UTF-8'
			)
		);
		if ( '' === $recipient && $grantee_id > 0 ) {
			$recipient = trim(
				html_entity_decode(
					(string) ( $grantee['organization'] ?? get_the_title( $grantee_id ) ),
					ENT_QUOTES | ENT_HTML5,
					'UTF-8'
				)
			);
		}

		$check_url = \KPF\Core\Media\PublicUrls::to_wp_host( (string) ( $details['checkPhotoUrl'] ?? '' ) );
		$logo_url  = \KPF\Core\Media\PublicUrls::to_wp_host( (string) ( $grantee['logoUrl'] ?? '' ) );
		$image     = array(
			'url' => $check_url !== '' ? $check_url : $logo_url,
			'alt' => $recipient,
		);

		return array(
			'recipientName'    => $recipient,
			'blurb'            => trim( (string) ( $grantee['blurb'] ?? '' ) ),
			'grantAmountLabel' => (string) ( $details['grantAmountLabel'] ?? '' ),
			'awardedLabel'     => (string) ( $details['awardedLabel'] ?? '' ),
			'checkPhotoUrl'    => $check_url,
			'logoUrl'          => $logo_url,
			'website'          => (string) ( $grantee['website'] ?? '' ),
			'featuredImage'    => $image,
		);
	}

	/**
	 * @return array<int, string>
	 */
	public static function discover_slugs_in_html( string $html ): array {
		if ( '' === $html ) {
			return array();
		}
		preg_match_all( '/\{\{\s*#each\s+queries\.([a-z0-9_-]+)\s*\}\}/i', $html, $matches );
		$slugs = array_map( 'sanitize_title', $matches[1] ?? array() );
		return array_values( array_unique( array_filter( $slugs ) ) );
	}

	public static function find_by_slug( string $slug ): int {
		$slug = sanitize_title( $slug );
		if ( '' === $slug ) {
			return 0;
		}

		$found = get_posts(
			array(
				'post_type'              => ContentType::POST_TYPE,
				'name'                   => $slug,
				'post_status'            => array( 'publish' ),
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		return ! empty( $found[0] ) ? (int) $found[0] : 0;
	}
}

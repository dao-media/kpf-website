<?php

declare(strict_types=1);

namespace KPF\Core\Kevin;

/**
 * Public GraphQL list for About history carousel (anonymous headless clients).
 */
final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_object_type' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfKevinSlide',
			array(
				'description' => 'About-page Kevin history slide (photo + header + body).',
				'fields'      => array(
					'databaseId' => array( 'type' => 'Int' ),
					'header'     => array( 'type' => 'String' ),
					'body'       => array( 'type' => 'String' ),
					'imageUrl'   => array( 'type' => 'String' ),
					'imageAlt'   => array( 'type' => 'String' ),
					'menuOrder'  => array( 'type' => 'Int' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfKevinSlides',
			array(
				'type'        => array( 'list_of' => 'KpfKevinSlide' ),
				'description' => 'Published Kevin slides for the About history stack, ordered by menu_order then date.',
				'args'        => array(
					'first' => array(
						'type'        => 'Int',
						'description' => 'Max slides to return (default 12, max 24).',
					),
				),
				'resolve'     => static function ( $source, array $args ): array {
					unset( $source );
					$first = isset( $args['first'] ) ? (int) $args['first'] : 12;
					return self::slide_list( $first );
				},
			)
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function slide_list( int $first = 12 ): array {
		$first = max( 1, min( 24, $first > 0 ? $first : 12 ) );

		$query = new \WP_Query(
			array(
				'post_type'              => ContentType::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => $first,
				'orderby'                => array(
					'menu_order' => 'ASC',
					'date'       => 'ASC',
				),
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		$items = array();
		foreach ( $query->posts as $post ) {
			$slide = self::slide_from_post( $post );
			if ( null !== $slide ) {
				$items[] = $slide;
			}
		}

		return $items;
	}

	/**
	 * @param \WP_Post $post
	 * @return array<string, mixed>|null
	 */
	private static function slide_from_post( \WP_Post $post ): ?array {
		$header = html_entity_decode(
			trim( (string) get_the_title( $post ) ),
			ENT_QUOTES | ENT_HTML5,
			'UTF-8'
		);
		if ( '' === $header ) {
			return null;
		}

		$attachment_id = (int) get_post_thumbnail_id( $post );
		$image_url     = \KPF\Core\Media\PublicUrls::image_url( $attachment_id, 'full' );
		if ( '' === $image_url ) {
			return null;
		}

		$image_alt = $attachment_id > 0
			? (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true )
			: '';
		if ( '' === $image_alt ) {
			$image_alt = $header;
		}

		$body = trim(
			html_entity_decode(
				wp_strip_all_tags( (string) $post->post_content ),
				ENT_QUOTES | ENT_HTML5,
				'UTF-8'
			)
		);

		return array(
			'databaseId' => (int) $post->ID,
			'header'     => $header,
			'body'       => $body,
			'imageUrl'   => $image_url,
			'imageAlt'   => $image_alt,
			'menuOrder'  => (int) $post->menu_order,
		);
	}
}

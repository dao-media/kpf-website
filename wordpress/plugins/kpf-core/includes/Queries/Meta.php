<?php

declare(strict_types=1);

namespace KPF\Core\Queries;

final class Meta {
	public const META_KEY     = '_kpf_query';
	public const VERSION      = 1;
	public const MAX_PER_PAGE = 50;

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
	}

	public static function register_meta(): void {
		register_post_meta(
			ContentType::POST_TYPE,
			self::META_KEY,
			array(
				'type'              => 'object',
				'single'            => true,
				'default'           => self::defaults(),
				'show_in_rest'      => false,
				'sanitize_callback' => array( self::class, 'sanitize' ),
				'auth_callback'     => static fn(): bool => current_user_can( 'edit_theme_options' ),
				'revisions_enabled' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'       => self::VERSION,
			'postType'      => 'post',
			'perPage'       => 6,
			'orderby'       => 'date',
			'order'         => 'DESC',
			'status'        => array( 'publish' ),
			'excludeIds'    => array(),
			'excludeCurrent'=> true,
			'includeIds'    => array(),
			'taxonomies'    => array(),
			'metaQuery'     => array(),
			'related'       => array(
				'enabled'  => false,
				'by'       => 'category',
				'taxonomy' => 'category',
			),
			'pagination'    => array(
				'enabled' => false,
				'perPage' => 6,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get( int $post_id ): array {
		$value = get_post_meta( $post_id, self::META_KEY, true );
		return self::sanitize( is_array( $value ) ? $value : array() );
	}

	/**
	 * @param array<string, mixed> $value
	 * @return array<string, mixed>
	 */
	public static function update( int $post_id, array $value ): array {
		$clean = self::sanitize( $value );
		update_post_meta( $post_id, self::META_KEY, $clean );
		return $clean;
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$value    = is_array( $value ) ? $value : array();
		$defaults = self::defaults();

		$post_type = sanitize_key( (string) ( $value['postType'] ?? $defaults['postType'] ) );
		if ( ! self::is_allowed_post_type( $post_type ) ) {
			$post_type = 'post';
		}

		$orderby = sanitize_key( (string) ( $value['orderby'] ?? $defaults['orderby'] ) );
		$allowed_orderby = array( 'date', 'modified', 'title', 'menu_order', 'rand', 'relevance' );
		if ( ! in_array( $orderby, $allowed_orderby, true ) ) {
			$orderby = 'date';
		}

		$order = strtoupper( (string) ( $value['order'] ?? $defaults['order'] ) );
		$order = 'ASC' === $order ? 'ASC' : 'DESC';

		$status = array();
		foreach ( (array) ( $value['status'] ?? $defaults['status'] ) as $item ) {
			$item = sanitize_key( (string) $item );
			if ( in_array( $item, array( 'publish', 'draft', 'private', 'future' ), true ) ) {
				$status[] = $item;
			}
		}
		if ( ! $status ) {
			$status = array( 'publish' );
		}

		$per_page = max( 1, min( self::MAX_PER_PAGE, absint( $value['perPage'] ?? $defaults['perPage'] ) ) );

		$related = is_array( $value['related'] ?? null ) ? $value['related'] : $defaults['related'];
		$related_by = sanitize_key( (string) ( $related['by'] ?? 'category' ) );
		if ( ! in_array( $related_by, array( 'category', 'tag', 'taxonomy', 'post_type', 'none' ), true ) ) {
			$related_by = 'category';
		}

		$pagination = is_array( $value['pagination'] ?? null ) ? $value['pagination'] : $defaults['pagination'];
		$pagination_per_page = max( 1, min( self::MAX_PER_PAGE, absint( $pagination['perPage'] ?? $per_page ) ) );

		return array(
			'version'        => self::VERSION,
			'postType'       => $post_type,
			'perPage'        => $per_page,
			'orderby'        => $orderby,
			'order'          => $order,
			'status'         => array_values( array_unique( $status ) ),
			'excludeIds'     => self::sanitize_id_list( $value['excludeIds'] ?? array() ),
			'excludeCurrent' => ! empty( $value['excludeCurrent'] ),
			'includeIds'     => self::sanitize_id_list( $value['includeIds'] ?? array() ),
			'taxonomies'     => self::sanitize_taxonomies( $value['taxonomies'] ?? array() ),
			'metaQuery'      => self::sanitize_meta_query( $value['metaQuery'] ?? array() ),
			'related'        => array(
				'enabled'  => ! empty( $related['enabled'] ),
				'by'       => $related_by,
				'taxonomy' => sanitize_key( (string) ( $related['taxonomy'] ?? 'category' ) ),
			),
			'pagination'     => array(
				'enabled' => ! empty( $pagination['enabled'] ),
				'perPage' => $pagination_per_page,
			),
		);
	}

	public static function is_allowed_post_type( string $post_type ): bool {
		foreach ( self::allowed_post_types() as $row ) {
			if ( $post_type === $row['name'] ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @return array<int, array{name: string, label: string}>
	 */
	public static function allowed_post_types(): array {
		$names = array( 'post', 'page', 'kpf_event', 'kpf_scrapbook' );
		$rows  = array();
		foreach ( $names as $name ) {
			$object = get_post_type_object( $name );
			if ( ! $object || empty( $object->public ) ) {
				continue;
			}
			$rows[] = array(
				'name'  => $name,
				'label' => (string) ( $object->labels->name ?? $name ),
			);
		}
		return $rows;
	}

	/**
	 * @param mixed $value
	 * @return array<int, int>
	 */
	private static function sanitize_id_list( $value ): array {
		$ids = array();
		foreach ( (array) $value as $item ) {
			$id = absint( $item );
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * @param mixed $value
	 * @return array<int, array<string, mixed>>
	 */
	private static function sanitize_taxonomies( $value ): array {
		$clean = array();
		foreach ( array_slice( (array) $value, 0, 10 ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$taxonomy = sanitize_key( (string) ( $row['taxonomy'] ?? '' ) );
			if ( '' === $taxonomy || ! taxonomy_exists( $taxonomy ) ) {
				continue;
			}
			$terms = array();
			foreach ( (array) ( $row['terms'] ?? array() ) as $term ) {
				$term = sanitize_title( (string) $term );
				if ( '' !== $term ) {
					$terms[] = $term;
				}
			}
			if ( ! $terms ) {
				continue;
			}
			$operator = strtoupper( (string) ( $row['operator'] ?? 'IN' ) );
			if ( ! in_array( $operator, array( 'IN', 'NOT IN', 'AND' ), true ) ) {
				$operator = 'IN';
			}
			$field = sanitize_key( (string) ( $row['field'] ?? 'slug' ) );
			if ( ! in_array( $field, array( 'slug', 'term_id', 'name' ), true ) ) {
				$field = 'slug';
			}
			$clean[] = array(
				'taxonomy' => $taxonomy,
				'terms'    => array_values( array_unique( $terms ) ),
				'field'    => $field,
				'operator' => $operator,
			);
		}
		return $clean;
	}

	/**
	 * @param mixed $value
	 * @return array<int, array<string, mixed>>
	 */
	private static function sanitize_meta_query( $value ): array {
		$allowed_compare = array( '=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'EXISTS', 'NOT EXISTS', 'IN', 'NOT IN' );
		$clean           = array();
		foreach ( array_slice( (array) $value, 0, 10 ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$key = sanitize_key( (string) ( $row['key'] ?? '' ) );
			if ( '' === $key ) {
				continue;
			}
			$compare = strtoupper( (string) ( $row['compare'] ?? '=' ) );
			if ( ! in_array( $compare, $allowed_compare, true ) ) {
				$compare = '=';
			}
			$clean[] = array(
				'key'     => $key,
				'value'   => sanitize_text_field( (string) ( $row['value'] ?? '' ) ),
				'compare' => $compare,
				'type'    => sanitize_key( (string) ( $row['type'] ?? 'CHAR' ) ) ?: 'CHAR',
			);
		}
		return $clean;
	}
}

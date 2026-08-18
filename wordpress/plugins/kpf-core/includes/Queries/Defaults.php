<?php

declare(strict_types=1);

namespace KPF\Core\Queries;

/**
 * Seed / refresh built-in saved queries (Code → Queries).
 */
final class Defaults {
	public const KEVIN_SLUG  = 'kevin';
	public const GRANTS_SLUG = 'grants';

	public static function register(): void {
		add_action( 'init', array( self::class, 'ensure_kevin_query' ), 30 );
		add_action( 'init', array( self::class, 'ensure_grants_query' ), 31 );
	}

	/**
	 * About history stack: Kevin slides ordered by menu_order.
	 * Use in designs: {{#each queries.kevin}}…{{/each}}
	 * Or GraphQL: kpfQuery(slug: "kevin")
	 */
	public static function ensure_kevin_query(): int {
		if ( ! post_type_exists( ContentType::POST_TYPE ) ) {
			return 0;
		}
		if ( ! post_type_exists( 'kpf_kevin' ) ) {
			return 0;
		}

		$existing_id = Resolver::find_by_slug( self::KEVIN_SLUG );
		$title       = __( 'Kevin', 'kpf-core' );
		$definition  = array(
			'postType'       => 'kpf_kevin',
			'perPage'        => 12,
			'orderby'        => 'menu_order',
			'order'          => 'ASC',
			'status'         => array( 'publish' ),
			'excludeCurrent' => false,
			'pagination'     => array(
				'enabled' => false,
				'perPage' => 12,
			),
		);

		return self::upsert_query( $existing_id, self::KEVIN_SLUG, $title, $definition );
	}

	/**
	 * About grantee cards: published grants newest-award-first.
	 * Use in designs: {{#each queries.grants}}…{{/each}}
	 * Or GraphQL: kpfQuery(slug: "grants")
	 */
	public static function ensure_grants_query(): int {
		if ( ! post_type_exists( ContentType::POST_TYPE ) ) {
			return 0;
		}
		if ( ! post_type_exists( \KPF\Core\Grants\ContentType::POST_TYPE ) ) {
			return 0;
		}

		$existing_id = Resolver::find_by_slug( self::GRANTS_SLUG );
		$title       = __( 'Grants', 'kpf-core' );
		$definition  = array(
			'postType'       => \KPF\Core\Grants\ContentType::POST_TYPE,
			'perPage'        => 12,
			'orderby'        => 'meta_value_num',
			'metaKey'        => \KPF\Core\Grants\Meta::SORT_DATE_KEY,
			'order'          => 'DESC',
			'status'         => array( 'publish' ),
			'excludeCurrent' => false,
			'pagination'     => array(
				'enabled' => false,
				'perPage' => 12,
			),
		);

		return self::upsert_query( $existing_id, self::GRANTS_SLUG, $title, $definition );
	}

	/**
	 * @param array<string, mixed> $definition
	 */
	private static function upsert_query( int $existing_id, string $slug, string $title, array $definition ): int {
		if ( $existing_id > 0 ) {
			Meta::update( $existing_id, $definition );
			$post = get_post( $existing_id );
			if ( $post instanceof \WP_Post && $post->post_title !== $title ) {
				wp_update_post(
					array(
						'ID'         => $existing_id,
						'post_title' => $title,
					)
				);
			}
			return $existing_id;
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => ContentType::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => $title,
				'post_name'   => $slug,
			),
			true
		);

		if ( is_wp_error( $post_id ) || (int) $post_id < 1 ) {
			return 0;
		}

		$post_id = (int) $post_id;
		Meta::update( $post_id, $definition );
		return $post_id;
	}
}

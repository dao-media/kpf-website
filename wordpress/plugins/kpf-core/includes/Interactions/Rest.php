<?php

declare(strict_types=1);

namespace KPF\Core\Interactions;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE      = 'kpf-interactions/v1';
	public const EXPORT_KIND    = 'kpf-gsap-animations';
	public const EXPORT_VERSION = 1;

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/animations',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'index' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'create' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/export',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'export' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/import',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'import' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/animations/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'show' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
					'args'                => self::id_args(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'update' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
					'args'                => self::id_args(),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( self::class, 'delete' ),
					'permission_callback' => static fn(): bool => current_user_can( 'delete_pages' ),
					'args'                => self::id_args(),
				),
			)
		);
	}

	public static function index(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'animations' => array_map( array( self::class, 'payload' ), self::animation_posts() ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function show( WP_REST_Request $request ) {
		$post = self::animation( absint( $request['id'] ) );
		return is_wp_error( $post ) ? $post : new WP_REST_Response( self::payload( $post ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create( WP_REST_Request $request ) {
		$title = sanitize_text_field( (string) $request->get_param( 'name' ) );
		$id    = wp_insert_post(
			array(
				'post_type'   => ContentType::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => $title ?: __( 'Untitled animation', 'kpf-core' ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$config = Meta::sanitize( $request->get_param( 'config' ) );
		update_post_meta( (int) $id, Meta::META_KEY, $config );
		wp_save_post_revision( (int) $id );

		return new WP_REST_Response( self::payload( get_post( (int) $id ) ), 201 );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update( WP_REST_Request $request ) {
		$post = self::animation( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$title = sanitize_text_field( (string) $request->get_param( 'name' ) );
		if ( '' !== $title ) {
			wp_update_post(
				array(
					'ID'         => $post->ID,
					'post_title' => $title,
				)
			);
		}

		if ( null !== $request->get_param( 'config' ) ) {
			update_post_meta( $post->ID, Meta::META_KEY, Meta::sanitize( $request->get_param( 'config' ) ) );
		}
		wp_save_post_revision( $post->ID );

		return new WP_REST_Response( self::payload( get_post( $post->ID ) ) );
	}

	public static function export( WP_REST_Request $request ): WP_REST_Response {
		$ids = self::requested_ids( $request );
		$posts = self::animation_posts();
		if ( $ids ) {
			$posts = array_values(
				array_filter(
					$posts,
					static fn( \WP_Post $post ): bool => in_array( (int) $post->ID, $ids, true )
				)
			);
		}

		$animations = array();
		foreach ( $posts as $post ) {
			$payload       = self::payload( $post );
			$animations[] = array(
				'name'   => (string) $payload['name'],
				'config' => $payload['config'],
			);
		}

		return new WP_REST_Response( self::export_document( $animations ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function import( WP_REST_Request $request ) {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			$body = $request->get_params();
		}
		if ( ! is_array( $body ) ) {
			return new WP_Error(
				'kpf_gsap_import_invalid',
				__( 'That file is not a valid GSAP animation export.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$list = array();
		$kind = (string) ( $body['kind'] ?? '' );
		if ( isset( $body['animations'] ) && is_array( $body['animations'] ) ) {
			if ( '' !== $kind && self::EXPORT_KIND !== $kind ) {
				return new WP_Error(
					'kpf_gsap_import_kind',
					__( 'That file is not a KPF GSAP animation export.', 'kpf-core' ),
					array( 'status' => 400 )
				);
			}
			$list = $body['animations'];
		} elseif ( array_is_list( $body ) ) {
			$list = $body;
		} else {
			return new WP_Error(
				'kpf_gsap_import_invalid',
				__( 'That file is not a valid GSAP animation export.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$created = 0;
		$updated = 0;
		$items   = array();
		foreach ( $list as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$config = Meta::sanitize( $row['config'] ?? $row );
			$name   = sanitize_text_field( (string) ( $row['name'] ?? '' ) );
			if ( '' === $name ) {
				$name = __( 'Untitled animation', 'kpf-core' );
			}

			$existing = self::find_by_name_and_selector( $name, (string) $config['selector'] );
			if ( $existing ) {
				wp_update_post(
					array(
						'ID'         => $existing->ID,
						'post_title' => $name,
					)
				);
				update_post_meta( $existing->ID, Meta::META_KEY, $config );
				wp_save_post_revision( $existing->ID );
				++$updated;
				$items[] = self::payload( get_post( $existing->ID ) );
				continue;
			}

			$id = wp_insert_post(
				array(
					'post_type'   => ContentType::POST_TYPE,
					'post_status' => 'publish',
					'post_title'  => $name,
				),
				true
			);
			if ( is_wp_error( $id ) ) {
				return $id;
			}
			update_post_meta( (int) $id, Meta::META_KEY, $config );
			wp_save_post_revision( (int) $id );
			++$created;
			$items[] = self::payload( get_post( (int) $id ) );
		}

		return new WP_REST_Response(
			array(
				'created'    => $created,
				'updated'    => $updated,
				'animations' => $items,
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete( WP_REST_Request $request ) {
		$post = self::animation( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		wp_delete_post( $post->ID, true );
		return new WP_REST_Response( array( 'deleted' => true, 'id' => $post->ID ) );
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private static function id_args(): array {
		return array(
			'id' => array(
				'type'              => 'integer',
				'required'          => true,
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * @return \WP_Post|WP_Error
	 */
	private static function animation( int $id ) {
		$post = get_post( $id );
		if ( ! $post || ContentType::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'kpf_animation_not_found',
				__( 'That animation could not be found.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}
		return $post;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function payload( \WP_Post $post ): array {
		$config = Meta::get( (int) $post->ID );
		return array(
			'id'       => (int) $post->ID,
			'name'     => get_the_title( $post ),
			'active'   => (bool) $config['active'],
			'selector' => (string) $config['selector'],
			'trigger'  => (string) $config['trigger'],
			'method'   => (string) $config['method'],
			'config'   => $config,
			'modified' => mysql_to_rfc3339( (string) $post->post_modified ),
		);
	}

	/**
	 * @return array<int, \WP_Post>
	 */
	private static function animation_posts(): array {
		return get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => array( 'publish', 'draft' ),
				'posts_per_page' => -1,
				'orderby'        => array( 'menu_order' => 'ASC', 'modified' => 'DESC' ),
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function export_document( array $animations ): array {
		return array(
			'kind'       => self::EXPORT_KIND,
			'version'    => self::EXPORT_VERSION,
			'exportedAt' => gmdate( 'c' ),
			'animations' => $animations,
		);
	}

	/**
	 * @return array<int, int>
	 */
	private static function requested_ids( WP_REST_Request $request ): array {
		$ids = $request->get_param( 'ids' );
		if ( is_string( $ids ) && '' !== $ids ) {
			$ids = explode( ',', $ids );
		}
		if ( ! is_array( $ids ) ) {
			return array();
		}

		return array_values(
			array_unique(
				array_filter(
					array_map( 'absint', $ids )
				)
			)
		);
	}

	private static function find_by_name_and_selector( string $name, string $selector ): ?\WP_Post {
		foreach ( self::animation_posts() as $post ) {
			$config = Meta::get( (int) $post->ID );
			if ( get_the_title( $post ) === $name && (string) $config['selector'] === $selector ) {
				return $post;
			}
		}
		return null;
	}
}

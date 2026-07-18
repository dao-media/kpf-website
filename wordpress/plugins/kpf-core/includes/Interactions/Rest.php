<?php

declare(strict_types=1);

namespace KPF\Core\Interactions;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-interactions/v1';

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
		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => array( 'publish', 'draft' ),
				'posts_per_page' => -1,
				'orderby'        => array( 'menu_order' => 'ASC', 'modified' => 'DESC' ),
			)
		);

		return new WP_REST_Response(
			array(
				'animations' => array_map( array( self::class, 'payload' ), $posts ),
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
}

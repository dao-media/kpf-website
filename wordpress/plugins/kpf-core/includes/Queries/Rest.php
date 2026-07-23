<?php

declare(strict_types=1);

namespace KPF\Core\Queries;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-queries/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/queries',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'index' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'create' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/queries/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'show' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
					'args'                => self::id_args(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'update' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
					'args'                => self::id_args(),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( self::class, 'delete' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
					'args'                => self::id_args(),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/queries/(?P<id>\d+)/preview',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'preview' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				'args'                => self::id_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/options',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'options' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);
	}

	public static function index(): WP_REST_Response {
		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => array( 'publish', 'draft' ),
				'posts_per_page' => 200,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		$rows = array();
		foreach ( $posts as $post ) {
			$rows[] = self::row( $post );
		}

		return new WP_REST_Response( array( 'queries' => $rows ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function show( WP_REST_Request $request ) {
		$post = self::get_query_post( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		return new WP_REST_Response( self::row( $post ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create( WP_REST_Request $request ) {
		$title = sanitize_text_field( (string) $request->get_param( 'title' ) );
		$slug  = sanitize_title( (string) ( $request->get_param( 'slug' ) ?: $title ) );
		if ( '' === $title || '' === $slug ) {
			return new WP_Error( 'kpf_query_invalid', __( 'Title and slug are required.', 'kpf-core' ), array( 'status' => 400 ) );
		}

		if ( Resolver::find_by_slug( $slug ) > 0 ) {
			return new WP_Error( 'kpf_query_slug_taken', __( 'That query slug is already in use.', 'kpf-core' ), array( 'status' => 409 ) );
		}

		$definition = Meta::sanitize( (array) $request->get_param( 'definition' ) );
		$status     = 'draft' === $request->get_param( 'status' ) ? 'draft' : 'publish';

		$post_id = wp_insert_post(
			array(
				'post_type'   => ContentType::POST_TYPE,
				'post_status' => $status,
				'post_title'  => $title,
				'post_name'   => $slug,
			),
			true
		);

		if ( is_wp_error( $post_id ) || ! $post_id ) {
			return new WP_Error( 'kpf_query_create_failed', __( 'Could not create the query.', 'kpf-core' ), array( 'status' => 500 ) );
		}

		Meta::update( (int) $post_id, $definition );
		$post = get_post( (int) $post_id );

		return new WP_REST_Response( self::row( $post ), 201 );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update( WP_REST_Request $request ) {
		$post = self::get_query_post( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$updates = array( 'ID' => (int) $post->ID );
		if ( null !== $request->get_param( 'title' ) ) {
			$updates['post_title'] = sanitize_text_field( (string) $request->get_param( 'title' ) );
		}
		if ( null !== $request->get_param( 'slug' ) ) {
			$slug = sanitize_title( (string) $request->get_param( 'slug' ) );
			$existing = Resolver::find_by_slug( $slug );
			if ( $slug && $existing > 0 && $existing !== (int) $post->ID ) {
				return new WP_Error( 'kpf_query_slug_taken', __( 'That query slug is already in use.', 'kpf-core' ), array( 'status' => 409 ) );
			}
			$updates['post_name'] = $slug;
		}
		if ( null !== $request->get_param( 'status' ) ) {
			$updates['post_status'] = 'draft' === $request->get_param( 'status' ) ? 'draft' : 'publish';
		}

		$result = wp_update_post( $updates, true );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( null !== $request->get_param( 'definition' ) ) {
			Meta::update( (int) $post->ID, (array) $request->get_param( 'definition' ) );
		}

		return new WP_REST_Response( self::row( get_post( (int) $post->ID ) ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete( WP_REST_Request $request ) {
		$post = self::get_query_post( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		wp_delete_post( (int) $post->ID, true );
		return new WP_REST_Response( array( 'ok' => true ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function preview( WP_REST_Request $request ) {
		$post = self::get_query_post( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$definition = $request->get_param( 'definition' );
		$definition = is_array( $definition ) ? Meta::sanitize( $definition ) : Meta::get( (int) $post->ID );
		$page       = max( 1, absint( $request->get_param( 'page' ) ?: 1 ) );
		$context_id = absint( $request->get_param( 'contextId' ) );
		$result     = Resolver::run( $definition, $context_id, $page );

		return new WP_REST_Response( $result );
	}

	public static function options(): WP_REST_Response {
		$taxonomies = array();
		foreach ( get_taxonomies( array( 'public' => true ), 'objects' ) as $taxonomy ) {
			$taxonomies[] = array(
				'name'  => $taxonomy->name,
				'label' => (string) ( $taxonomy->labels->name ?? $taxonomy->name ),
			);
		}

		return new WP_REST_Response(
			array(
				'postTypes'  => Meta::allowed_post_types(),
				'taxonomies' => $taxonomies,
				'maxPerPage' => Meta::MAX_PER_PAGE,
				'orderby'    => array( 'date', 'modified', 'title', 'menu_order', 'rand', 'relevance' ),
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function row( \WP_Post $post ): array {
		$definition = Meta::get( (int) $post->ID );
		return array(
			'id'           => (int) $post->ID,
			'title'        => get_the_title( $post ),
			'slug'         => (string) $post->post_name,
			'status'       => (string) $post->post_status,
			'definition'   => $definition,
			'invocation'   => sprintf( '{{#each queries.%s}}…{{/each}}', $post->post_name ),
			'active'       => 'publish' === $post->post_status,
		);
	}

	/**
	 * @return \WP_Post|WP_Error
	 */
	private static function get_query_post( int $id ) {
		$post = get_post( $id );
		if ( ! $post || ContentType::POST_TYPE !== $post->post_type ) {
			return new WP_Error( 'kpf_query_not_found', __( 'Query not found.', 'kpf-core' ), array( 'status' => 404 ) );
		}
		return $post;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private static function id_args(): array {
		return array(
			'id' => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'required'          => true,
			),
		);
	}
}

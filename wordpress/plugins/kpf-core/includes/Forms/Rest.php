<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

use WP_Error;
use WP_Post;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-forms/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/forms',
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
			'/forms/(?P<id>\d+)',
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
			'/options',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'options' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/cities',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'cities' ),
				'permission_callback' => '__return_true',
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

		return new WP_REST_Response( array( 'forms' => $rows ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function show( WP_REST_Request $request ) {
		$post = self::get_form_post( absint( $request['id'] ) );
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
			return new WP_Error( 'kpf_form_invalid', __( 'Title and slug are required.', 'kpf-core' ), array( 'status' => 400 ) );
		}

		if ( Definition::find_by_slug( $slug ) > 0 ) {
			return new WP_Error( 'kpf_form_slug_taken', __( 'That form slug is already in use.', 'kpf-core' ), array( 'status' => 409 ) );
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
			return new WP_Error( 'kpf_form_create_failed', __( 'Could not create the form.', 'kpf-core' ), array( 'status' => 500 ) );
		}

		Meta::update( (int) $post_id, $definition );
		$post = get_post( (int) $post_id );

		return new WP_REST_Response( self::row( $post ), 201 );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update( WP_REST_Request $request ) {
		$post = self::get_form_post( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$title = sanitize_text_field( (string) ( $request->get_param( 'title' ) ?? $post->post_title ) );
		$slug  = sanitize_title( (string) ( $request->get_param( 'slug' ) ?? $post->post_name ) );
		if ( '' === $title || '' === $slug ) {
			return new WP_Error( 'kpf_form_invalid', __( 'Title and slug are required.', 'kpf-core' ), array( 'status' => 400 ) );
		}

		$existing = Definition::find_by_slug( $slug );
		if ( $existing > 0 && $existing !== (int) $post->ID ) {
			return new WP_Error( 'kpf_form_slug_taken', __( 'That form slug is already in use.', 'kpf-core' ), array( 'status' => 409 ) );
		}

		$status = $request->get_param( 'status' );
		$post_status = 'draft' === $status ? 'draft' : ( 'publish' === $status || null === $status ? 'publish' : $post->post_status );

		$updated = wp_update_post(
			array(
				'ID'          => $post->ID,
				'post_title'  => $title,
				'post_name'   => $slug,
				'post_status' => $post_status,
			),
			true
		);

		if ( is_wp_error( $updated ) ) {
			return $updated;
		}

		if ( null !== $request->get_param( 'definition' ) ) {
			Meta::update( (int) $post->ID, (array) $request->get_param( 'definition' ) );
		}

		return new WP_REST_Response( self::row( get_post( $post->ID ) ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete( WP_REST_Request $request ) {
		$post = self::get_form_post( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$result = wp_trash_post( $post->ID );
		if ( ! $result ) {
			return new WP_Error( 'kpf_form_delete_failed', __( 'Could not delete the form.', 'kpf-core' ), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( array( 'deleted' => true, 'id' => (int) $post->ID ) );
	}

	public static function options(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'fieldTypes'   => Catalog::field_types(),
				'conditions'   => Catalog::condition_sources(),
				'operators'    => Catalog::condition_operators(),
				'countries'    => Catalog::countries(),
				'platforms'    => Catalog::social_platforms(),
				'captchaModes' => Settings::available_captcha_modes(),
				'captchaChoices' => Settings::captcha_mode_choices(),
			)
		);
	}

	public static function cities( WP_REST_Request $request ): WP_REST_Response {
		$q = strtolower( trim( (string) $request->get_param( 'q' ) ) );
		$suggestions = self::city_index();
		if ( '' === $q ) {
			return new WP_REST_Response( array( 'cities' => array_slice( $suggestions, 0, 12 ) ) );
		}

		$matched = array();
		foreach ( $suggestions as $row ) {
			$hay = strtolower( $row['city'] . ' ' . $row['state'] . ' ' . $row['label'] );
			if ( false !== strpos( $hay, $q ) ) {
				$matched[] = $row;
			}
			if ( count( $matched ) >= 12 ) {
				break;
			}
		}

		return new WP_REST_Response( array( 'cities' => $matched ) );
	}

	/**
	 * @return array<int, array{city:string,state:string,label:string}>
	 */
	private static function city_index(): array {
		return array(
			array( 'city' => 'New York', 'state' => 'NY', 'label' => 'New York, NY' ),
			array( 'city' => 'Los Angeles', 'state' => 'CA', 'label' => 'Los Angeles, CA' ),
			array( 'city' => 'Chicago', 'state' => 'IL', 'label' => 'Chicago, IL' ),
			array( 'city' => 'Houston', 'state' => 'TX', 'label' => 'Houston, TX' ),
			array( 'city' => 'Phoenix', 'state' => 'AZ', 'label' => 'Phoenix, AZ' ),
			array( 'city' => 'Philadelphia', 'state' => 'PA', 'label' => 'Philadelphia, PA' ),
			array( 'city' => 'San Antonio', 'state' => 'TX', 'label' => 'San Antonio, TX' ),
			array( 'city' => 'San Diego', 'state' => 'CA', 'label' => 'San Diego, CA' ),
			array( 'city' => 'Dallas', 'state' => 'TX', 'label' => 'Dallas, TX' ),
			array( 'city' => 'San Jose', 'state' => 'CA', 'label' => 'San Jose, CA' ),
			array( 'city' => 'Austin', 'state' => 'TX', 'label' => 'Austin, TX' ),
			array( 'city' => 'Jacksonville', 'state' => 'FL', 'label' => 'Jacksonville, FL' ),
			array( 'city' => 'Fort Worth', 'state' => 'TX', 'label' => 'Fort Worth, TX' ),
			array( 'city' => 'Columbus', 'state' => 'OH', 'label' => 'Columbus, OH' ),
			array( 'city' => 'Charlotte', 'state' => 'NC', 'label' => 'Charlotte, NC' ),
			array( 'city' => 'Indianapolis', 'state' => 'IN', 'label' => 'Indianapolis, IN' ),
			array( 'city' => 'San Francisco', 'state' => 'CA', 'label' => 'San Francisco, CA' ),
			array( 'city' => 'Seattle', 'state' => 'WA', 'label' => 'Seattle, WA' ),
			array( 'city' => 'Denver', 'state' => 'CO', 'label' => 'Denver, CO' ),
			array( 'city' => 'Boston', 'state' => 'MA', 'label' => 'Boston, MA' ),
			array( 'city' => 'Nashville', 'state' => 'TN', 'label' => 'Nashville, TN' ),
			array( 'city' => 'Detroit', 'state' => 'MI', 'label' => 'Detroit, MI' ),
			array( 'city' => 'Portland', 'state' => 'OR', 'label' => 'Portland, OR' ),
			array( 'city' => 'Las Vegas', 'state' => 'NV', 'label' => 'Las Vegas, NV' ),
			array( 'city' => 'Miami', 'state' => 'FL', 'label' => 'Miami, FL' ),
			array( 'city' => 'Atlanta', 'state' => 'GA', 'label' => 'Atlanta, GA' ),
			array( 'city' => 'Minneapolis', 'state' => 'MN', 'label' => 'Minneapolis, MN' ),
			array( 'city' => 'Cleveland', 'state' => 'OH', 'label' => 'Cleveland, OH' ),
			array( 'city' => 'Raleigh', 'state' => 'NC', 'label' => 'Raleigh, NC' ),
			array( 'city' => 'Milwaukee', 'state' => 'WI', 'label' => 'Milwaukee, WI' ),
		);
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
	 * @return WP_Post|WP_Error
	 */
	private static function get_form_post( int $id ) {
		$post = get_post( $id );
		if ( ! $post || ContentType::POST_TYPE !== $post->post_type ) {
			return new WP_Error( 'kpf_form_not_found', __( 'Form not found.', 'kpf-core' ), array( 'status' => 404 ) );
		}
		return $post;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function row( ?WP_Post $post ): array {
		if ( ! $post ) {
			return array();
		}

		$definition = Meta::get( (int) $post->ID );

		return array(
			'id'         => (int) $post->ID,
			'title'      => get_the_title( $post ),
			'slug'       => $post->post_name,
			'status'     => $post->post_status,
			'definition' => $definition,
			'fieldCount' => count( $definition['fields'] ?? array() ),
			'updated'    => get_post_modified_time( 'c', true, $post ),
			'embed'      => sprintf( '{{form:%s}}', $post->post_name ),
		);
	}
}

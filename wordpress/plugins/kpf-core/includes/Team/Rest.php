<?php

declare(strict_types=1);

namespace KPF\Core\Team;

use KPF\Core\Seo\MetaRepository;
use KPF\Core\Seo\Resolver;
use KPF\Core\Seo\Sanitizer;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

final class Rest {
	public const NAMESPACE = 'kpf-team/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
		add_action( 'rest_api_init', array( self::class, 'register_fields' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/editor/(?P<id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( self::class, 'get_editor' ),
					'permission_callback' => array( self::class, 'can_edit' ),
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( self::class, 'save_editor' ),
					'permission_callback' => array( self::class, 'can_edit' ),
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);
	}

	public static function register_fields(): void {
		register_rest_field(
			ContentType::POST_TYPE,
			'teamDetails',
			array(
				'get_callback' => static function ( array $object ): array {
					return GraphQL::details( (int) ( $object['id'] ?? 0 ) );
				},
				'schema'       => array(
					'description' => __( 'Resolved team member profile details.', 'kpf-core' ),
					'type'        => 'object',
					'readonly'    => true,
					'context'     => array( 'view', 'edit', 'embed' ),
				),
			)
		);
	}

	/**
	 * @param WP_REST_Request $request Request.
	 */
	public static function can_edit( WP_REST_Request $request ): bool {
		$post_id = absint( $request['id'] );
		return $post_id > 0 && current_user_can( 'edit_post', $post_id );
	}

	/**
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_editor( WP_REST_Request $request ) {
		$post = self::get_member( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		return new WP_REST_Response( self::payload( $post ), 200 );
	}

	/**
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_editor( WP_REST_Request $request ) {
		$post = self::get_member( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$post_id = (int) $post->ID;
		$title   = sanitize_text_field( (string) $request->get_param( 'title' ) );
		$slug    = sanitize_title( (string) $request->get_param( 'slug' ) );
		$status  = sanitize_key( (string) $request->get_param( 'status' ) );
		$content = wp_kses_post( (string) $request->get_param( 'content' ) );

		$allowed_statuses = array( 'publish', 'draft', 'pending', 'private', 'future' );
		if ( ! in_array( $status, $allowed_statuses, true ) ) {
			$status = $post->post_status;
		}

		$update = array(
			'ID'           => $post_id,
			'post_title'   => $title,
			'post_name'    => $slug,
			'post_status'  => $status,
			'post_content' => $content,
		);

		$result = wp_update_post( wp_slash( $update ), true );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$featured_image_id = absint( $request->get_param( 'featuredImageId' ) );
		if ( $featured_image_id > 0 ) {
			set_post_thumbnail( $post_id, $featured_image_id );
		} else {
			delete_post_thumbnail( $post_id );
		}

		$profile = $request->get_param( 'profile' );
		Meta::update( $post_id, is_array( $profile ) ? $profile : array() );

		$seo = $request->get_param( 'seo' );
		MetaRepository::update( $post_id, is_array( $seo ) ? $seo : array() );

		$fresh = get_post( $post_id );
		if ( ! $fresh instanceof \WP_Post ) {
			return new WP_Error(
				'kpf_team_missing',
				__( 'Team member not found after save.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response( self::payload( $fresh ), 200 );
	}

	/**
	 * @return \WP_Post|WP_Error
	 */
	private static function get_member( int $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post instanceof \WP_Post || ContentType::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'kpf_team_invalid',
				__( 'Invalid team member.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}
		return $post;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function payload( \WP_Post $post ): array {
		$post_id   = (int) $post->ID;
		$thumb_id  = (int) get_post_thumbnail_id( $post_id );
		$thumb_url = $thumb_id ? (string) wp_get_attachment_image_url( $thumb_id, 'medium' ) : '';
		$resolved  = Resolver::for_post( $post_id );
		$seo       = MetaRepository::get( $post_id );
		$profile   = Meta::get( $post_id );

		return array(
			'id'               => $post_id,
			'title'            => $post->post_title,
			'slug'             => $post->post_name,
			'status'           => $post->post_status,
			'content'          => $post->post_content,
			'link'             => (string) get_permalink( $post_id ),
			'featuredImageId'  => $thumb_id,
			'featuredImageUrl' => $thumb_url,
			'profile'          => $profile,
			'seo'              => Sanitizer::sanitize_entity_meta( $seo ),
			'seoPreview'       => array(
				'title'       => (string) ( $resolved['title'] ?? '' ),
				'description' => (string) ( $resolved['description'] ?? '' ),
				'openGraph'   => is_array( $resolved['openGraph'] ?? null ) ? $resolved['openGraph'] : null,
			),
			'teamUrl'          => admin_url( 'edit.php?post_type=' . ContentType::POST_TYPE ),
			'profilePath'      => '/' . ContentType::REWRITE_SLUG . '/',
		);
	}
}

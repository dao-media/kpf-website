<?php

declare(strict_types=1);

namespace KPF\Core\Pages;

use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Seo\MetaRepository;
use KPF\Core\Seo\Resolver;
use KPF\Core\Seo\Sanitizer;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

final class Rest {
	public const NAMESPACE = 'kpf-pages/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
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
		$post = self::get_page( absint( $request['id'] ) );
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
		$post = self::get_page( absint( $request['id'] ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$post_id = (int) $post->ID;
		$title   = sanitize_text_field( (string) $request->get_param( 'title' ) );
		$slug    = sanitize_title( (string) $request->get_param( 'slug' ) );
		$status  = sanitize_key( (string) $request->get_param( 'status' ) );
		$excerpt = sanitize_textarea_field( (string) $request->get_param( 'excerpt' ) );
		$date    = (string) $request->get_param( 'date' );

		$allowed_statuses = array( 'publish', 'draft', 'pending', 'private', 'future' );
		if ( ! in_array( $status, $allowed_statuses, true ) ) {
			$status = $post->post_status;
		}

		$update = array(
			'ID'           => $post_id,
			'post_title'   => $title,
			'post_name'    => $slug,
			'post_status'  => $status,
			'post_excerpt' => $excerpt,
		);

		if ( '' !== trim( $date ) ) {
			$local = sanitize_text_field( $date );
			if ( preg_match( '/^\d{4}-\d{2}-\d{2}/', $local ) ) {
				$update['post_date']     = $local;
				$update['post_date_gmt'] = get_gmt_from_date( $local );
			}
		}

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

		$seo = $request->get_param( 'seo' );
		MetaRepository::update( $post_id, is_array( $seo ) ? $seo : array() );

		$design_id = absint( $request->get_param( 'designId' ) );
		if ( $design_id > 0 && DesignsContentType::POST_TYPE === get_post_type( $design_id ) ) {
			update_post_meta( $post_id, DesignsMeta::PAGE_DESIGN_META, $design_id );
		} elseif ( 0 === $design_id && null !== $request->get_param( 'designId' ) ) {
			delete_post_meta( $post_id, DesignsMeta::PAGE_DESIGN_META );
		}

		$field_values = $request->get_param( 'fieldValues' );
		$field_values = is_array( $field_values ) ? $field_values : array();
		$schema       = self::field_schema_for_page( $post_id );
		$existing     = DesignsMeta::get_page_fields( $post_id );
		$existing_map = array();
		foreach ( $existing as $row ) {
			$existing_map[ $row['key'] ] = $row['value'];
		}

		$merged = array();
		foreach ( $schema as $field ) {
			$key            = $field['key'];
			$merged[ $key ] = array(
				'key'   => $key,
				'value' => isset( $field_values[ $key ] )
					? (string) $field_values[ $key ]
					: (string) ( $existing_map[ $key ] ?? '' ),
			);
		}
		// Preserve values for keys no longer in the design (hidden, not inventable).
		foreach ( $existing_map as $key => $value ) {
			if ( ! isset( $merged[ $key ] ) ) {
				$merged[ $key ] = array(
					'key'   => $key,
					'value' => $value,
				);
			}
		}

		update_post_meta(
			$post_id,
			DesignsMeta::PAGE_FIELDS_META,
			DesignsMeta::sanitize_fields( array_values( $merged ) )
		);

		$fresh = get_post( $post_id );
		if ( ! $fresh instanceof \WP_Post ) {
			return new WP_Error( 'kpf_page_missing', __( 'Page not found after save.', 'kpf-core' ), array( 'status' => 404 ) );
		}

		return new WP_REST_Response( self::payload( $fresh ), 200 );
	}

	/**
	 * @return \WP_Post|WP_Error
	 */
	private static function get_page( int $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post instanceof \WP_Post || 'page' !== $post->post_type ) {
			return new WP_Error( 'kpf_page_invalid', __( 'Invalid page.', 'kpf-core' ), array( 'status' => 404 ) );
		}
		return $post;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function payload( \WP_Post $post ): array {
		$post_id   = (int) $post->ID;
		$design_id = (int) get_post_meta( $post_id, DesignsMeta::PAGE_DESIGN_META, true );
		$design    = null;
		if ( $design_id > 0 && DesignsContentType::POST_TYPE === get_post_type( $design_id ) ) {
			$design_post = get_post( $design_id );
			$design_data = DesignsMeta::get_design( $design_id );
			$design      = array(
				'id'    => $design_id,
				'title' => $design_post instanceof \WP_Post ? $design_post->post_title : '',
				'html'  => (string) $design_data['html'],
			);
		}

		$schema       = self::field_schema_for_page( $post_id );
		$existing     = DesignsMeta::get_page_fields( $post_id );
		$existing_map = array();
		foreach ( $existing as $row ) {
			$existing_map[ $row['key'] ] = $row['value'];
		}

		$field_values = array();
		foreach ( $schema as $field ) {
			$field_values[ $field['key'] ] = (string) ( $existing_map[ $field['key'] ] ?? '' );
		}

		$thumb_id  = (int) get_post_thumbnail_id( $post_id );
		$thumb_url = $thumb_id ? (string) wp_get_attachment_image_url( $thumb_id, 'medium' ) : '';
		$resolved  = Resolver::for_post( $post_id );
		$seo       = MetaRepository::get( $post_id );

		return array(
			'id'               => $post_id,
			'title'            => $post->post_title,
			'slug'             => $post->post_name,
			'status'           => $post->post_status,
			'date'             => $post->post_date,
			'excerpt'          => $post->post_excerpt,
			'link'             => (string) get_permalink( $post_id ),
			'featuredImageId'  => $thumb_id,
			'featuredImageUrl' => $thumb_url,
			'seo'              => Sanitizer::sanitize_entity_meta( $seo ),
			'seoPreview'       => array(
				'title'       => (string) ( $resolved['title'] ?? '' ),
				'description' => (string) ( $resolved['description'] ?? '' ),
				'openGraph'   => is_array( $resolved['openGraph'] ?? null ) ? $resolved['openGraph'] : null,
			),
			'designId'         => $design_id,
			'designTitle'      => is_array( $design ) ? (string) $design['title'] : '',
			'hasDesign'        => is_array( $design ) && '' !== trim( (string) $design['html'] ),
			'fieldSchema'      => $schema,
			'fieldValues'      => $field_values,
			'designsUrl'       => admin_url( 'edit.php?post_type=page&page=' . DesignsContentType::MENU_SLUG ),
			'pagesUrl'         => admin_url( 'edit.php?post_type=page' ),
		);
	}

	/**
	 * @return array<int, array{key: string, label: string}>
	 */
	private static function field_schema_for_page( int $page_id ): array {
		$design_id = (int) get_post_meta( $page_id, DesignsMeta::PAGE_DESIGN_META, true );
		if ( $design_id < 1 || DesignsContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return array();
		}

		$design = DesignsMeta::get_design( $design_id );
		return FieldDiscovery::from_html( (string) $design['html'] );
	}
}

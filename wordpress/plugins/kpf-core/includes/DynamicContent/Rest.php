<?php

declare(strict_types=1);

namespace KPF\Core\DynamicContent;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-dynamic/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/catalog',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_catalog' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/tags',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'get_tags' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( self::class, 'update_tags' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);
	}

	public static function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	public static function get_catalog(): WP_REST_Response {
		return new WP_REST_Response( Catalog::get(), 200 );
	}

	public static function get_tags(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'tags'       => Settings::get_tags(),
				'updated_at' => get_option( '_kpf_dynamic_content_tags_updated', null ),
			),
			200
		);
	}

	public static function update_tags( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = array();
		}

		$tags = $params['tags'] ?? $params;
		if ( ! is_array( $tags ) ) {
			return new WP_Error( 'kpf_invalid_tags', __( 'Tags payload must be an array.', 'kpf-core' ), array( 'status' => 400 ) );
		}

		$clean = Settings::update_tags( $tags );
		update_option( '_kpf_dynamic_content_tags_updated', gmdate( 'c' ), false );

		return new WP_REST_Response(
			array(
				'tags'       => $clean,
				'catalog'    => Catalog::get(),
				'updated_at' => get_option( '_kpf_dynamic_content_tags_updated', null ),
			),
			200
		);
	}
}

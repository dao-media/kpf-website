<?php

declare(strict_types=1);

namespace KPF\Core\Design\Tokens;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-design-tokens/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/inventory',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'inventory' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/variable',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'save_variable' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/class',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'save_class' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/update',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'update' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/promote',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'promote' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/registry',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'registry' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);
	}

	public static function inventory(): WP_REST_Response {
		return new WP_REST_Response( Scanner::inventory() );
	}

	public static function registry(): WP_REST_Response {
		return new WP_REST_Response( Registry::get() );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_variable( WP_REST_Request $request ) {
		$result = Sync::upsert_variable( (array) $request->get_json_params() );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( $result );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_class( WP_REST_Request $request ) {
		$result = Sync::upsert_class( (array) $request->get_json_params() );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( $result );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update( WP_REST_Request $request ) {
		$result = Sync::update_detected( (array) $request->get_json_params() );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( $result );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function promote( WP_REST_Request $request ) {
		$result = Sync::promote( (array) $request->get_json_params() );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( $result );
	}
}

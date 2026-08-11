<?php

declare(strict_types=1);

namespace KPF\Core\Design\Icons;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-icons/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/meta',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'meta' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/stylesheet-class',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'save_stylesheet_class' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);
	}

	public static function meta(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'library'       => 'lucide',
				'stylesheetUrl' => admin_url( 'admin.php?page=kpf-stylesheet' ),
				'tokensUrl'     => admin_url( 'admin.php?page=kpf-design-tokens' ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_stylesheet_class( WP_REST_Request $request ) {
		$result = Css::save_class( (array) $request->get_json_params() );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( $result );
	}
}

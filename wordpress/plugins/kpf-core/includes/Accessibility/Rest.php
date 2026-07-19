<?php

declare(strict_types=1);

namespace KPF\Core\Accessibility;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-accessibility/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'get_settings' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( self::class, 'update_settings' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/presets',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_presets' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/apply-preset',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'apply_preset' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/status',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_status' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/public/config',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'public_config' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public static function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	public static function get_settings(): WP_REST_Response {
		return new WP_REST_Response( Settings::get(), 200 );
	}

	public static function update_settings( WP_REST_Request $request ): WP_REST_Response {
		$settings = $request->get_json_params();
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		$settings['preset'] = 'custom';

		return new WP_REST_Response( Settings::update( $settings ), 200 );
	}

	public static function get_presets(): WP_REST_Response {
		$out = array();
		foreach ( Presets::all() as $key => $preset ) {
			$out[ $key ] = array(
				'label'       => $preset['label'],
				'description' => $preset['description'],
			);
		}

		return new WP_REST_Response( $out, 200 );
	}

	public static function apply_preset( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$preset = sanitize_key( (string) $request->get_param( 'preset' ) );
		$known  = array_keys( Presets::all() );

		if ( ! in_array( $preset, $known, true ) ) {
			return new WP_Error(
				'kpf_invalid_preset',
				__( 'Unknown accessibility preset.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$applied = Presets::apply( $preset, Settings::get() );
		return new WP_REST_Response( Settings::update( $applied ), 200 );
	}

	public static function get_status(): WP_REST_Response {
		$settings = Settings::get();

		return new WP_REST_Response(
			array(
				'preset'              => $settings['preset'],
				'skip_link'           => ! empty( $settings['navigation']['skip_link'] ),
				'focus_ring'          => ! empty( $settings['navigation']['focus_ring'] ),
				'route_announcer'     => ! empty( $settings['content']['route_announcer'] ),
				'underline_links'     => ! empty( $settings['content']['underline_links'] ),
				'reduced_motion'      => ! empty( $settings['motion']['honor_prefers_reduced_motion'] ),
				'force_reduce_motion' => ! empty( $settings['motion']['force_reduce_motion'] ),
				'forms_focus'         => ! empty( $settings['forms']['enhanced_focus'] ),
			),
			200
		);
	}

	public static function public_config(): WP_REST_Response {
		$response = new WP_REST_Response( Settings::public_config(), 200 );
		$response->header( 'Cache-Control', 'public, max-age=60' );
		return $response;
	}
}

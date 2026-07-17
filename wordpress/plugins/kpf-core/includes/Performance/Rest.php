<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			'kpf-performance/v1',
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
			'kpf-performance/v1',
			'/presets',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_presets' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			'kpf-performance/v1',
			'/apply-preset',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'apply_preset' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			'kpf-performance/v1',
			'/status',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_status' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			'kpf-performance/v1',
			'/purge',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'purge' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			'kpf-performance/v1',
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
			return new WP_Error( 'kpf_invalid_preset', __( 'Unknown caching preset.', 'kpf-core' ), array( 'status' => 400 ) );
		}

		$applied = Presets::apply( $preset, Settings::get() );
		return new WP_REST_Response( Settings::update( $applied ), 200 );
	}

	public static function get_status(): WP_REST_Response {
		$settings = Settings::get();

		return new WP_REST_Response(
			array(
				'preset'              => $settings['preset'],
				'object_cache'        => wp_using_ext_object_cache(),
				'object_cache_dropin' => file_exists( WP_CONTENT_DIR . '/object-cache.php' ),
				'pages_enabled'       => ! empty( $settings['pages']['enabled'] ),
				'media_enabled'       => ! empty( $settings['media']['enabled'] ),
				'code_enabled'        => ! empty( $settings['code']['enabled'] ),
				'browser_enabled'     => ! empty( $settings['browser']['enabled'] ),
				'cdn_enabled'         => ! empty( $settings['cdn']['enabled'] ),
				'last_purged'         => get_option( 'kpf_performance_last_purged', null ),
			),
			200
		);
	}

	public static function purge( WP_REST_Request $request ): WP_REST_Response {
		$scope = sanitize_key( (string) ( $request->get_param( 'scope' ) ?: 'all' ) );
		$url   = (string) ( $request->get_param( 'url' ) ?: '' );

		$result = Purge::run(
			array(
				'scope' => $scope,
				'url'   => $url,
			)
		);

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * Public subset for the headless frontend / edge layer.
	 */
	public static function public_config(): WP_REST_Response {
		$settings = Settings::get();
		$response = new WP_REST_Response(
			array(
				'preset'  => $settings['preset'],
				'pages'   => array(
					'enabled'                => $settings['pages']['enabled'],
					'ttl'                    => $settings['pages']['ttl'],
					'stale_while_revalidate' => $settings['pages']['stale_while_revalidate'],
					'graphql_ttl'            => $settings['pages']['graphql_ttl'],
					'rest_ttl'               => $settings['pages']['rest_ttl'],
					'exclude_paths'          => $settings['pages']['exclude_paths'],
				),
				'media'   => array(
					'enabled'           => $settings['media']['enabled'],
					'browser_ttl'       => $settings['media']['browser_ttl'],
					'lazy_load'         => $settings['media']['lazy_load'],
					'prefer_webp'       => $settings['media']['prefer_webp'],
					'prefer_avif'       => $settings['media']['prefer_avif'],
					'responsive_images' => $settings['media']['responsive_images'],
					'cdn_url'           => $settings['media']['cdn_url'],
				),
				'code'    => array(
					'enabled'            => $settings['code']['enabled'],
					'defer_js'           => $settings['code']['defer_js'],
					'delay_js'           => $settings['code']['delay_js'],
					'preload_fonts'      => $settings['code']['preload_fonts'],
					'prefetch_dns'       => $settings['code']['prefetch_dns'],
					'dns_prefetch_hosts' => $settings['code']['dns_prefetch_hosts'],
					'browser_ttl'        => $settings['code']['browser_ttl'],
				),
				'browser' => array(
					'enabled'   => $settings['browser']['enabled'],
					'html_ttl'  => $settings['browser']['html_ttl'],
					'static_ttl'=> $settings['browser']['static_ttl'],
					'api_ttl'   => $settings['browser']['api_ttl'],
				),
				'cdn'     => array(
					'enabled'  => $settings['cdn']['enabled'],
					'provider' => $settings['cdn']['provider'],
					'edge_ttl' => $settings['cdn']['edge_ttl'],
				),
			),
			200
		);

		$ttl = max( 30, (int) ( $settings['pages']['rest_ttl'] ?? 60 ) );
		$response->header( 'Cache-Control', 'public, max-age=' . $ttl );

		return $response;
	}
}

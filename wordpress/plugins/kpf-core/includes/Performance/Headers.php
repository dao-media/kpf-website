<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

/**
 * Applies Cache-Control and related headers based on Performance settings.
 */
final class Headers {
	public static function register(): void {
		add_filter( 'rest_post_dispatch', array( self::class, 'rest_headers' ), 20, 3 );
		add_action( 'send_headers', array( self::class, 'send_html_headers' ) );
	}

	/**
	 * @param mixed            $result
	 * @param \WP_REST_Server  $server
	 * @param \WP_REST_Request $request
	 * @return mixed
	 */
	public static function rest_headers( $result, $server, $request ) {
		unset( $server );

		if ( ! ( $result instanceof \WP_REST_Response ) ) {
			return $result;
		}

		if ( ! in_array( strtoupper( (string) $request->get_method() ), array( 'GET', 'HEAD' ), true ) ) {
			$result->header( 'Cache-Control', 'no-store' );
			return $result;
		}

		$settings = Settings::get();
		if ( empty( $settings['browser']['enabled'] ) && empty( $settings['pages']['enabled'] ) ) {
			return $result;
		}

		$route = (string) $request->get_route();
		$ttl   = (int) ( $settings['pages']['rest_ttl'] ?? $settings['browser']['api_ttl'] ?? 0 );

		if ( str_contains( $route, '/graphql' ) || str_contains( $route, 'graphql' ) ) {
			$ttl = (int) ( $settings['pages']['graphql_ttl'] ?? $ttl );
		}

		if ( $ttl <= 0 ) {
			return $result;
		}

		$swr     = (int) ( $settings['pages']['stale_while_revalidate'] ?? 0 );
		$control = 'public, max-age=' . $ttl;
		if ( $swr > 0 ) {
			$control .= ', stale-while-revalidate=' . $swr;
		}

		$result->header( 'Cache-Control', $control );

		if ( ! empty( $settings['advanced']['debug_headers'] ) ) {
			$result->header( 'X-KPF-Cache', 'rest;ttl=' . $ttl );
		}

		return $result;
	}

	public static function send_html_headers(): void {
		if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}

		$settings = Settings::get();
		if ( empty( $settings['browser']['enabled'] ) ) {
			return;
		}

		$ttl = (int) ( $settings['browser']['html_ttl'] ?? 0 );
		if ( $ttl <= 0 ) {
			if ( ! empty( $settings['browser']['html_must_revalidate'] ) ) {
				header( 'Cache-Control: no-cache, must-revalidate' );
			}
			return;
		}

		$parts = array( 'public', 'max-age=' . $ttl );
		if ( ! empty( $settings['browser']['html_must_revalidate'] ) ) {
			$parts[] = 'must-revalidate';
		}

		header( 'Cache-Control: ' . implode( ', ', $parts ) );

		if ( ! empty( $settings['browser']['vary_encoding'] ) ) {
			header( 'Vary: Accept-Encoding', false );
		}

		if ( ! empty( $settings['advanced']['debug_headers'] ) ) {
			header( 'X-KPF-Cache: html;ttl=' . $ttl );
		}
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

/**
 * Applies Cache-Control and related headers based on Performance settings.
 */
final class Headers {
	/** Public kpf-* REST routes that may keep a CDN/browser TTL. */
	private const PUBLIC_KPF_PREFIXES = array(
		'/kpf-stylesheet/v1/public',
		'/kpf-performance/v1/public',
		'/kpf-accessibility/v1/public',
		'/kpf-seo/v1/public',
	);

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

		if ( self::must_not_public_cache( $result, $request ) ) {
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

		if ( is_user_logged_in() ) {
			header( 'Cache-Control: private, no-store' );
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

	/**
	 * Authenticated, error, admin-namespace, or excluded REST must never be public.
	 */
	public static function must_not_public_cache( \WP_REST_Response $result, \WP_REST_Request $request ): bool {
		$status = (int) $result->get_status();
		if ( $status < 200 || $status >= 400 ) {
			return true;
		}

		if ( is_user_logged_in() ) {
			return true;
		}

		$auth = (string) $request->get_header( 'authorization' );
		if ( '' !== $auth ) {
			return true;
		}

		$nonce = (string) $request->get_header( 'x-wp-nonce' );
		if ( '' !== $nonce ) {
			return true;
		}

		$route = (string) $request->get_route();
		if ( self::is_kpf_admin_route( $route ) ) {
			return true;
		}

		return self::is_excluded_rest_path( $route, Settings::get() );
	}

	public static function is_kpf_admin_route( string $route ): bool {
		if ( ! str_starts_with( $route, '/kpf-' ) ) {
			return false;
		}

		foreach ( self::PUBLIC_KPF_PREFIXES as $prefix ) {
			if ( $route === $prefix || str_starts_with( $route, $prefix . '/' ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @param array<string, mixed> $settings
	 */
	public static function is_excluded_rest_path( string $route, array $settings ): bool {
		$raw = (string) ( $settings['pages']['exclude_paths'] ?? '' );
		if ( '' === trim( $raw ) ) {
			return false;
		}

		$candidates = array(
			$route,
			'/wp-json' . $route,
			'/wp-json/' . ltrim( $route, '/' ),
		);

		foreach ( preg_split( '/\r\n|\r|\n/', $raw ) ?: array() as $line ) {
			$pattern = trim( (string) $line );
			if ( '' === $pattern || str_starts_with( $pattern, '#' ) ) {
				continue;
			}

			foreach ( $candidates as $candidate ) {
				if ( self::path_matches( $pattern, $candidate ) ) {
					return true;
				}
			}
		}

		return false;
	}

	private static function path_matches( string $pattern, string $path ): bool {
		if ( function_exists( 'fnmatch' ) && fnmatch( $pattern, $path ) ) {
			return true;
		}

		if ( str_ends_with( $pattern, '*' ) ) {
			$prefix = substr( $pattern, 0, -1 );
			return str_starts_with( $path, $prefix );
		}

		if ( str_ends_with( $pattern, '/' ) ) {
			return $path === rtrim( $pattern, '/' ) || str_starts_with( $path, $pattern );
		}

		return $path === $pattern || str_starts_with( $path, $pattern . '/' );
	}
}

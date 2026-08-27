<?php
/**
 * Plugin Name: KPF Admin Host
 * Description: Keep wp-admin on admin.kevinpopkefoundation.org. Public “home” stays the root domain.
 */

if ( ! defined( 'ABSPATH' ) && 'cli' !== PHP_SAPI ) {
	exit;
}

if ( ! defined( 'KPF_ADMIN_HOST' ) ) {
	define( 'KPF_ADMIN_HOST', 'admin.kevinpopkefoundation.org' );
	define( 'KPF_ADMIN_ORIGIN', 'https://admin.kevinpopkefoundation.org' );
	define( 'KPF_PUBLIC_ORIGIN', 'https://kevinpopkefoundation.org' );
	define( 'KPF_LEGACY_CMS_HOST', 'kpf.dreamhosters.com' );
}

if ( ! function_exists( 'kpf_admin_host_is_vanity' ) ) {
	/**
	 * True when this request is the public admin hostname (direct or proxied).
	 */
	function kpf_admin_host_is_vanity(): bool {
		if ( '1' === (string) ( $_SERVER['HTTP_X_KPF_ADMIN_HOST'] ?? '' ) ) {
			return true;
		}

		$candidates = array(
			$_SERVER['HTTP_X_FORWARDED_HOST'] ?? '',
			$_SERVER['HTTP_HOST'] ?? '',
		);

		foreach ( $candidates as $raw ) {
			$host = kpf_admin_host_normalize( (string) $raw );
			if ( KPF_ADMIN_HOST === $host ) {
				return true;
			}
		}

		return false;
	}

	function kpf_admin_host_normalize( string $raw ): string {
		$host = strtolower( (string) preg_replace( '/:\d+$/', '', explode( ',', $raw )[0] ) );

		return $host;
	}

	function kpf_admin_host_is_cms_front_host( string $host ): bool {
		$host = kpf_admin_host_normalize( $host );

		return KPF_ADMIN_HOST === $host || KPF_LEGACY_CMS_HOST === $host;
	}

	function kpf_admin_host_is_cms_path( string $path ): bool {
		$path = '' === $path ? '/' : $path;

		return (bool) preg_match(
			'#^/(wp-admin|wp-login\.php|wp-cron\.php|xmlrpc\.php|wp-json|graphql)#',
			$path
		);
	}

	/**
	 * WordPress `home` is the public site. Never the CMS vanity or DreamHost host.
	 *
	 * @param mixed $current Current option value, or false from pre_option.
	 * @return mixed
	 */
	function kpf_admin_host_resolve_home( $current, bool $vanity ) {
		if ( $vanity ) {
			return KPF_PUBLIC_ORIGIN;
		}

		if ( ! is_string( $current ) || '' === $current ) {
			return $current;
		}

		$host = strtolower( (string) parse_url( $current, PHP_URL_HOST ) );
		if ( kpf_admin_host_is_cms_front_host( $host ) ) {
			return KPF_PUBLIC_ORIGIN;
		}

		return $current;
	}

	/**
	 * WordPress `siteurl` is the CMS origin (wp-admin, login, REST).
	 *
	 * @param mixed $current Current option value, or false from pre_option.
	 * @return mixed
	 */
	function kpf_admin_host_resolve_siteurl( $current, bool $vanity ) {
		return $vanity ? KPF_ADMIN_ORIGIN : $current;
	}

	/**
	 * DreamHost origin stays for CMS paths; public paths go to the root domain.
	 */
	function kpf_admin_host_rewrite_redirect( string $location, bool $vanity ): string {
		if ( ! $vanity ) {
			return $location;
		}

		$host = kpf_admin_host_normalize( (string) ( parse_url( $location, PHP_URL_HOST ) ?: '' ) );
		if ( KPF_LEGACY_CMS_HOST !== $host ) {
			return $location;
		}

		$path   = (string) ( parse_url( $location, PHP_URL_PATH ) ?: '/' );
		$origin = kpf_admin_host_is_cms_path( $path ) ? KPF_ADMIN_ORIGIN : KPF_PUBLIC_ORIGIN;

		return str_replace( 'https://kpf.dreamhosters.com', $origin, $location );
	}

	/**
	 * REST must live on siteurl (CMS), never home (public Faust host).
	 * home ≠ siteurl on vanity admin and whenever option_home is forced public.
	 *
	 * @param mixed $url REST URL.
	 * @return mixed
	 */
	function kpf_admin_host_fix_rest_url( $url ) {
		if ( ! is_string( $url ) || '' === $url ) {
			return $url;
		}

		$home = home_url( '/' );
		$site = site_url( '/' );
		if ( ! is_string( $home ) || ! is_string( $site ) || $home === $site ) {
			return $url;
		}

		$home_origin = untrailingslashit( $home );
		$site_origin = untrailingslashit( $site );
		if ( str_starts_with( $url, $home_origin ) ) {
			return $site_origin . substr( $url, strlen( $home_origin ) );
		}

		if ( str_starts_with( $url, KPF_PUBLIC_ORIGIN ) ) {
			return $site_origin . substr( $url, strlen( KPF_PUBLIC_ORIGIN ) );
		}

		return $url;
	}
}

if ( function_exists( 'add_filter' ) ) {
	if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST && ( ! defined( 'WP_CLI' ) || ! WP_CLI ) ) {
		status_header( 403 );
		header( 'Content-Type: text/plain; charset=UTF-8' );
		header( 'X-Content-Type-Options: nosniff' );
		echo 'XML-RPC is disabled.';
		exit;
	}
	if ( 'cli' !== PHP_SAPI && kpf_admin_host_is_vanity() ) {
		$_SERVER['HTTP_HOST']      = KPF_ADMIN_HOST;
		$_SERVER['HTTPS']          = 'on';
		$_SERVER['SERVER_PORT']    = '443';
		$_SERVER['REQUEST_SCHEME'] = 'https';
	}

	add_filter( 'xmlrpc_enabled', '__return_false' );
	add_filter( 'xmlrpc_methods', '__return_empty_array' );

	add_filter(
		'pre_option_home',
		static function ( $value ) {
			return kpf_admin_host_resolve_home( $value, kpf_admin_host_is_vanity() );
		}
	);

	add_filter(
		'option_home',
		static function ( $home ) {
			$resolved = kpf_admin_host_resolve_home( $home, kpf_admin_host_is_vanity() );

			return is_string( $resolved ) ? $resolved : $home;
		}
	);

	add_filter(
		'pre_option_siteurl',
		static function ( $value ) {
			return kpf_admin_host_resolve_siteurl( $value, kpf_admin_host_is_vanity() );
		}
	);

	add_filter(
		'option_siteurl',
		static function ( $siteurl ) {
			$resolved = kpf_admin_host_resolve_siteurl( $siteurl, kpf_admin_host_is_vanity() );

			return is_string( $resolved ) ? $resolved : $siteurl;
		}
	);

	add_filter(
		'allowed_redirect_hosts',
		static function ( $hosts ) {
			$hosts[] = KPF_ADMIN_HOST;
			$hosts[] = 'kevinpopkefoundation.org';
			$hosts[] = 'www.kevinpopkefoundation.org';

			return array_values( array_unique( array_filter( $hosts ) ) );
		}
	);

	add_filter(
		'wp_redirect',
		static function ( $location ) {
			if ( ! kpf_admin_host_is_vanity() || ! is_string( $location ) ) {
				return $location;
			}

			return kpf_admin_host_rewrite_redirect( $location, true );
		},
		1
	);

	add_filter( 'rest_url', 'kpf_admin_host_fix_rest_url', 10, 1 );
}

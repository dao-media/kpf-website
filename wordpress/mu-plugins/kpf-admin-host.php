<?php
/**
 * Plugin Name: KPF Admin Host
 * Description: Keep WordPress URLs and cookies on admin.kevinpopkefoundation.org when Vercel proxies that host.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const KPF_ADMIN_HOST   = 'admin.kevinpopkefoundation.org';
const KPF_ADMIN_ORIGIN = 'https://admin.kevinpopkefoundation.org';

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
		$host = strtolower( (string) preg_replace( '/:\d+$/', '', explode( ',', (string) $raw )[0] ) );
		if ( KPF_ADMIN_HOST === $host ) {
			return true;
		}
	}

	return false;
}

if ( 'cli' !== PHP_SAPI && kpf_admin_host_is_vanity() ) {
	$_SERVER['HTTP_HOST']      = KPF_ADMIN_HOST;
	$_SERVER['HTTPS']          = 'on';
	$_SERVER['SERVER_PORT']    = '443';
	$_SERVER['REQUEST_SCHEME'] = 'https';
}

add_filter(
	'pre_option_home',
	static function ( $value ) {
		return kpf_admin_host_is_vanity() ? KPF_ADMIN_ORIGIN : $value;
	}
);

add_filter(
	'pre_option_siteurl',
	static function ( $value ) {
		return kpf_admin_host_is_vanity() ? KPF_ADMIN_ORIGIN : $value;
	}
);

add_filter(
	'allowed_redirect_hosts',
	static function ( $hosts ) {
		$hosts[] = KPF_ADMIN_HOST;
		return $hosts;
	}
);

add_filter(
	'wp_redirect',
	static function ( $location ) {
		if ( ! kpf_admin_host_is_vanity() || ! is_string( $location ) ) {
			return $location;
		}

		return str_replace( 'https://kpf.dreamhosters.com', KPF_ADMIN_ORIGIN, $location );
	},
	1
);

<?php

declare(strict_types=1);

namespace KPF\Core\Security;

/**
 * XML-RPC is unused on this headless install. Turn it off and drop the
 * discovery links so scanners do not treat xmlrpc.php as a live API.
 */
final class Xmlrpc {
	public static function register(): void {
		if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST && ( ! defined( 'WP_CLI' ) || ! WP_CLI ) ) {
			self::forbid();
		}

		add_filter( 'xmlrpc_enabled', '__return_false' );
		add_filter( 'xmlrpc_methods', '__return_empty_array' );
		add_filter( 'pings_open', '__return_false' );
		add_action( 'xmlrpc_call', array( self::class, 'forbid' ), 0 );
		add_action( 'init', array( self::class, 'strip_discovery' ), 0 );
	}

	public static function forbid(): void {
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return;
		}

		status_header( 403 );
		header( 'Content-Type: text/plain; charset=UTF-8' );
		header( 'X-Content-Type-Options: nosniff' );
		echo 'XML-RPC is disabled.';
		exit;
	}

	public static function strip_discovery(): void {
		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'wlwmanifest_link' );
	}
}

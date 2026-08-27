<?php

declare(strict_types=1);

namespace KPF\Core\Security;

/**
 * XML-RPC is unused on this headless install. Turn it off and drop the
 * discovery links so scanners do not treat xmlrpc.php as a live API.
 */
final class Xmlrpc {
	public static function register(): void {
		add_filter( 'xmlrpc_enabled', '__return_false' );
		add_filter( 'xmlrpc_methods', '__return_empty_array' );
		add_action( 'init', array( self::class, 'strip_discovery' ), 0 );
	}

	public static function strip_discovery(): void {
		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'wlwmanifest_link' );
	}
}

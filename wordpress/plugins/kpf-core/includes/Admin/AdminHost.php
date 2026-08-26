<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

/**
 * admin.kevinpopkefoundation.org is the CMS hostname. Keep wp-admin on that
 * host; send the rest of the hostname to the login screen instead of Faust.
 */
final class AdminHost {
	public const HOST   = 'admin.kevinpopkefoundation.org';
	public const LOGIN  = 'https://admin.kevinpopkefoundation.org/wp-admin/';

	public static function register(): void {
		self::maybe_redirect();
	}

	public static function is_admin_host( ?string $host ): bool {
		$host = strtolower( (string) preg_replace( '/:\d+$/', '', (string) $host ) );

		return self::HOST === $host;
	}

	public static function maybe_redirect(): void {
		if ( 'cli' === PHP_SAPI ) {
			return;
		}

		$forwarded = isset( $_SERVER['HTTP_X_FORWARDED_HOST'] ) ? (string) $_SERVER['HTTP_X_FORWARDED_HOST'] : '';
		$host      = isset( $_SERVER['HTTP_HOST'] ) ? (string) $_SERVER['HTTP_HOST'] : '';
		$forwarded = strtolower( (string) preg_replace( '/:\d+$/', '', explode( ',', $forwarded )[0] ) );
		if ( ! self::is_admin_host( $host ) && ! self::is_admin_host( $forwarded ) ) {
			return;
		}

		$path = (string) ( parse_url( (string) ( $_SERVER['REQUEST_URI'] ?? '/' ), PHP_URL_PATH ) ?: '/' );
		if ( self::is_cms_path( $path ) ) {
			return;
		}

		if ( headers_sent() ) {
			return;
		}

		header( 'Location: ' . self::LOGIN, true, 302 );
		exit;
	}

	private static function is_cms_path( string $path ): bool {
		return (bool) preg_match(
			'#^/(wp-admin|wp-login\.php|wp-cron\.php|xmlrpc\.php|wp-json|graphql|index\.php)#',
			$path
		);
	}
}

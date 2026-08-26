<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

/**
 * admin.kevinpopkefoundation.org is the CMS hostname. Keep wp-admin on that
 * host; send the rest of the hostname to the login screen instead of Faust.
 */
final class AdminHost {
	public const HOST   = 'admin.kevinpopkefoundation.org';
	public const ORIGIN = 'https://admin.kevinpopkefoundation.org';
	public const LOGIN  = 'https://admin.kevinpopkefoundation.org/wp-admin/';
	public const LEGACY_HOST = 'kpf.dreamhosters.com';

	public static function register(): void {
		self::maybe_redirect();
	}

	public static function is_admin_host( ?string $host ): bool {
		return self::HOST === self::normalize_host( $host );
	}

	public static function is_legacy_cms_host( ?string $host ): bool {
		return self::LEGACY_HOST === self::normalize_host( $host );
	}

	public static function is_proxied_vanity_request(): bool {
		if ( '1' === (string) ( $_SERVER['HTTP_X_KPF_ADMIN_HOST'] ?? '' ) ) {
			return true;
		}

		$forwarded = isset( $_SERVER['HTTP_X_FORWARDED_HOST'] ) ? (string) $_SERVER['HTTP_X_FORWARDED_HOST'] : '';

		return self::is_admin_host( explode( ',', $forwarded )[0] );
	}

	public static function should_redirect_legacy_admin( string $host, string $path, bool $proxied ): bool {
		if ( $proxied || ! self::is_legacy_cms_host( $host ) ) {
			return false;
		}

		return (bool) preg_match( '#^/(wp-admin|wp-login\.php)#', $path );
	}

	public static function maybe_redirect(): void {
		if ( 'cli' === PHP_SAPI ) {
			return;
		}

		$host    = isset( $_SERVER['HTTP_HOST'] ) ? (string) $_SERVER['HTTP_HOST'] : '';
		$path    = (string) ( parse_url( (string) ( $_SERVER['REQUEST_URI'] ?? '/' ), PHP_URL_PATH ) ?: '/' );
		$proxied = self::is_proxied_vanity_request();

		if ( self::should_redirect_legacy_admin( $host, $path, $proxied ) ) {
			if ( headers_sent() ) {
				return;
			}

			$uri = (string) ( $_SERVER['REQUEST_URI'] ?? '/wp-admin/' );
			header( 'Location: ' . self::ORIGIN . $uri, true, 301 );
			exit;
		}

		if ( ! self::is_admin_host( $host ) && ! $proxied ) {
			return;
		}

		if ( self::is_cms_path( $path ) ) {
			return;
		}

		if ( headers_sent() ) {
			return;
		}

		header( 'Location: ' . self::LOGIN, true, 302 );
		exit;
	}

	public static function normalize_host( ?string $host ): string {
		$host = strtolower( (string) explode( ',', (string) $host )[0] );

		return (string) preg_replace( '/:\d+$/', '', $host );
	}

	private static function is_cms_path( string $path ): bool {
		return (bool) preg_match(
			'#^/(wp-admin|wp-login\.php|wp-cron\.php|xmlrpc\.php|wp-json|graphql|index\.php)#',
			$path
		);
	}
}

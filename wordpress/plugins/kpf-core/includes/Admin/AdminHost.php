<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

/**
 * admin.kevinpopkefoundation.org is the CMS hostname in DNS, but Faust sends
 * the WordPress homepage to the public frontend. Send this host to DreamHost
 * wp-admin instead of kpf-site.vercel.app.
 */
final class AdminHost {
	public const HOST   = 'admin.kevinpopkefoundation.org';
	public const TARGET = 'https://kpf.dreamhosters.com/wp-admin/';

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

		$host = isset( $_SERVER['HTTP_HOST'] ) ? (string) $_SERVER['HTTP_HOST'] : '';
		if ( ! self::is_admin_host( $host ) ) {
			return;
		}

		if ( headers_sent() ) {
			return;
		}

		header( 'Location: ' . self::TARGET, true, 301 );
		exit;
	}
}

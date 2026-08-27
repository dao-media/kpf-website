<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

/**
 * admin.kevinpopkefoundation.org is the CMS hostname. Keep wp-admin on that
 * host; send the rest of the hostname to the login screen instead of Faust.
 *
 * WordPress `home` (Visit Site, permalinks) is the public root domain.
 * `siteurl` stays the CMS origin.
 */
final class AdminHost {
	public const HOST          = 'admin.kevinpopkefoundation.org';
	public const ORIGIN        = 'https://admin.kevinpopkefoundation.org';
	public const LOGIN         = 'https://admin.kevinpopkefoundation.org/wp-admin/';
	public const LEGACY_HOST   = 'kpf.dreamhosters.com';
	public const PUBLIC_ORIGIN = 'https://kevinpopkefoundation.org';

	public static function register(): void {
		self::maybe_redirect();
		if ( function_exists( 'add_action' ) ) {
			add_action( 'admin_bar_menu', array( self::class, 'rewrite_visit_site' ), 9999 );
		}
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

	public static function is_cms_front_host( ?string $host ): bool {
		$host = self::normalize_host( $host );

		return self::HOST === $host || self::LEGACY_HOST === $host;
	}

	public static function is_cms_path( string $path ): bool {
		$path = '' === $path ? '/' : $path;

		return (bool) preg_match(
			'#^/(wp-admin|wp-login\.php|wp-cron\.php|xmlrpc\.php|wp-json|graphql|index\.php)#',
			$path
		);
	}

	public static function href_is_cms_front( string $href ): bool {
		$parts = parse_url( $href );
		if ( ! is_array( $parts ) ) {
			return false;
		}

		$host = self::normalize_host( isset( $parts['host'] ) ? (string) $parts['host'] : '' );
		if ( ! self::is_cms_front_host( $host ) ) {
			return false;
		}

		$path = (string) ( $parts['path'] ?? '/' );
		if ( '' === $path ) {
			$path = '/';
		}

		return ! self::is_cms_path( $path );
	}

	public static function rewrite_href_to_public( string $href ): string {
		if ( ! self::href_is_cms_front( $href ) ) {
			return $href;
		}

		$parts = parse_url( $href );
		$path  = (string) ( is_array( $parts ) ? ( $parts['path'] ?? '/' ) : '/' );
		if ( '' === $path ) {
			$path = '/';
		}

		$next = self::PUBLIC_ORIGIN . $path;
		if ( is_array( $parts ) && ! empty( $parts['query'] ) ) {
			$next .= '?' . $parts['query'];
		}
		if ( is_array( $parts ) && ! empty( $parts['fragment'] ) ) {
			$next .= '#' . $parts['fragment'];
		}

		return $next;
	}

	public static function visit_site_href(): string {
		if ( class_exists( \KPF\Core\Support\FrontendUrl::class ) && function_exists( 'trailingslashit' ) ) {
			return \KPF\Core\Support\FrontendUrl::base();
		}

		return self::PUBLIC_ORIGIN . '/';
	}

	/**
	 * Force admin-bar Visit Site / site name onto the public origin.
	 *
	 * @param \WP_Admin_Bar $bar Admin bar.
	 */
	public static function rewrite_visit_site( $bar ): void {
		if ( ! is_object( $bar ) || ! method_exists( $bar, 'get_node' ) || ! method_exists( $bar, 'add_node' ) ) {
			return;
		}

		$home = self::visit_site_href();
		foreach ( array( 'site-name', 'view-site' ) as $id ) {
			$node = $bar->get_node( $id );
			if ( ! is_object( $node ) ) {
				continue;
			}

			$node->href = $home;
			$bar->add_node( (array) $node );
		}

		if ( ! method_exists( $bar, 'get_nodes' ) ) {
			return;
		}

		$nodes = $bar->get_nodes();
		if ( ! is_array( $nodes ) ) {
			return;
		}

		foreach ( $nodes as $node ) {
			if ( ! is_object( $node ) || empty( $node->href ) ) {
				continue;
			}

			$id = isset( $node->id ) ? (string) $node->id : '';
			if ( in_array( $id, array( 'site-name', 'view-site' ), true ) ) {
				continue;
			}

			$next = self::rewrite_href_to_public( (string) $node->href );
			if ( $next === $node->href ) {
				continue;
			}

			$node->href = $next;
			$bar->add_node( (array) $node );
		}
	}
}

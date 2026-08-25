<?php

declare(strict_types=1);

namespace KPF\Core\Support;

/**
 * Resolves the public headless frontend origin (Faust / Next).
 *
 * Canonicals, sitemaps, and schema must use the custom domain. Faust's
 * frontend_uri and the SEO frontend_url field often still hold a Vercel
 * project or preview host — those stay noindexed and must not leak.
 */
final class FrontendUrl {
	public const PRODUCTION_ORIGIN = 'https://kevinpopkefoundation.org';

	public static function base(): string {
		return trailingslashit( self::public_origin() );
	}

	public static function public_origin(): string {
		foreach ( self::candidates() as $url ) {
			if ( '' === $url || self::is_ephemeral( $url ) ) {
				continue;
			}

			return untrailingslashit( $url );
		}

		return self::PRODUCTION_ORIGIN;
	}

	/**
	 * Rewrite an absolute URL onto the public origin when the host is ephemeral.
	 */
	public static function to_public( string $url ): string {
		$url = trim( $url );
		if ( '' === $url ) {
			return '';
		}

		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) ) {
			return $url;
		}

		$host = strtolower( (string) ( $parts['host'] ?? '' ) );
		if ( '' !== $host && ! self::is_ephemeral_host( $host ) ) {
			return $url;
		}

		$path  = (string) ( $parts['path'] ?? '/' );
		$query = (string) ( $parts['query'] ?? '' );
		$frag  = (string) ( $parts['fragment'] ?? '' );
		if ( '' === $path ) {
			$path = '/';
		}

		$next = self::public_origin() . $path;
		if ( '' !== $query ) {
			$next .= '?' . $query;
		}
		if ( '' !== $frag ) {
			$next .= '#' . $frag;
		}

		return $next;
	}

	public static function is_ephemeral( string $url ): bool {
		$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );

		return '' === $host || self::is_ephemeral_host( $host );
	}

	public static function is_ephemeral_host( string $host ): bool {
		$host = strtolower( $host );
		if ( in_array( $host, array( 'localhost', '127.0.0.1' ), true ) ) {
			return true;
		}

		return 'vercel.app' === $host || substr( $host, -11 ) === '.vercel.app';
	}

	public static function faust_uri(): string {
		if ( function_exists( 'WPE\\FaustWP\\Settings\\faustwp_get_setting' ) ) {
			return untrailingslashit( (string) \WPE\FaustWP\Settings\faustwp_get_setting( 'frontend_uri', '' ) );
		}

		$settings = get_option( 'faustwp_settings', array() );
		if ( ! is_array( $settings ) ) {
			return '';
		}

		return untrailingslashit( (string) ( $settings['frontend_uri'] ?? '' ) );
	}

	/**
	 * @return array<int, string>
	 */
	private static function candidates(): array {
		$urls = array();

		if ( class_exists( '\KPF\Core\Seo\Settings' ) ) {
			$seo    = \KPF\Core\Seo\Settings::get();
			$urls[] = (string) ( $seo['global']['frontend_url'] ?? '' );
		}

		$urls[] = self::faust_uri();
		$urls[] = self::PRODUCTION_ORIGIN;

		return $urls;
	}
}

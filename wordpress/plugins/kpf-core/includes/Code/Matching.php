<?php

declare(strict_types=1);

namespace KPF\Core\Code;

final class Matching {
	/**
	 * Normalize a request path for comparison.
	 */
	public static function normalize_path( string $path ): string {
		$path = trim( $path );
		if ( '' === $path ) {
			return '/';
		}

		// Strip scheme + host if a full URL was provided.
		if ( preg_match( '#^https?://#i', $path ) ) {
			$parts = wp_parse_url( $path );
			$path  = is_array( $parts ) ? (string) ( $parts['path'] ?? '/' ) : '/';
		}

		$path = '/' . ltrim( $path, '/' );
		if ( '/' !== $path ) {
			$path = untrailingslashit( $path );
		}

		return $path ?: '/';
	}

	/**
	 * @param array<int, string> $patterns
	 */
	public static function path_matches( string $path, array $patterns ): bool {
		$path = self::normalize_path( $path );
		if ( array() === $patterns ) {
			return false;
		}

		foreach ( $patterns as $pattern ) {
			$pattern = trim( (string) $pattern );
			if ( '' === $pattern ) {
				continue;
			}

			$wildcard = str_ends_with( $pattern, '*' );
			if ( $wildcard ) {
				$pattern = substr( $pattern, 0, -1 );
			}

			$normalized = self::normalize_path( $pattern );
			if ( $wildcard ) {
				if ( '/' === $normalized ) {
					return true;
				}
				if ( $path === $normalized || str_starts_with( $path . '/', $normalized . '/' ) ) {
					return true;
				}
				continue;
			}

			if ( $path === $normalized ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param array<string, mixed> $meta
	 */
	public static function snippet_applies( array $meta, string $path ): bool {
		if ( 'global' === ( $meta['scope'] ?? 'global' ) ) {
			return true;
		}

		$urls = is_array( $meta['urls'] ?? null ) ? $meta['urls'] : array();
		return self::path_matches( $path, $urls );
	}
}

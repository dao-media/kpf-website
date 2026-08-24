<?php

declare(strict_types=1);

namespace KPF\Core\Media;

use KPF\Core\Support\FrontendUrl;

/**
 * Keep public attachment URLs on the WordPress host.
 *
 * Faust rewrites media to the headless frontend URI when
 * "Use the WordPress domain for media URLs" is off. Next does not
 * serve /wp-content/uploads, so GraphQL image fields 404.
 */
final class PublicUrls {
	public static function image_url( int $attachment_id, string $size = 'full' ): string {
		if ( $attachment_id < 1 ) {
			return '';
		}

		$url = (string) wp_get_attachment_image_url( $attachment_id, $size );
		return self::to_wp_host( $url );
	}

	public static function to_wp_host( string $url ): string {
		$url = trim( $url );
		if ( '' === $url ) {
			return '';
		}

		$frontend = untrailingslashit( FrontendUrl::faust_uri() );
		$site     = untrailingslashit( site_url() );
		if ( '' === $frontend || '' === $site || $frontend === $site ) {
			return $url;
		}

		if ( $url === $frontend || str_starts_with( $url, $frontend . '/' ) ) {
			return $site . substr( $url, strlen( $frontend ) );
		}

		return $url;
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Media;

use KPF\Core\Support\FrontendUrl;

/**
 * Keep attachment srcset on the WordPress domain in wp-admin.
 *
 * FaustWP rewrites srcset to the headless frontend URI when
 * "Use the WordPress domain for media URLs" is off. Admin previews then
 * request /wp-content/uploads from Next (e.g. :3010), which does not serve
 * those files — so featured images and list-table logos appear broken
 * (local Faust runs on :3010; see scripts/local-ports.env).
 */
final class AdminSrcset {
	public static function register(): void {
		add_filter( 'wp_calculate_image_srcset', array( self::class, 'restore_wp_urls' ), 20 );
		add_action( 'init', array( self::class, 'ensure_faust_media_domain' ), 5 );
	}

	/**
	 * Apply Faust's default (media on the WP domain) when the setting key is missing.
	 */
	public static function ensure_faust_media_domain(): void {
		if ( ! function_exists( 'WPE\\FaustWP\\Settings\\faustwp_update_setting' ) ) {
			return;
		}

		$settings = get_option( 'faustwp_settings', array() );
		if ( ! is_array( $settings ) || array_key_exists( 'enable_image_source', $settings ) ) {
			return;
		}

		\WPE\FaustWP\Settings\faustwp_update_setting( 'enable_image_source', '1' );
	}

	/**
	 * @param array<int, array{url:string,descriptor:string,value:int}>|false $sources
	 * @return array<int, array{url:string,descriptor:string,value:int}>|false
	 */
	public static function restore_wp_urls( $sources ) {
		if ( ! is_array( $sources ) || ! self::should_restore() ) {
			return $sources;
		}

		return self::rewrite_frontend_urls( $sources );
	}

	/**
	 * @param array<int, array{url:string,descriptor:string,value:int}> $sources
	 * @return array<int, array{url:string,descriptor:string,value:int}>
	 */
	public static function rewrite_frontend_urls( array $sources ): array {
		$frontend = FrontendUrl::faust_uri();
		$site     = untrailingslashit( site_url() );
		if ( '' === $frontend || $frontend === $site ) {
			return $sources;
		}

		foreach ( $sources as $width => $source ) {
			$url = (string) ( $source['url'] ?? '' );
			if ( str_starts_with( $url, $frontend . '/' ) || $url === $frontend ) {
				$sources[ $width ]['url'] = $site . substr( $url, strlen( $frontend ) );
			}
		}

		return $sources;
	}

	private static function should_restore(): bool {
		return is_admin();
	}
}

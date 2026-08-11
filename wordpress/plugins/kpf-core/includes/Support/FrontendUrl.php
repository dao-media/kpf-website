<?php

declare(strict_types=1);

namespace KPF\Core\Support;

/**
 * Resolves the public headless frontend base URL (Faust / Next).
 *
 * Prefer Faust's frontend_uri, then KPF SEO frontend_url, then WordPress home.
 */
final class FrontendUrl {
	public static function base(): string {
		$faust = self::faust_uri();
		if ( '' !== $faust ) {
			return trailingslashit( $faust );
		}

		if ( class_exists( '\KPF\Core\Seo\Settings' ) ) {
			$seo          = \KPF\Core\Seo\Settings::get();
			$seo_frontend = (string) ( $seo['global']['frontend_url'] ?? '' );
			if ( '' !== $seo_frontend ) {
				return trailingslashit( $seo_frontend );
			}
		}

		return trailingslashit( home_url( '/' ) );
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
}

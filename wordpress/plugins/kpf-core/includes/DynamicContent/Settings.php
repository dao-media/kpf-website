<?php

declare(strict_types=1);

namespace KPF\Core\DynamicContent;

/**
 * Site-wide custom dynamic tags (option-backed).
 */
final class Settings {
	public const OPTION_KEY = 'kpf_dynamic_content_tags';
	public const VERSION    = 1;
	public const MAX_TAGS   = 100;

	public static function register(): void {
		add_action(
			'init',
			static function (): void {
				register_setting(
					'kpf_dynamic_content',
					self::OPTION_KEY,
					array(
						'type'              => 'array',
						'default'           => array(),
						'sanitize_callback' => array( Sanitizer::class, 'sanitize_tags' ),
						'show_in_rest'      => false,
					)
				);
			}
		);
	}

	public static function ensure_defaults(): void {
		$current = get_option( self::OPTION_KEY, null );
		if ( null === $current ) {
			update_option( self::OPTION_KEY, array(), false );
		}
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function get_tags(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return Sanitizer::sanitize_tags( $stored );
	}

	/**
	 * @param array<int, mixed> $tags
	 * @return array<int, array<string, mixed>>
	 */
	public static function update_tags( array $tags ): array {
		$clean = Sanitizer::sanitize_tags( $tags );
		update_option( self::OPTION_KEY, $clean, false );
		/**
		 * Fires after site-wide dynamic tags are saved.
		 *
		 * @param array<int, array<string, mixed>> $clean
		 */
		do_action( 'kpf_dynamic_content_tags_updated', $clean );
		return $clean;
	}

	/**
	 * @return array<string, string> key => value for enabled design-exposed tags
	 */
	public static function design_values(): array {
		$out = array();
		foreach ( self::get_tags() as $tag ) {
			if ( empty( $tag['enabled'] ) || empty( $tag['expose_design'] ) ) {
				continue;
			}
			$key = (string) ( $tag['key'] ?? '' );
			if ( $key === '' ) {
				continue;
			}
			$out[ $key ] = (string) ( $tag['value'] ?? '' );
		}
		return $out;
	}

	/**
	 * @return array<string, string> token (without %%) => value for enabled SEO-exposed tags
	 */
	public static function seo_values(): array {
		$out = array();
		foreach ( self::get_tags() as $tag ) {
			if ( empty( $tag['enabled'] ) || empty( $tag['expose_seo'] ) ) {
				continue;
			}
			$key = (string) ( $tag['key'] ?? '' );
			if ( $key === '' ) {
				continue;
			}
			$out[ 'site_' . $key ] = (string) ( $tag['value'] ?? '' );
		}
		return $out;
	}
}

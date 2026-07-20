<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

final class Sanitizer {
	private const PRESETS   = array( 'off', 'light', 'balanced', 'aggressive', 'custom' );
	private const PROVIDERS = array( 'none', 'cloudflare', 'fastly', 'vercel', 'custom' );

	/**
	 * @param mixed $input
	 * @return array<string, mixed>
	 */
	public static function sanitize_settings( $input ): array {
		$defaults = Settings::defaults();
		$input    = is_array( $input ) ? $input : array();

		$pages    = is_array( $input['pages'] ?? null ) ? $input['pages'] : array();
		$media    = is_array( $input['media'] ?? null ) ? $input['media'] : array();
		$code     = is_array( $input['code'] ?? null ) ? $input['code'] : array();
		$browser  = is_array( $input['browser'] ?? null ) ? $input['browser'] : array();
		$cdn      = is_array( $input['cdn'] ?? null ) ? $input['cdn'] : array();
		$advanced = is_array( $input['advanced'] ?? null ) ? $input['advanced'] : array();

		$preset = sanitize_key( (string) ( $input['preset'] ?? 'custom' ) );
		if ( ! in_array( $preset, self::PRESETS, true ) ) {
			$preset = 'custom';
		}

		return array(
			'version'  => Settings::VERSION,
			'preset'   => $preset,
			'pages'    => array(
				'enabled'                => (bool) ( $pages['enabled'] ?? $defaults['pages']['enabled'] ),
				'ttl'                    => self::ttl( $pages['ttl'] ?? $defaults['pages']['ttl'] ),
				'cache_logged_in'        => (bool) ( $pages['cache_logged_in'] ?? false ),
				'cache_query_strings'    => (bool) ( $pages['cache_query_strings'] ?? false ),
				'stale_while_revalidate' => self::ttl( $pages['stale_while_revalidate'] ?? 0 ),
				'exclude_paths'          => self::lines( $pages['exclude_paths'] ?? '' ),
				'graphql_ttl'            => self::ttl( $pages['graphql_ttl'] ?? 0 ),
				'rest_ttl'               => self::ttl( $pages['rest_ttl'] ?? 0 ),
			),
			'media'    => array(
				'enabled'              => (bool) ( $media['enabled'] ?? $defaults['media']['enabled'] ),
				'browser_ttl'          => self::ttl( $media['browser_ttl'] ?? 0 ),
				'lazy_load'            => (bool) ( $media['lazy_load'] ?? false ),
				'lazy_load_native'     => (bool) ( $media['lazy_load_native'] ?? false ),
				'prefer_webp'          => (bool) ( $media['prefer_webp'] ?? false ),
				'prefer_avif'          => (bool) ( $media['prefer_avif'] ?? false ),
				'generate_webp'        => (bool) ( $media['generate_webp'] ?? false ),
				'generate_avif'        => (bool) ( $media['generate_avif'] ?? false ),
				'optimize_on_upload'   => (bool) ( $media['optimize_on_upload'] ?? false ),
				'quality'              => Images::clamp_quality( $media['quality'] ?? 85 ),
				'editor_engine'        => self::editor_engine( $media['editor_engine'] ?? 'auto' ),
				'max_width'            => max( 0, absint( $media['max_width'] ?? 0 ) ),
				'max_height'           => max( 0, absint( $media['max_height'] ?? 0 ) ),
				'big_image_threshold'  => max( 0, absint( $media['big_image_threshold'] ?? 2560 ) ),
				'responsive_images'    => (bool) ( $media['responsive_images'] ?? true ),
				'cdn_url'              => esc_url_raw( (string) ( $media['cdn_url'] ?? '' ) ),
				'strip_exif'           => (bool) ( $media['strip_exif'] ?? false ),
			),
			'code'     => array(
				'enabled'           => (bool) ( $code['enabled'] ?? $defaults['code']['enabled'] ),
				'minify_css'        => (bool) ( $code['minify_css'] ?? false ),
				'minify_js'         => (bool) ( $code['minify_js'] ?? false ),
				'combine_css'       => (bool) ( $code['combine_css'] ?? false ),
				'combine_js'        => (bool) ( $code['combine_js'] ?? false ),
				'defer_js'          => (bool) ( $code['defer_js'] ?? false ),
				'delay_js'          => (bool) ( $code['delay_js'] ?? false ),
				'remove_unused_css' => (bool) ( $code['remove_unused_css'] ?? false ),
				'critical_css'      => (bool) ( $code['critical_css'] ?? false ),
				'preload_fonts'      => (bool) ( $code['preload_fonts'] ?? false ),
				'prefetch_dns'       => (bool) ( $code['prefetch_dns'] ?? false ),
				'dns_prefetch_hosts' => DnsPrefetch::sanitize_hosts( $code['dns_prefetch_hosts'] ?? array() ),
				'browser_ttl'        => self::ttl( $code['browser_ttl'] ?? 0 ),
			),
			'browser'  => array(
				'enabled'              => (bool) ( $browser['enabled'] ?? $defaults['browser']['enabled'] ),
				'html_ttl'             => self::ttl( $browser['html_ttl'] ?? 0 ),
				'html_must_revalidate' => (bool) ( $browser['html_must_revalidate'] ?? true ),
				'static_ttl'           => self::ttl( $browser['static_ttl'] ?? 0 ),
				'api_ttl'              => self::ttl( $browser['api_ttl'] ?? 0 ),
				'etag'                 => (bool) ( $browser['etag'] ?? true ),
				'vary_encoding'        => (bool) ( $browser['vary_encoding'] ?? true ),
			),
			'cdn'      => array(
				'enabled'     => (bool) ( $cdn['enabled'] ?? false ),
				'provider'    => self::provider( $cdn['provider'] ?? 'none' ),
				'purge_url'   => esc_url_raw( (string) ( $cdn['purge_url'] ?? '' ) ),
				'purge_token' => sanitize_text_field( (string) ( $cdn['purge_token'] ?? '' ) ),
				'edge_ttl'    => self::ttl( $cdn['edge_ttl'] ?? 0 ),
			),
			'advanced' => array(
				'object_cache_hint' => (bool) ( $advanced['object_cache_hint'] ?? true ),
				'heartbeat_limit'   => (bool) ( $advanced['heartbeat_limit'] ?? false ),
				'disable_emojis'    => (bool) ( $advanced['disable_emojis'] ?? false ),
				'disable_embeds'    => (bool) ( $advanced['disable_embeds'] ?? false ),
				'limit_revisions'   => min( 100, max( 0, absint( $advanced['limit_revisions'] ?? 0 ) ) ),
				'exclude_cookies'   => self::lines( $advanced['exclude_cookies'] ?? '' ),
				'debug_headers'     => (bool) ( $advanced['debug_headers'] ?? false ),
			),
		);
	}

	/**
	 * @param mixed $value
	 */
	private static function editor_engine( $value ): string {
		$value = sanitize_key( (string) $value );
		return in_array( $value, array( 'auto', 'imagick', 'gd' ), true ) ? $value : 'auto';
	}

	/**
	 * @param mixed $value
	 */
	private static function ttl( $value ): int {
		return max( 0, absint( $value ) );
	}

	/**
	 * @param mixed $value
	 */
	private static function provider( $value ): string {
		$value = sanitize_key( (string) $value );
		return in_array( $value, self::PROVIDERS, true ) ? $value : 'none';
	}

	/**
	 * @param mixed $value
	 */
	private static function lines( $value ): string {
		$text  = sanitize_textarea_field( (string) $value );
		$lines = preg_split( '/\r\n|\r|\n/', $text ) ?: array();
		$clean = array();

		foreach ( $lines as $line ) {
			$line = trim( $line );
			if ( '' === $line || str_starts_with( $line, '#' ) ) {
				continue;
			}
			$clean[] = $line;
		}

		return implode( "\n", array_slice( $clean, 0, 100 ) );
	}
}

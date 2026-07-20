<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

/**
 * Named caching profiles from light → aggressive.
 */
final class Presets {
	/**
	 * @return array<string, array{label:string,description:string,settings:array<string,mixed>}>
	 */
	public static function all(): array {
		return array(
			'off'        => array(
				'label'       => __( 'Off', 'kpf-core' ),
				'description' => __( 'No caching. Best while actively developing or troubleshooting.', 'kpf-core' ),
				'settings'    => self::off(),
			),
			'light'      => array(
				'label'       => __( 'Light', 'kpf-core' ),
				'description' => __( 'Safe browser caching for media and code. Short API TTLs. No aggressive page cache.', 'kpf-core' ),
				'settings'    => self::light(),
			),
			'balanced'   => array(
				'label'       => __( 'Balanced', 'kpf-core' ),
				'description' => __( 'Recommended for most sites. Solid page and API caching with lazy media and deferred scripts.', 'kpf-core' ),
				'settings'    => self::balanced(),
			),
			'aggressive' => array(
				'label'       => __( 'Aggressive', 'kpf-core' ),
				'description' => __( 'Maximum caching and asset optimization. Review exclusions before enabling on production.', 'kpf-core' ),
				'settings'    => self::aggressive(),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function off(): array {
		return array(
			'pages'   => array(
				'enabled'               => false,
				'ttl'                   => 0,
				'cache_logged_in'       => false,
				'cache_query_strings'   => false,
				'stale_while_revalidate'=> 0,
				'exclude_paths'         => "/wp-admin/\n/wp-json/\n/graphql",
				'graphql_ttl'           => 0,
				'rest_ttl'              => 0,
			),
			'media'   => array(
				'enabled'             => false,
				'browser_ttl'         => 0,
				'lazy_load'           => false,
				'lazy_load_native'    => false,
				'prefer_webp'         => false,
				'prefer_avif'         => false,
				'generate_webp'       => false,
				'generate_avif'       => false,
				'optimize_on_upload'  => false,
				'quality'             => 85,
				'editor_engine'       => 'auto',
				'max_width'           => 0,
				'max_height'          => 0,
				'big_image_threshold' => 2560,
				'responsive_images'   => true,
				'cdn_url'             => '',
				'strip_exif'          => false,
			),
			'code'    => array(
				'enabled'          => false,
				'minify_css'       => false,
				'minify_js'        => false,
				'combine_css'      => false,
				'combine_js'       => false,
				'defer_js'         => false,
				'delay_js'         => false,
				'remove_unused_css'=> false,
				'critical_css'     => false,
				'preload_fonts'       => false,
				'prefetch_dns'        => false,
				'dns_prefetch_hosts'  => array(),
				'browser_ttl'         => 0,
			),
			'browser' => array(
				'enabled'              => false,
				'html_ttl'             => 0,
				'html_must_revalidate' => true,
				'static_ttl'           => 0,
				'api_ttl'              => 0,
				'etag'                 => false,
				'vary_encoding'        => true,
			),
			'cdn'     => array(
				'enabled'    => false,
				'provider'   => 'none',
				'purge_url'  => '',
				'purge_token'=> '',
				'edge_ttl'   => 0,
			),
			'advanced'=> array(
				'object_cache_hint' => true,
				'heartbeat_limit'   => false,
				'disable_emojis'    => false,
				'disable_embeds'    => false,
				'limit_revisions'   => 0,
				'exclude_cookies'   => '',
				'debug_headers'     => false,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function light(): array {
		return array(
			'pages'   => array(
				'enabled'               => true,
				'ttl'                   => 300,
				'cache_logged_in'       => false,
				'cache_query_strings'   => false,
				'stale_while_revalidate'=> 600,
				'exclude_paths'         => "/wp-admin/\n/wp-json/kpf-*\n/cart\n/checkout",
				'graphql_ttl'           => 30,
				'rest_ttl'              => 30,
			),
			'media'   => array(
				'enabled'             => true,
				'browser_ttl'         => 604800,
				'lazy_load'           => true,
				'lazy_load_native'    => true,
				'prefer_webp'         => true,
				'prefer_avif'         => false,
				'generate_webp'       => true,
				'generate_avif'       => false,
				'optimize_on_upload'  => true,
				'quality'             => 85,
				'editor_engine'       => 'auto',
				'max_width'           => 2560,
				'max_height'          => 0,
				'big_image_threshold' => 2560,
				'responsive_images'   => true,
				'cdn_url'             => '',
				'strip_exif'          => false,
			),
			'code'    => array(
				'enabled'          => true,
				'minify_css'       => false,
				'minify_js'        => false,
				'combine_css'      => false,
				'combine_js'       => false,
				'defer_js'         => true,
				'delay_js'         => false,
				'remove_unused_css'=> false,
				'critical_css'     => false,
				'preload_fonts'      => true,
				'prefetch_dns'       => true,
				'dns_prefetch_hosts' => DnsPrefetch::default_hosts_for_preset( 'light' ),
				'browser_ttl'        => 86400,
			),
			'browser' => array(
				'enabled'              => true,
				'html_ttl'             => 0,
				'html_must_revalidate' => true,
				'static_ttl'           => 86400,
				'api_ttl'              => 30,
				'etag'                 => true,
				'vary_encoding'        => true,
			),
			'cdn'     => array(
				'enabled'    => false,
				'provider'   => 'none',
				'purge_url'  => '',
				'purge_token'=> '',
				'edge_ttl'   => 3600,
			),
			'advanced'=> array(
				'object_cache_hint' => true,
				'heartbeat_limit'   => true,
				'disable_emojis'    => true,
				'disable_embeds'    => false,
				'limit_revisions'   => 10,
				'exclude_cookies'   => 'wordpress_logged_in_\ncomment_author_',
				'debug_headers'     => false,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function balanced(): array {
		return array(
			'pages'   => array(
				'enabled'               => true,
				'ttl'                   => 3600,
				'cache_logged_in'       => false,
				'cache_query_strings'   => false,
				'stale_while_revalidate'=> 86400,
				'exclude_paths'         => "/wp-admin/\n/wp-login.php\n/cart\n/checkout\n/my-account",
				'graphql_ttl'           => 60,
				'rest_ttl'              => 60,
			),
			'media'   => array(
				'enabled'             => true,
				'browser_ttl'         => 2592000,
				'lazy_load'           => true,
				'lazy_load_native'    => true,
				'prefer_webp'         => true,
				'prefer_avif'         => false,
				'generate_webp'       => true,
				'generate_avif'       => false,
				'optimize_on_upload'  => true,
				'quality'             => 85,
				'editor_engine'       => 'auto',
				'max_width'           => 2560,
				'max_height'          => 0,
				'big_image_threshold' => 2560,
				'responsive_images'   => true,
				'cdn_url'             => '',
				'strip_exif'          => true,
			),
			'code'    => array(
				'enabled'          => true,
				'minify_css'       => true,
				'minify_js'        => true,
				'combine_css'      => false,
				'combine_js'       => false,
				'defer_js'         => true,
				'delay_js'         => false,
				'remove_unused_css'=> false,
				'critical_css'     => false,
				'preload_fonts'      => true,
				'prefetch_dns'       => true,
				'dns_prefetch_hosts' => DnsPrefetch::default_hosts_for_preset( 'balanced' ),
				'browser_ttl'        => 604800,
			),
			'browser' => array(
				'enabled'              => true,
				'html_ttl'             => 300,
				'html_must_revalidate' => true,
				'static_ttl'           => 604800,
				'api_ttl'              => 60,
				'etag'                 => true,
				'vary_encoding'        => true,
			),
			'cdn'     => array(
				'enabled'    => false,
				'provider'   => 'none',
				'purge_url'  => '',
				'purge_token'=> '',
				'edge_ttl'   => 86400,
			),
			'advanced'=> array(
				'object_cache_hint' => true,
				'heartbeat_limit'   => true,
				'disable_emojis'    => true,
				'disable_embeds'    => true,
				'limit_revisions'   => 5,
				'exclude_cookies'   => "wordpress_logged_in_\ncomment_author_\nwoocommerce_",
				'debug_headers'     => false,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function aggressive(): array {
		return array(
			'pages'   => array(
				'enabled'               => true,
				'ttl'                   => 86400,
				'cache_logged_in'       => false,
				'cache_query_strings'   => true,
				'stale_while_revalidate'=> 604800,
				'exclude_paths'         => "/wp-admin/\n/wp-login.php\n/cart\n/checkout",
				'graphql_ttl'           => 300,
				'rest_ttl'              => 300,
			),
			'media'   => array(
				'enabled'             => true,
				'browser_ttl'         => 31536000,
				'lazy_load'           => true,
				'lazy_load_native'    => true,
				'prefer_webp'         => true,
				'prefer_avif'         => true,
				'generate_webp'       => true,
				'generate_avif'       => true,
				'optimize_on_upload'  => true,
				'quality'             => 80,
				'editor_engine'       => 'auto',
				'max_width'           => 2048,
				'max_height'          => 0,
				'big_image_threshold' => 2048,
				'responsive_images'   => true,
				'cdn_url'             => '',
				'strip_exif'          => true,
			),
			'code'    => array(
				'enabled'          => true,
				'minify_css'       => true,
				'minify_js'        => true,
				'combine_css'      => true,
				'combine_js'       => true,
				'defer_js'         => true,
				'delay_js'         => true,
				'remove_unused_css'=> true,
				'critical_css'     => true,
				'preload_fonts'      => true,
				'prefetch_dns'       => true,
				'dns_prefetch_hosts' => DnsPrefetch::default_hosts_for_preset( 'aggressive' ),
				'browser_ttl'        => 31536000,
			),
			'browser' => array(
				'enabled'              => true,
				'html_ttl'             => 3600,
				'html_must_revalidate' => true,
				'static_ttl'           => 31536000,
				'api_ttl'              => 300,
				'etag'                 => true,
				'vary_encoding'        => true,
			),
			'cdn'     => array(
				'enabled'    => true,
				'provider'   => 'cloudflare',
				'purge_url'  => '',
				'purge_token'=> '',
				'edge_ttl'   => 604800,
			),
			'advanced'=> array(
				'object_cache_hint' => true,
				'heartbeat_limit'   => true,
				'disable_emojis'    => true,
				'disable_embeds'    => true,
				'limit_revisions'   => 3,
				'exclude_cookies'   => "wordpress_logged_in_\ncomment_author_\nwoocommerce_",
				'debug_headers'     => false,
			),
		);
	}

	/**
	 * Apply a named preset onto the current settings shape.
	 *
	 * @param array<string, mixed> $current
	 * @return array<string, mixed>
	 */
	public static function apply( string $preset, array $current ): array {
		$presets = self::all();
		if ( ! isset( $presets[ $preset ] ) || 'custom' === $preset ) {
			$current['preset'] = 'custom';
			return $current;
		}

		$applied           = array_merge( $current, $presets[ $preset ]['settings'] );
		$applied['preset'] = $preset;
		$applied['version'] = Settings::VERSION;

		return $applied;
	}
}

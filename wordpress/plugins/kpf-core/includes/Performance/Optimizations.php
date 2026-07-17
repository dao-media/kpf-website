<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

/**
 * Lightweight runtime optimizations driven by Advanced / Code / Media settings.
 */
final class Optimizations {
	public static function register(): void {
		add_action( 'init', array( self::class, 'boot' ), 20 );
	}

	public static function boot(): void {
		$settings = Settings::get();
		$advanced = $settings['advanced'] ?? array();
		$media    = $settings['media'] ?? array();
		$code     = $settings['code'] ?? array();

		if ( ! empty( $code['enabled'] ) && ! empty( $code['prefetch_dns'] ) ) {
			add_action( 'wp_head', array( self::class, 'print_dns_prefetch' ), 1 );
		}

		if ( ! empty( $advanced['disable_emojis'] ) ) {
			remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
			remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
			remove_action( 'wp_print_styles', 'print_emoji_styles' );
			remove_action( 'admin_print_styles', 'print_emoji_styles' );
			remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
			remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
			remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
			add_filter( 'emoji_svg_url', '__return_false' );
		}

		if ( ! empty( $advanced['disable_embeds'] ) ) {
			remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
			remove_action( 'wp_head', 'wp_oembed_add_host_js' );
		}

		if ( ! empty( $advanced['heartbeat_limit'] ) ) {
			add_filter(
				'heartbeat_settings',
				static function ( array $settings ): array {
					$settings['interval'] = 60;
					return $settings;
				}
			);
		}

		$revisions = absint( $advanced['limit_revisions'] ?? 0 );
		if ( $revisions > 0 && ! defined( 'WP_POST_REVISIONS' ) ) {
			define( 'WP_POST_REVISIONS', $revisions );
		}

		if ( ! empty( $media['enabled'] ) && ! empty( $media['lazy_load'] ) ) {
			add_filter( 'wp_lazy_loading_enabled', '__return_true' );
		} elseif ( isset( $media['lazy_load'] ) && ! $media['lazy_load'] ) {
			add_filter( 'wp_lazy_loading_enabled', '__return_false' );
		}
	}

	public static function print_dns_prefetch(): void {
		$settings = Settings::get();
		$code     = $settings['code'] ?? array();

		if ( empty( $code['enabled'] ) || empty( $code['prefetch_dns'] ) ) {
			return;
		}

		$hosts = DnsPrefetch::sanitize_hosts( $code['dns_prefetch_hosts'] ?? array() );
		foreach ( $hosts as $host ) {
			printf(
				"<link rel=\"dns-prefetch\" href=\"//%s\" />\n",
				esc_attr( $host )
			);
		}
	}
}

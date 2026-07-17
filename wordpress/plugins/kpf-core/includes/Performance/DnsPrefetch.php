<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

/**
 * Curated third-party hosts for optional <link rel="dns-prefetch"> hints.
 *
 * Keep this list practical: domains a foundation / marketing site is likely to
 * load (fonts, analytics, embeds, CDNs, captcha) — not every tracker on the web.
 */
final class DnsPrefetch {
	/**
	 * @return array<int, array{id:string,host:string,label:string,description:string,group:string}>
	 */
	public static function catalog(): array {
		return array(
			// Fonts
			self::item( 'google-fonts-css', 'fonts.googleapis.com', 'Google Fonts CSS', 'Stylesheet host for Google Fonts.', 'fonts' ),
			self::item( 'google-fonts-files', 'fonts.gstatic.com', 'Google Fonts files', 'Font file CDN used by Google Fonts.', 'fonts' ),
			self::item( 'typekit', 'use.typekit.net', 'Adobe Fonts (Typekit)', 'Adobe / Typekit webfont delivery.', 'fonts' ),

			// Analytics & tags
			self::item( 'gtm', 'www.googletagmanager.com', 'Google Tag Manager', 'Tag manager loader and containers.', 'analytics' ),
			self::item( 'ga', 'www.google-analytics.com', 'Google Analytics', 'Classic / Universal Analytics endpoints.', 'analytics' ),
			self::item( 'ga4', 'region1.google-analytics.com', 'Google Analytics 4', 'Common GA4 collection endpoint.', 'analytics' ),
			self::item( 'gstatic', 'www.gstatic.com', 'Google static assets', 'Shared Google static resources (tags, captcha helpers).', 'analytics' ),
			self::item( 'clarity', 'www.clarity.ms', 'Microsoft Clarity', 'Session recording and heatmaps.', 'analytics' ),
			self::item( 'hotjar', 'script.hotjar.com', 'Hotjar', 'Hotjar tracking scripts.', 'analytics' ),
			self::item( 'hotjar-static', 'static.hotjar.com', 'Hotjar static', 'Hotjar static assets.', 'analytics' ),
			self::item( 'bing', 'bat.bing.com', 'Microsoft Advertising (Bing UET)', 'Bing / Microsoft ads conversion tag.', 'analytics' ),
			self::item( 'segment', 'cdn.segment.com', 'Segment', 'Segment analytics CDN.', 'analytics' ),
			self::item( 'cloudflare-insights', 'static.cloudflareinsights.com', 'Cloudflare Web Analytics', 'Cloudflare beacon / insights.', 'analytics' ),

			// Social & pixels
			self::item( 'facebook', 'connect.facebook.net', 'Meta Pixel / Facebook SDK', 'Facebook / Meta pixel and SDK.', 'social' ),
			self::item( 'facebook-www', 'www.facebook.com', 'Facebook', 'Facebook tracking and share endpoints.', 'social' ),
			self::item( 'twitter', 'platform.twitter.com', 'X (Twitter) widgets', 'X / Twitter embed and share widgets.', 'social' ),
			self::item( 'twitter-cdn', 'cdn.syndication.twimg.com', 'X syndication CDN', 'X / Twitter embedded content CDN.', 'social' ),
			self::item( 'linkedin', 'snap.licdn.com', 'LinkedIn Insight', 'LinkedIn Insight Tag.', 'social' ),
			self::item( 'pinterest', 's.pinimg.com', 'Pinterest', 'Pinterest assets and tag helpers.', 'social' ),
			self::item( 'instagram', 'www.instagram.com', 'Instagram', 'Instagram embeds.', 'social' ),

			// Video embeds
			self::item( 'youtube', 'www.youtube.com', 'YouTube', 'YouTube player and embeds.', 'video' ),
			self::item( 'youtube-nocookie', 'www.youtube-nocookie.com', 'YouTube (privacy-enhanced)', 'Privacy-enhanced YouTube embeds.', 'video' ),
			self::item( 'youtube-img', 'i.ytimg.com', 'YouTube thumbnails', 'YouTube image / thumbnail CDN.', 'video' ),
			self::item( 'vimeo', 'player.vimeo.com', 'Vimeo player', 'Vimeo embed player.', 'video' ),
			self::item( 'vimeo-cdn', 'i.vimeocdn.com', 'Vimeo CDN', 'Vimeo media CDN.', 'video' ),

			// Script / library CDNs
			self::item( 'jsdelivr', 'cdn.jsdelivr.net', 'jsDelivr', 'Popular open-source CDN.', 'cdn' ),
			self::item( 'cdnjs', 'cdnjs.cloudflare.com', 'cdnjs', 'Cloudflare cdnjs library host.', 'cdn' ),
			self::item( 'unpkg', 'unpkg.com', 'unpkg', 'npm package CDN.', 'cdn' ),
			self::item( 'google-ajax', 'ajax.googleapis.com', 'Google Hosted Libraries', 'jQuery and other Google-hosted libs.', 'cdn' ),

			// Forms, captcha, payments
			self::item( 'recaptcha', 'www.google.com', 'Google (reCAPTCHA)', 'reCAPTCHA and related Google origins.', 'forms' ),
			self::item( 'recaptcha-net', 'www.recaptcha.net', 'reCAPTCHA.net', 'Alternate reCAPTCHA host.', 'forms' ),
			self::item( 'turnstile', 'challenges.cloudflare.com', 'Cloudflare Turnstile', 'Turnstile captcha challenges.', 'forms' ),
			self::item( 'hcaptcha', 'js.hcaptcha.com', 'hCaptcha', 'hCaptcha scripts.', 'forms' ),
			self::item( 'stripe', 'js.stripe.com', 'Stripe.js', 'Stripe payment scripts.', 'forms' ),
			self::item( 'paypal', 'www.paypal.com', 'PayPal', 'PayPal checkout / buttons.', 'forms' ),
			self::item( 'paypal-objects', 'www.paypalobjects.com', 'PayPal objects', 'PayPal static assets.', 'forms' ),

			// Maps & misc
			self::item( 'maps', 'maps.googleapis.com', 'Google Maps API', 'Maps JavaScript API.', 'maps' ),
			self::item( 'maps-static', 'maps.gstatic.com', 'Google Maps static', 'Maps tiles and static assets.', 'maps' ),
			self::item( 'gravatar', 'secure.gravatar.com', 'Gravatar', 'Avatar images.', 'misc' ),
			self::item( 'wp-stats', 'stats.wp.com', 'WordPress.com Stats', 'Jetpack / WP.com stats.', 'misc' ),
		);
	}

	/**
	 * @return array<string, string> group slug => label
	 */
	public static function groups(): array {
		return array(
			'fonts'     => __( 'Fonts', 'kpf-core' ),
			'analytics' => __( 'Analytics & tags', 'kpf-core' ),
			'social'    => __( 'Social & pixels', 'kpf-core' ),
			'video'     => __( 'Video embeds', 'kpf-core' ),
			'cdn'       => __( 'Script CDNs', 'kpf-core' ),
			'forms'     => __( 'Forms, captcha & payments', 'kpf-core' ),
			'maps'      => __( 'Maps', 'kpf-core' ),
			'misc'      => __( 'Other', 'kpf-core' ),
		);
	}

	/**
	 * Hosts enabled by default for light/balanced presets.
	 *
	 * @return array<int, string>
	 */
	public static function default_hosts_for_preset( string $preset ): array {
		$by_id = array(
			'off'        => array(),
			'light'      => array(
				'fonts.googleapis.com',
				'fonts.gstatic.com',
				'www.googletagmanager.com',
				'www.google-analytics.com',
			),
			'balanced'   => array(
				'fonts.googleapis.com',
				'fonts.gstatic.com',
				'www.googletagmanager.com',
				'www.google-analytics.com',
				'region1.google-analytics.com',
				'www.gstatic.com',
				'connect.facebook.net',
				'www.youtube.com',
				'www.youtube-nocookie.com',
				'i.ytimg.com',
				'cdn.jsdelivr.net',
				'www.google.com',
				'challenges.cloudflare.com',
			),
			'aggressive' => self::all_hosts(),
		);

		return $by_id[ $preset ] ?? $by_id['balanced'];
	}

	/**
	 * @return array<int, string>
	 */
	public static function all_hosts(): array {
		return array_values(
			array_unique(
				array_map(
					static fn( array $item ): string => $item['host'],
					self::catalog()
				)
			)
		);
	}

	/**
	 * @param array<int, string> $hosts
	 * @return array<int, string>
	 */
	public static function sanitize_hosts( $hosts ): array {
		$allowed = array_fill_keys( self::all_hosts(), true );
		$clean   = array();

		foreach ( (array) $hosts as $host ) {
			$host = strtolower( sanitize_text_field( (string) $host ) );
			$host = preg_replace( '#^https?://#', '', $host ) ?? $host;
			$host = preg_replace( '#^//#', '', $host ) ?? $host;
			$host = rtrim( $host, '/' );
			if ( isset( $allowed[ $host ] ) ) {
				$clean[] = $host;
			}
		}

		return array_values( array_unique( $clean ) );
	}

	/**
	 * @return array{id:string,host:string,label:string,description:string,group:string}
	 */
	private static function item( string $id, string $host, string $label, string $description, string $group ): array {
		return array(
			'id'          => $id,
			'host'        => $host,
			'label'       => $label,
			'description' => $description,
			'group'       => $group,
		);
	}
}

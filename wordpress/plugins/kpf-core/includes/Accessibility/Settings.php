<?php

declare(strict_types=1);

namespace KPF\Core\Accessibility;

final class Settings {
	public const OPTION_KEY = 'kpf_accessibility_settings';
	public const VERSION    = 2;

	public static function register(): void {
		add_action(
			'init',
			static function (): void {
				register_setting(
					'kpf_accessibility',
					self::OPTION_KEY,
					array(
						'type'              => 'object',
						'default'           => self::defaults(),
						'sanitize_callback' => array( Sanitizer::class, 'sanitize_settings' ),
						'show_in_rest'      => false,
					)
				);
			}
		);
	}

	public static function ensure_defaults(): void {
		$current = get_option( self::OPTION_KEY, null );
		if ( ! is_array( $current ) ) {
			update_option( self::OPTION_KEY, self::defaults(), false );
			return;
		}

		$merged = self::merge_defaults( $current );
		if ( (int) ( $current['version'] ?? 0 ) < self::VERSION ) {
			update_option( self::OPTION_KEY, $merged, false );
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		$recommended = Presets::recommended();

		return array_merge(
			array(
				'version' => self::VERSION,
				'preset'  => 'recommended',
			),
			$recommended
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return self::merge_defaults( $stored );
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function update( array $settings ): array {
		$clean = Sanitizer::sanitize_settings( $settings );
		update_option( self::OPTION_KEY, $clean, false );
		return self::get();
	}

	/**
	 * Public config for Faust / GraphQL (camelCase).
	 *
	 * @return array<string, mixed>
	 */
	public static function public_config(): array {
		$settings = self::get();

		return array(
			'preset'     => $settings['preset'],
			'navigation' => array(
				'skipLink'           => (bool) $settings['navigation']['skip_link'],
				'skipTarget'         => (string) $settings['navigation']['skip_target'],
				'skipLabel'          => (string) $settings['navigation']['skip_label'],
				'skipFooter'         => (bool) $settings['navigation']['skip_footer'],
				'footerTarget'       => (string) $settings['navigation']['footer_target'],
				'focusRing'          => (bool) $settings['navigation']['focus_ring'],
				'focusRingColor'     => (string) $settings['navigation']['focus_ring_color'],
				'focusRingWidth'     => (int) $settings['navigation']['focus_ring_width'],
				'focusNotObscured'   => (bool) $settings['navigation']['focus_not_obscured'],
				'focusScrollMargin'  => (int) $settings['navigation']['focus_scroll_margin'],
			),
			'content'    => array(
				'language'           => (string) $settings['content']['language'],
				'underlineLinks'     => (bool) $settings['content']['underline_links'],
				'routeAnnouncer'     => (bool) $settings['content']['route_announcer'],
				'announceNewWindows' => (bool) $settings['content']['announce_new_windows'],
				'readableMeasure'    => (bool) $settings['content']['readable_measure'],
			),
			'display'    => array(
				'textScale'            => (int) $settings['display']['text_scale'],
				'contrastBoost'        => (bool) $settings['display']['contrast_boost'],
				'honorPrefersContrast' => (bool) $settings['display']['honor_prefers_contrast'],
				'minTargetSize'        => (string) $settings['display']['min_target_size'],
			),
			'media'      => array(
				'blockAutoplayReducedMotion' => (bool) $settings['media']['block_autoplay_reduced_motion'],
			),
			'motion'     => array(
				'honorPrefersReducedMotion' => (bool) $settings['motion']['honor_prefers_reduced_motion'],
				'forceReduceMotion'         => (bool) $settings['motion']['force_reduce_motion'],
			),
			'forms'      => array(
				'enhancedFocus'    => (bool) $settings['forms']['enhanced_focus'],
				'statusLiveRegion' => (bool) $settings['forms']['status_live_region'],
				'requiredVisible'  => (bool) $settings['forms']['required_visible'],
				'focusFirstError'  => (bool) $settings['forms']['focus_first_error'],
			),
			'advanced'   => array(
				'customCss'     => (string) $settings['advanced']['custom_css'],
				'debugOutlines' => (bool) $settings['advanced']['debug_outlines'],
			),
		);
	}

	/**
	 * @param array<string, mixed> $stored
	 * @return array<string, mixed>
	 */
	private static function merge_defaults( array $stored ): array {
		$defaults = self::defaults();

		return array(
			'version'    => self::VERSION,
			'preset'     => sanitize_key( (string) ( $stored['preset'] ?? $defaults['preset'] ) ),
			'navigation' => array_merge( $defaults['navigation'], is_array( $stored['navigation'] ?? null ) ? $stored['navigation'] : array() ),
			'content'    => array_merge( $defaults['content'], is_array( $stored['content'] ?? null ) ? $stored['content'] : array() ),
			'display'    => array_merge( $defaults['display'], is_array( $stored['display'] ?? null ) ? $stored['display'] : array() ),
			'media'      => array_merge( $defaults['media'], is_array( $stored['media'] ?? null ) ? $stored['media'] : array() ),
			'motion'     => array_merge( $defaults['motion'], is_array( $stored['motion'] ?? null ) ? $stored['motion'] : array() ),
			'forms'      => array_merge( $defaults['forms'], is_array( $stored['forms'] ?? null ) ? $stored['forms'] : array() ),
			'advanced'   => array_merge( $defaults['advanced'], is_array( $stored['advanced'] ?? null ) ? $stored['advanced'] : array() ),
		);
	}
}

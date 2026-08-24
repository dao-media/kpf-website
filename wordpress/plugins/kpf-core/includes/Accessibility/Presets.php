<?php

declare(strict_types=1);

namespace KPF\Core\Accessibility;

/**
 * Named accessibility profiles from off → strict.
 */
final class Presets {
	/**
	 * @return array<string, array{label:string,description:string,settings:array<string,mixed>}>
	 */
	public static function all(): array {
		return array(
			'off'         => array(
				'label'       => __( 'Off', 'kpf-core' ),
				'description' => __( 'No accessibility utilities injected on the frontend.', 'kpf-core' ),
				'settings'    => self::off(),
			),
			'essential'   => array(
				'label'       => __( 'Essential', 'kpf-core' ),
				'description' => __( 'Skip links and focus rings — the minimum for keyboard users.', 'kpf-core' ),
				'settings'    => self::essential(),
			),
			'recommended'  => array(
				'label'       => __( 'Recommended', 'kpf-core' ),
				'description' => __( 'WCAG 2.2 AA defaults: navigation, contrast, motion, targets, and forms.', 'kpf-core' ),
				'settings'    => self::recommended(),
			),
			'strict'      => array(
				'label'       => __( 'Strict', 'kpf-core' ),
				'description' => __( 'Stronger contrast, larger targets, forced reduced motion, and debug outlines.', 'kpf-core' ),
				'settings'    => self::strict(),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function off(): array {
		return array(
			'navigation' => array(
				'skip_link'            => false,
				'skip_target'          => '#main',
				'skip_label'           => 'Skip to content',
				'skip_footer'          => false,
				'footer_target'        => '#kpf-footer',
				'focus_ring'           => false,
				'focus_ring_color'     => '#2271b1',
				'focus_ring_width'     => 3,
				'focus_not_obscured'   => false,
				'focus_scroll_margin'  => 96,
			),
			'content'    => array(
				'language'             => 'en',
				'underline_links'      => false,
				'route_announcer'      => false,
				'announce_new_windows' => false,
				'readable_measure'     => false,
			),
			'display'    => array(
				'text_scale'             => 100,
				'contrast_boost'         => false,
				'honor_prefers_contrast' => false,
				'min_target_size'        => 'off',
			),
			'media'      => array(
				'block_autoplay_reduced_motion' => false,
			),
			'motion'     => array(
				'honor_prefers_reduced_motion' => false,
				'force_reduce_motion'          => false,
			),
			'forms'      => array(
				'enhanced_focus'     => false,
				'status_live_region' => false,
				'required_visible'   => false,
				'focus_first_error'  => false,
			),
			'advanced'   => array(
				'custom_css'     => '',
				'debug_outlines' => false,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function essential(): array {
		$settings = self::off();
		$settings['navigation']['skip_link']          = true;
		$settings['navigation']['skip_footer']        = true;
		$settings['navigation']['focus_ring']         = true;
		$settings['navigation']['focus_not_obscured'] = true;
		$settings['content']['announce_new_windows']  = true;
		return $settings;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function recommended(): array {
		$settings = self::essential();
		$settings['content']['underline_links']             = true;
		$settings['content']['route_announcer']             = true;
		$settings['display']['honor_prefers_contrast']      = true;
		$settings['display']['min_target_size']             = 'aa';
		$settings['media']['block_autoplay_reduced_motion'] = true;
		$settings['motion']['honor_prefers_reduced_motion'] = true;
		$settings['forms']['enhanced_focus']                = true;
		$settings['forms']['status_live_region']            = true;
		$settings['forms']['required_visible']              = true;
		$settings['forms']['focus_first_error']             = true;
		return $settings;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function strict(): array {
		$settings = self::recommended();
		$settings['navigation']['focus_ring_width']    = 4;
		$settings['content']['readable_measure']       = true;
		$settings['display']['contrast_boost']         = true;
		$settings['display']['min_target_size']        = 'comfortable';
		$settings['motion']['force_reduce_motion']     = true;
		$settings['advanced']['debug_outlines']        = true;
		return $settings;
	}

	/**
	 * @param array<string, mixed> $current
	 * @return array<string, mixed>
	 */
	public static function apply( string $preset, array $current ): array {
		$presets = self::all();
		if ( ! isset( $presets[ $preset ] ) || 'custom' === $preset ) {
			$current['preset'] = 'custom';
			return $current;
		}

		$applied            = array_merge( $current, $presets[ $preset ]['settings'] );
		$applied['preset']  = $preset;
		$applied['version'] = Settings::VERSION;

		return $applied;
	}
}

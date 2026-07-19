<?php

declare(strict_types=1);

namespace KPF\Core\Accessibility;

final class Sanitizer {
	private const PRESETS = array( 'off', 'essential', 'recommended', 'strict', 'custom' );

	/**
	 * @param mixed $input
	 * @return array<string, mixed>
	 */
	public static function sanitize_settings( $input ): array {
		$defaults = Settings::defaults();
		$input    = is_array( $input ) ? $input : array();

		$navigation = is_array( $input['navigation'] ?? null ) ? $input['navigation'] : array();
		$content    = is_array( $input['content'] ?? null ) ? $input['content'] : array();
		$media      = is_array( $input['media'] ?? null ) ? $input['media'] : array();
		$motion     = is_array( $input['motion'] ?? null ) ? $input['motion'] : array();
		$forms      = is_array( $input['forms'] ?? null ) ? $input['forms'] : array();
		$advanced   = is_array( $input['advanced'] ?? null ) ? $input['advanced'] : array();

		$preset = sanitize_key( (string) ( $input['preset'] ?? 'custom' ) );
		if ( ! in_array( $preset, self::PRESETS, true ) ) {
			$preset = 'custom';
		}

		$skip_target = sanitize_text_field( (string) ( $navigation['skip_target'] ?? $defaults['navigation']['skip_target'] ) );
		if ( '' === $skip_target || ! preg_match( '/^#[A-Za-z][\w:-]*$/', $skip_target ) ) {
			$skip_target = '#main';
		}

		$language = sanitize_text_field( (string) ( $content['language'] ?? $defaults['content']['language'] ) );
		if ( ! preg_match( '/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/', $language ) ) {
			$language = 'en';
		}

		return array(
			'version'    => Settings::VERSION,
			'preset'     => $preset,
			'navigation' => array(
				'skip_link'        => (bool) ( $navigation['skip_link'] ?? $defaults['navigation']['skip_link'] ),
				'skip_target'      => $skip_target,
				'focus_ring'       => (bool) ( $navigation['focus_ring'] ?? $defaults['navigation']['focus_ring'] ),
				'focus_ring_color' => self::hex_color( $navigation['focus_ring_color'] ?? $defaults['navigation']['focus_ring_color'] ),
				'focus_ring_width' => min( 8, max( 1, absint( $navigation['focus_ring_width'] ?? $defaults['navigation']['focus_ring_width'] ) ) ),
			),
			'content'    => array(
				'language'        => strtolower( $language ),
				'underline_links' => (bool) ( $content['underline_links'] ?? $defaults['content']['underline_links'] ),
				'route_announcer' => (bool) ( $content['route_announcer'] ?? $defaults['content']['route_announcer'] ),
			),
			'media'      => array(
				'block_autoplay_reduced_motion' => (bool) ( $media['block_autoplay_reduced_motion'] ?? $defaults['media']['block_autoplay_reduced_motion'] ),
			),
			'motion'     => array(
				'honor_prefers_reduced_motion' => (bool) ( $motion['honor_prefers_reduced_motion'] ?? $defaults['motion']['honor_prefers_reduced_motion'] ),
				'force_reduce_motion'          => (bool) ( $motion['force_reduce_motion'] ?? false ),
			),
			'forms'      => array(
				'enhanced_focus'     => (bool) ( $forms['enhanced_focus'] ?? $defaults['forms']['enhanced_focus'] ),
				'status_live_region' => (bool) ( $forms['status_live_region'] ?? $defaults['forms']['status_live_region'] ),
			),
			'advanced'   => array(
				'custom_css'     => self::css( $advanced['custom_css'] ?? '' ),
				'debug_outlines' => (bool) ( $advanced['debug_outlines'] ?? false ),
			),
		);
	}

	/**
	 * @param mixed $value
	 */
	private static function hex_color( $value ): string {
		$color = sanitize_hex_color( (string) $value );
		return is_string( $color ) && '' !== $color ? $color : '#2271b1';
	}

	/**
	 * @param mixed $value
	 */
	private static function css( $value ): string {
		$css = str_replace( "\0", '', (string) $value );
		$css = preg_replace( '/@import\b[^;]*;/i', '', $css ) ?? '';
		$css = preg_replace( '/expression\s*\(/i', '', $css ) ?? '';
		$css = preg_replace( '/javascript\s*:/i', '', $css ) ?? '';
		return substr( $css, 0, 20000 );
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Design\Icons;

use KPF\Core\Design\Tokens\Registry;
use KPF\Core\Design\Tokens\Sync;
use WP_Error;

/**
 * Build / persist icon utility classes into the managed tokens stylesheet block.
 */
final class Css {
	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|WP_Error
	 */
	public static function save_class( array $payload ) {
		$name = Registry::sanitize_class_name( $payload['name'] ?? '' );
		$css  = Registry::sanitize_declarations( $payload['css'] ?? '' );
		$note = substr( sanitize_text_field( (string) ( $payload['note'] ?? '' ) ), 0, 200 );

		if ( '' === $name ) {
			return new WP_Error(
				'kpf_icons_invalid_class',
				__( 'Class name is required.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		if ( '' === $css ) {
			$css = self::declarations_from_config( is_array( $payload['config'] ?? null ) ? $payload['config'] : array() );
			$css = Registry::sanitize_declarations( $css );
		}

		if ( '' === $css ) {
			return new WP_Error(
				'kpf_icons_invalid_css',
				__( 'CSS declarations are required.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		if ( '' === $note ) {
			$icon = sanitize_text_field( (string) ( $payload['icon'] ?? '' ) );
			$note = $icon
				? sprintf(
					/* translators: %s: Lucide icon name */
					__( 'Icon: %s (from Icons admin)', 'kpf-core' ),
					$icon
				)
				: __( 'Icon utility (from Icons admin)', 'kpf-core' );
		}

		return Sync::upsert_class(
			array(
				'name'    => $name,
				'css'     => $css,
				'note'    => $note,
				'oldName' => $payload['oldName'] ?? $name,
			)
		);
	}

	/**
	 * @param array<string, mixed> $config
	 */
	public static function declarations_from_config( array $config ): string {
		$size           = self::css_length( $config['size'] ?? 20, '20px' );
		$stroke         = self::css_number( $config['strokeWidth'] ?? 1.75, '1.75' );
		$color          = Registry::sanitize_css_value( $config['color'] ?? 'currentColor' );
		$padding        = self::css_box( $config['padding'] ?? '0' );
		$margin         = self::css_box( $config['margin'] ?? '0' );
		$ratio          = self::css_ratio( $config['ratio'] ?? '24 / 24' );
		$stroke_linecap = self::enum(
			(string) ( $config['strokeLinecap'] ?? 'round' ),
			array( 'butt', 'round', 'square' ),
			'round'
		);
		$stroke_linejoin = self::enum(
			(string) ( $config['strokeLinejoin'] ?? 'round' ),
			array( 'miter', 'round', 'bevel' ),
			'round'
		);

		$parts = array(
			'display: inline-grid',
			'place-items: center',
			'width: ' . $size,
			'height: ' . $size,
			'box-sizing: border-box',
			'padding: ' . $padding,
			'color: ' . ( $color !== '' ? $color : 'currentColor' ),
			'line-height: 0',
			'vertical-align: middle',
			'flex-shrink: 0',
			'overflow: hidden',
			'stroke: currentColor',
			'stroke-width: ' . $stroke,
			'stroke-linecap: ' . $stroke_linecap,
			'stroke-linejoin: ' . $stroke_linejoin,
			'fill: none',
			'aspect-ratio: ' . $ratio,
		);

		if ( '0' !== $margin && '' !== $margin ) {
			$parts[] = 'margin: ' . $margin;
		}

		return implode( '; ', $parts ) . ';';
	}

	/**
	 * @param mixed $value
	 */
	private static function css_number( $value, string $fallback ): string {
		if ( is_numeric( $value ) ) {
			return rtrim( rtrim( sprintf( '%.4F', (float) $value ), '0' ), '.' );
		}
		$clean = Registry::sanitize_css_value( (string) $value );
		return $clean !== '' ? $clean : $fallback;
	}

	/**
	 * @param mixed $value
	 */
	private static function css_length( $value, string $fallback ): string {
		if ( is_numeric( $value ) ) {
			return rtrim( rtrim( sprintf( '%.4F', (float) $value ), '0' ), '.' ) . 'px';
		}
		$clean = Registry::sanitize_css_value( (string) $value );
		return $clean !== '' ? $clean : $fallback;
	}

	/**
	 * @param mixed $value
	 */
	private static function css_box( $value ): string {
		$clean = Registry::sanitize_css_value( (string) $value );
		return $clean !== '' ? $clean : '0';
	}

	/**
	 * @param mixed $value
	 */
	private static function css_ratio( $value ): string {
		$value = trim( (string) $value );
		if ( preg_match( '/^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/', $value ) ) {
			return preg_replace( '/\s+/', ' ', $value ) ?: '24 / 24';
		}
		return '24 / 24';
	}

	/**
	 * @param list<string> $allowed
	 */
	private static function enum( string $value, array $allowed, string $fallback ): string {
		$value = strtolower( trim( $value ) );
		return in_array( $value, $allowed, true ) ? $value : $fallback;
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\DynamicContent;

final class Sanitizer {
	/**
	 * @param mixed $input
	 * @return array<int, array<string, mixed>>
	 */
	public static function sanitize_tags( $input ): array {
		if ( ! is_array( $input ) ) {
			return array();
		}

		$out  = array();
		$seen = array();

		foreach ( $input as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$key = self::sanitize_key( $row['key'] ?? '' );
			if ( $key === '' || isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;

			$out[] = array(
				'key'           => $key,
				'label'         => sanitize_text_field( (string) ( $row['label'] ?? $key ) ),
				'description'   => sanitize_text_field( (string) ( $row['description'] ?? '' ) ),
				'value'         => self::sanitize_value( $row['value'] ?? '' ),
				'enabled'       => (bool) ( $row['enabled'] ?? true ),
				'expose_seo'    => (bool) ( $row['expose_seo'] ?? true ),
				'expose_design' => (bool) ( $row['expose_design'] ?? true ),
			);

			if ( count( $out ) >= Settings::MAX_TAGS ) {
				break;
			}
		}

		usort(
			$out,
			static function ( array $a, array $b ): int {
				return strcasecmp( (string) $a['label'], (string) $b['label'] );
			}
		);

		return $out;
	}

	/**
	 * @param mixed $value
	 */
	public static function sanitize_key( $value ): string {
		$key = strtolower( trim( (string) $value ) );
		$key = preg_replace( '/[^a-z0-9_-]/', '_', $key ) ?: '';
		$key = trim( $key, '_-' );
		if ( $key === '' || strlen( $key ) > 64 ) {
			return '';
		}
		// Reserved prefixes / tokens.
		if ( in_array( $key, array( 'title', 'content', 'excerpt', 'seo', 'author' ), true ) ) {
			return '';
		}
		if ( str_starts_with( $key, 'cf_' ) || str_starts_with( $key, 'site_' ) ) {
			return '';
		}
		return $key;
	}

	/**
	 * @param mixed $value
	 */
	public static function sanitize_value( $value ): string {
		$value = wp_kses_post( (string) $value );
		if ( strlen( $value ) > 5000 ) {
			$value = substr( $value, 0, 5000 );
		}
		return $value;
	}
}

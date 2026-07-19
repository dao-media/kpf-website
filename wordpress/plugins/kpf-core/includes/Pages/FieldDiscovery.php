<?php

declare(strict_types=1);

namespace KPF\Core\Pages;

/**
 * Discovers {{fields.*}} placeholders in design HTML for the page editor.
 */
final class FieldDiscovery {
	/**
	 * @return array<int, array{key: string, label: string}>
	 */
	public static function from_html( string $html ): array {
		if ( '' === trim( $html ) ) {
			return array();
		}

		if ( ! preg_match_all( '/\{\{\{?\s*fields\.([a-zA-Z0-9_-]+)\s*\}?\}\}/', $html, $matches ) ) {
			return array();
		}

		$keys  = array();
		$seen  = array();
		foreach ( $matches[1] as $raw_key ) {
			$key = strtolower( trim( (string) $raw_key ) );
			$key = preg_replace( '/[^a-z0-9_-]/', '_', $key ) ?: '';
			$key = trim( $key, '_-' );
			if ( '' === $key || isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$keys[]       = array(
				'key'   => substr( $key, 0, 80 ),
				'label' => self::label_for_key( $key ),
			);
		}

		return $keys;
	}

	public static function label_for_key( string $key ): string {
		$label = str_replace( array( '-', '_' ), ' ', $key );
		$label = preg_replace( '/\s+/', ' ', $label ) ?: $label;
		return ucwords( trim( $label ) );
	}
}

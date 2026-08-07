<?php

declare(strict_types=1);

namespace KPF\Core\Design\Tokens;

/**
 * Managed global design tokens (variables + classes).
 */
final class Registry {
	public const OPTION = 'kpf_design_tokens';

	/**
	 * @return array{variables: list<array{name: string, value: string, note: string}>, classes: list<array{name: string, css: string, note: string}>}
	 */
	public static function get(): array {
		$raw = get_option( self::OPTION, array() );
		return self::sanitize( $raw );
	}

	/**
	 * @param mixed $value Raw registry.
	 * @return array{variables: list<array{name: string, value: string, note: string}>, classes: list<array{name: string, css: string, note: string}>}
	 */
	public static function sanitize( $value ): array {
		$value = is_array( $value ) ? $value : array();
		$vars  = array();
		$seen  = array();

		foreach ( is_array( $value['variables'] ?? null ) ? $value['variables'] : array() as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$name = self::sanitize_variable_name( $row['name'] ?? '' );
			if ( '' === $name || isset( $seen[ $name ] ) ) {
				continue;
			}
			$seen[ $name ] = true;
			$vars[]        = array(
				'name'  => $name,
				'value' => self::sanitize_css_value( $row['value'] ?? '' ),
				'note'  => substr( sanitize_text_field( (string) ( $row['note'] ?? '' ) ), 0, 200 ),
			);
		}

		$classes = array();
		$seen_c  = array();
		foreach ( is_array( $value['classes'] ?? null ) ? $value['classes'] : array() as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$name = self::sanitize_class_name( $row['name'] ?? '' );
			if ( '' === $name || isset( $seen_c[ $name ] ) ) {
				continue;
			}
			$seen_c[ $name ] = true;
			$classes[]       = array(
				'name' => $name,
				'css'  => self::sanitize_declarations( $row['css'] ?? '' ),
				'note' => substr( sanitize_text_field( (string) ( $row['note'] ?? '' ) ), 0, 200 ),
			);
		}

		return array(
			'variables' => $vars,
			'classes'   => $classes,
		);
	}

	/**
	 * @param mixed $value Raw registry.
	 * @return array{variables: list<array{name: string, value: string, note: string}>, classes: list<array{name: string, css: string, note: string}>}
	 */
	public static function save( $value ): array {
		$clean = self::sanitize( $value );
		update_option( self::OPTION, $clean, false );
		return $clean;
	}

	public static function sanitize_variable_name( $name ): string {
		$name = strtolower( trim( (string) $name ) );
		if ( '' === $name ) {
			return '';
		}
		if ( ! str_starts_with( $name, '--' ) ) {
			$name = '--' . ltrim( $name, '-' );
		}
		$name = preg_replace( '/[^a-z0-9_-]/', '', $name ) ?: '';
		return ( strlen( $name ) > 2 && str_starts_with( $name, '--' ) ) ? substr( $name, 0, 80 ) : '';
	}

	public static function sanitize_class_name( $name ): string {
		$name = trim( (string) $name );
		if ( '' === $name ) {
			return '';
		}
		if ( ! str_starts_with( $name, '.' ) ) {
			$name = '.' . ltrim( $name, '.' );
		}
		$name = preg_replace( '/[^a-zA-Z0-9._-]/', '', $name ) ?: '';
		if ( ! preg_match( '/^\.[a-zA-Z_][a-zA-Z0-9_-]*$/', $name ) ) {
			return '';
		}
		return substr( $name, 0, 80 );
	}

	public static function sanitize_css_value( $value ): string {
		$value = substr( wp_strip_all_tags( (string) $value ), 0, 500 );
		$value = preg_replace( '/[{};]/', '', $value ) ?: '';
		$value = preg_replace( '/(?:expression|javascript|behavior|-moz-binding)/i', '', $value ) ?: '';
		return trim( $value );
	}

	public static function sanitize_declarations( $css ): string {
		$css = substr( wp_strip_all_tags( (string) $css ), 0, 8000 );
		$css = preg_replace( '/[{}]/', '', $css ) ?: '';
		$css = preg_replace( '/(?:expression|javascript|behavior|-moz-binding|@import)\s*[:(]?[^;]*/i', '', $css ) ?: '';
		return trim( $css );
	}

	/**
	 * Compile managed tokens into the marked stylesheet block body (no markers).
	 */
	public static function compile_block( ?array $registry = null ): string {
		$registry = $registry ?? self::get();
		$lines    = array();

		if ( $registry['variables'] ) {
			$lines[] = ':root {';
			foreach ( $registry['variables'] as $var ) {
				$lines[] = "\t{$var['name']}: {$var['value']};";
			}
			$lines[] = '}';
			$lines[] = '';
		}

		foreach ( $registry['classes'] as $class ) {
			$lines[] = "{$class['name']} {";
			foreach ( preg_split( '/\s*;\s*/', $class['css'] ) ?: array() as $decl ) {
				$decl = trim( $decl );
				if ( '' === $decl ) {
					continue;
				}
				if ( ! str_ends_with( $decl, ';' ) ) {
					$decl .= ';';
				}
				$lines[] = "\t{$decl}";
			}
			$lines[] = '}';
			$lines[] = '';
		}

		return trim( implode( "\n", $lines ) );
	}
}

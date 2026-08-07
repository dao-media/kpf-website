<?php

declare(strict_types=1);

namespace KPF\Core\Design\Tokens;

/**
 * Lightweight CSS / HTML token extraction (v1 — no full AST).
 */
final class Parser {
	public const MARKER_START = '/* kpf-tokens:start */';
	public const MARKER_END   = '/* kpf-tokens:end */';

	/**
	 * Strip the managed tokens block from stylesheet CSS.
	 */
	public static function strip_tokens_block( string $css ): string {
		$pattern = '/' . preg_quote( self::MARKER_START, '/' ) . '.*?' . preg_quote( self::MARKER_END, '/' ) . '/s';
		$next    = preg_replace( $pattern, '', $css );
		return trim( is_string( $next ) ? $next : $css );
	}

	/**
	 * Insert or replace the managed tokens block.
	 */
	public static function upsert_tokens_block( string $css, string $block_body ): string {
		$outside = self::strip_tokens_block( $css );
		$body    = trim( $block_body );
		if ( '' === $body ) {
			return $outside;
		}
		$block = self::MARKER_START . "\n" . $body . "\n" . self::MARKER_END;
		if ( '' === $outside ) {
			return $block;
		}
		return $block . "\n\n" . $outside;
	}

	/**
	 * @return array{variables: array<string, string>, classes: array<string, string>}
	 */
	public static function extract_from_css( string $css ): array {
		$css = self::strip_comments_except_markers( $css );
		$css = self::strip_at_rules( $css );

		$variables = array();
		if ( preg_match_all( '/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}{]+)/', $css, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $match ) {
				$name = Registry::sanitize_variable_name( $match[1] );
				if ( '' === $name ) {
					continue;
				}
				$variables[ $name ] = Registry::sanitize_css_value( $match[2] );
			}
		}

		$classes = array();
		if ( preg_match_all( '/(^|[{},])\s*(\.[a-zA-Z_][a-zA-Z0-9_-]*)\s*\{([^{}]*)\}/s', $css, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $match ) {
				$name = Registry::sanitize_class_name( $match[2] );
				if ( '' === $name ) {
					continue;
				}
				$classes[ $name ] = Registry::sanitize_declarations( $match[3] );
			}
		}

		return array(
			'variables' => $variables,
			'classes'   => $classes,
		);
	}

	/**
	 * @return list<string> Class names with leading dot.
	 */
	public static function extract_classes_from_html( string $html ): array {
		$found = array();
		if ( ! preg_match_all( '/\bclass\s*=\s*(["\'])(.*?)\1/is', $html, $matches ) ) {
			return array();
		}
		foreach ( $matches[2] as $attr ) {
			foreach ( preg_split( '/\s+/', (string) $attr ) ?: array() as $token ) {
				$token = trim( $token );
				$name  = Registry::sanitize_class_name( '.' . ltrim( $token, '.' ) );
				if ( '' !== $name ) {
					$found[ $name ] = true;
				}
			}
		}
		return array_keys( $found );
	}

	public static function replace_variable_value( string $css, string $name, string $value ): string {
		$name  = Registry::sanitize_variable_name( $name );
		$value = Registry::sanitize_css_value( $value );
		if ( '' === $name ) {
			return $css;
		}
		$pattern = '/(' . preg_quote( $name, '/' ) . '\s*:\s*)([^;}{]+)/';
		$next    = preg_replace( $pattern, '${1}' . $value, $css );
		return is_string( $next ) ? $next : $css;
	}

	public static function rename_variable( string $css, string $old, string $new ): string {
		$old = Registry::sanitize_variable_name( $old );
		$new = Registry::sanitize_variable_name( $new );
		if ( '' === $old || '' === $new || $old === $new ) {
			return $css;
		}
		$css = str_replace( $old, $new, $css );
		return $css;
	}

	public static function replace_class_declarations( string $css, string $name, string $declarations ): string {
		$name = Registry::sanitize_class_name( $name );
		$decl = Registry::sanitize_declarations( $declarations );
		if ( '' === $name ) {
			return $css;
		}
		$pattern = '/(' . preg_quote( $name, '/' ) . '\s*\{)([^{}]*)(\})/s';
		$next    = preg_replace_callback(
			$pattern,
			static function ( array $m ) use ( $decl ): string {
				$body = '' === $decl ? '' : "\n\t" . str_replace( ';', ";\n\t", rtrim( $decl, ';' ) ) . ";\n";
				return $m[1] . $body . $m[3];
			},
			$css
		);
		return is_string( $next ) ? $next : $css;
	}

	public static function rename_class_in_css( string $css, string $old, string $new ): string {
		$old = Registry::sanitize_class_name( $old );
		$new = Registry::sanitize_class_name( $new );
		if ( '' === $old || '' === $new || $old === $new ) {
			return $css;
		}
		$old_bare = substr( $old, 1 );
		$new_bare = substr( $new, 1 );
		$pattern  = '/\.' . preg_quote( $old_bare, '/' ) . '(?![a-zA-Z0-9_-])/';
		$next     = preg_replace( $pattern, '.' . $new_bare, $css );
		return is_string( $next ) ? $next : $css;
	}

	public static function rename_class_in_html( string $html, string $old, string $new ): string {
		$old = Registry::sanitize_class_name( $old );
		$new = Registry::sanitize_class_name( $new );
		if ( '' === $old || '' === $new || $old === $new ) {
			return $html;
		}
		$old_bare = substr( $old, 1 );
		$new_bare = substr( $new, 1 );

		$next = preg_replace_callback(
			'/\bclass\s*=\s*(["\'])(.*?)\1/is',
			static function ( array $m ) use ( $old_bare, $new_bare ): string {
				$parts = preg_split( '/\s+/', (string) $m[2] ) ?: array();
				$parts = array_map(
					static function ( string $token ) use ( $old_bare, $new_bare ): string {
						return $token === $old_bare ? $new_bare : $token;
					},
					$parts
				);
				return 'class=' . $m[1] . implode( ' ', $parts ) . $m[1];
			},
			$html
		);
		return is_string( $next ) ? $next : $html;
	}

	private static function strip_comments_except_markers( string $css ): string {
		$css = str_replace( array( self::MARKER_START, self::MARKER_END ), array( '/*KPF_TOK_S*/', '/*KPF_TOK_E*/' ), $css );
		$css = preg_replace( '/\/\*.*?\*\//s', '', $css ) ?: $css;
		return str_replace( array( '/*KPF_TOK_S*/', '/*KPF_TOK_E*/' ), array( self::MARKER_START, self::MARKER_END ), $css );
	}

	private static function strip_at_rules( string $css ): string {
		// Drop @keyframes / @font-face bodies so we don't pull their selectors.
		$next = preg_replace( '/@(?:keyframes|font-face)[^{]*\{(?:[^{}]++|\{[^{}]*\})*\}/i', '', $css );
		return is_string( $next ) ? $next : $css;
	}
}

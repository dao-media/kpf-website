<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

/**
 * Ships the foundation + pages CSS (Documentary Ember / Option 3) and seeds
 * them into the global stylesheet when the CMS copy is empty / missing pages.
 */
final class Defaults {
	public const PAGES_MARKER = '/* === KPF_PAGES_LAYER === */';

	public static function register(): void {
		add_action( 'init', array( self::class, 'seed_if_empty' ), 30 );
		add_action( 'init', array( self::class, 'ensure_pages_layer' ), 31 );
	}

	public static function path(): string {
		return KPF_CORE_PATH . 'assets/stylesheet/foundation.css';
	}

	public static function pages_path(): string {
		return KPF_CORE_PATH . 'assets/stylesheet/pages.css';
	}

	/**
	 * Read and sanitize a single stylesheet file.
	 */
	public static function read_css( string $path ): string {
		if ( ! is_readable( $path ) ) {
			return '';
		}

		$raw = file_get_contents( $path );
		if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
			return '';
		}

		return Meta::sanitize_css( $raw );
	}

	public static function foundation_css(): string {
		return self::read_css( self::path() );
	}

	public static function pages_css(): string {
		return self::read_css( self::pages_path() );
	}

	/**
	 * Full shipped CSS: foundation tokens/components + pages layout/chrome.
	 */
	public static function css(): string {
		$parts = array_filter(
			array(
				self::foundation_css(),
				self::pages_css(),
			)
		);

		if ( ! $parts ) {
			return '';
		}

		return Meta::sanitize_css( implode( "\n\n", $parts ) );
	}

	/**
	 * Populate the singleton stylesheet once when it has no CSS yet.
	 */
	public static function seed_if_empty(): void {
		$post_id = Meta::ensure_stylesheet();
		if ( $post_id < 1 ) {
			return;
		}

		$current = Meta::get_css( $post_id );
		if ( '' !== $current ) {
			return;
		}

		$css = self::css();
		if ( '' === $css ) {
			return;
		}

		update_post_meta( $post_id, Meta::CSS_META, $css );
	}

	/**
	 * Byte offset of the first pages layer (marker or the shipped file header).
	 * Older CPT copies appended pages.css without the marker, which left
	 * megabytes of duplicates on the public stylesheet.
	 *
	 * @return int|false
	 */
	public static function pages_layer_index( string $css ): int|false {
		$marker = strpos( $css, self::PAGES_MARKER );
		if ( preg_match( '/\/\*\*?[\s\*]*KPF Pages stylesheet/', $css, $match, PREG_OFFSET_CAPTURE ) ) {
			$header = (int) $match[0][1];
			if ( false === $marker ) {
				return $header;
			}
			return min( $marker, $header );
		}

		return $marker;
	}

	/**
	 * Append the pages layer when an existing CMS stylesheet predates pages.css.
	 * If a pages copy already exists (marker or file header), refresh that
	 * segment from disk — never append another copy.
	 */
	public static function ensure_pages_layer(): void {
		$post_id = Meta::ensure_stylesheet();
		if ( $post_id < 1 ) {
			return;
		}

		$current = Meta::get_css( $post_id );
		$pages   = self::pages_css();
		if ( '' === $pages ) {
			return;
		}

		if ( '' === $current ) {
			update_post_meta( $post_id, Meta::CSS_META, Meta::sanitize_css( $pages ) );
			return;
		}

		$merged = self::replace_pages_layer( $current, $pages );
		if ( $merged === $current || strlen( $merged ) > Meta::MAX_BYTES ) {
			return;
		}

		update_post_meta( $post_id, Meta::CSS_META, Meta::sanitize_css( $merged ) );
	}

	/**
	 * CSS without the pages layer (Faust already imports pages.css via webpack).
	 */
	public static function strip_pages_layer( string $css ): string {
		$pos = self::pages_layer_index( $css );
		return trim( false === $pos ? $css : substr( $css, 0, $pos ) );
	}

	/**
	 * Public Faust overlay: managed token deltas only.
	 * Webpack already ships foundation.css (components.css) and pages.css.
	 */
	public static function public_overlay_css( string $css ): string {
		$without_pages = self::strip_pages_layer( $css );
		if ( '' === $without_pages ) {
			return '';
		}

		$start = \KPF\Core\Design\Tokens\Parser::MARKER_START;
		$end   = \KPF\Core\Design\Tokens\Parser::MARKER_END;
		if ( preg_match( '/' . preg_quote( $start, '/' ) . '.*?' . preg_quote( $end, '/' ) . '/s', $without_pages, $match ) ) {
			return trim( $match[0] );
		}

		return '';
	}

	/**
	 * Replace an existing pages layer block (from first header/marker to EOF).
	 */
	public static function replace_pages_layer( string $current, string $pages ): string {
		$pos = self::pages_layer_index( $current );
		if ( false === $pos ) {
			return rtrim( $current ) . "\n\n" . $pages;
		}

		$before = rtrim( substr( $current, 0, $pos ) );
		return '' === $before ? $pages : $before . "\n\n" . $pages;
	}

	/**
	 * Force-replace the live stylesheet with the shipped foundation + pages files.
	 * Intended for local bootstrap / explicit resets — not called on every request.
	 */
	public static function apply_foundation(): bool {
		$post_id = Meta::ensure_stylesheet();
		$css     = self::css();
		if ( $post_id < 1 || '' === $css ) {
			return false;
		}

		update_post_meta( $post_id, Meta::CSS_META, $css );
		wp_update_post(
			array(
				'ID'                => $post_id,
				'post_modified'     => current_time( 'mysql' ),
				'post_modified_gmt' => current_time( 'mysql', true ),
			)
		);

		return true;
	}
}

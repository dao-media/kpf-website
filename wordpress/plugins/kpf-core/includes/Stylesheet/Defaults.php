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
	 * Append the pages layer when an existing CMS stylesheet predates pages.css.
	 * If the marker already exists, refresh the pages segment from disk so
	 * responsive/layout updates ship without wiping custom foundation edits.
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

		if ( str_contains( $current, self::PAGES_MARKER ) ) {
			$merged = self::replace_pages_layer( $current, $pages );
		} else {
			$merged = rtrim( $current ) . "\n\n" . $pages;
		}

		if ( $merged === $current || strlen( $merged ) > Meta::MAX_BYTES ) {
			return;
		}

		update_post_meta( $post_id, Meta::CSS_META, Meta::sanitize_css( $merged ) );
	}

	/**
	 * CSS without the pages layer (Faust already imports pages.css via webpack).
	 */
	public static function strip_pages_layer( string $css ): string {
		$pos = strpos( $css, self::PAGES_MARKER );
		return trim( false === $pos ? $css : substr( $css, 0, $pos ) );
	}

	/**
	 * Replace an existing pages layer block (from marker to EOF or next ship marker).
	 */
	public static function replace_pages_layer( string $current, string $pages ): string {
		$marker = self::PAGES_MARKER;
		$pos    = strpos( $current, $marker );
		if ( false === $pos ) {
			return rtrim( $current ) . "\n\n" . $pages;
		}

		// Drop the previous pages segment (from marker through end).
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

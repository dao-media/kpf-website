<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

/**
 * Ships the foundation CSS (Documentary Ember / Option 3) and seeds it
 * into the global stylesheet when the CMS copy is still empty.
 */
final class Defaults {
	public static function register(): void {
		add_action( 'init', array( self::class, 'seed_if_empty' ), 30 );
	}

	public static function path(): string {
		return KPF_CORE_PATH . 'assets/stylesheet/foundation.css';
	}

	public static function css(): string {
		$path = self::path();
		if ( ! is_readable( $path ) ) {
			return '';
		}

		$raw = file_get_contents( $path );
		if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
			return '';
		}

		return Meta::sanitize_css( $raw );
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
	 * Force-replace the live stylesheet with the shipped foundation file.
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

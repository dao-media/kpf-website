<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

/**
 * Enqueue shipped foundation + pages stylesheets for classic WP
 * (blank theme, block editor canvas) so markup using .kpf-* classes
 * previews correctly. Faust/Next receives the same CSS via GraphQL
 * (Defaults seed → public CSS URL) and a frontend mirror import.
 */
final class Assets {
	public const FOUNDATION_HANDLE = 'kpf-foundation';
	public const PAGES_HANDLE      = 'kpf-pages';

	public static function register(): void {
		add_action( 'wp_enqueue_scripts', array( self::class, 'enqueue' ), 20 );
		add_action( 'enqueue_block_assets', array( self::class, 'enqueue' ), 20 );
	}

	public static function enqueue(): void {
		$foundation = Defaults::path();
		$pages      = Defaults::pages_path();
		$version    = defined( 'KPF_CORE_VERSION' ) ? KPF_CORE_VERSION : '1.0.0';

		if ( is_readable( $foundation ) ) {
			wp_enqueue_style(
				self::FOUNDATION_HANDLE,
				KPF_CORE_URL . 'assets/stylesheet/foundation.css',
				array(),
				$version . '.' . (string) filemtime( $foundation )
			);
		}

		if ( is_readable( $pages ) ) {
			wp_enqueue_style(
				self::PAGES_HANDLE,
				KPF_CORE_URL . 'assets/stylesheet/pages.css',
				array( self::FOUNDATION_HANDLE ),
				$version . '.' . (string) filemtime( $pages )
			);
		}
	}
}

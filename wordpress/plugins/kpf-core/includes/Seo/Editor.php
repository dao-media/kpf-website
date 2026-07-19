<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

/**
 * In-canvas SEO panel for blog posts (pages use the dedicated page editor).
 */
final class Editor {
	private const SCREEN_POST_TYPES = array( 'post' );

	public static function register(): void {
		add_action( 'enqueue_block_editor_assets', array( self::class, 'enqueue' ) );
	}

	public static function enqueue(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->post_type, self::SCREEN_POST_TYPES, true ) ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/seo-editor.asset.php';
		$asset      = is_readable( $asset_file ) ? require $asset_file : array(
			'dependencies' => array(
				'wp-plugins',
				'wp-element',
				'wp-components',
				'wp-data',
				'wp-core-data',
				'wp-i18n',
				'wp-api-fetch',
				'media-editor',
			),
			'version'      => KPF_CORE_VERSION,
		);

		wp_enqueue_media();

		$style_file = KPF_CORE_PATH . 'build/style-seo-editor.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-seo-editor',
				KPF_CORE_URL . 'build/style-seo-editor.css',
				array(),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-seo-editor',
			KPF_CORE_URL . 'build/seo-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-seo-editor',
			'kpfSeoEditor',
			array(
				'restUrl'   => esc_url_raw( rest_url( 'kpf-seo/v1' ) ),
				'nonce'     => wp_create_nonce( 'wp_rest' ),
				'metaKey'   => MetaRepository::META_KEY,
				'postTypes' => self::SCREEN_POST_TYPES,
			)
		);
	}
}

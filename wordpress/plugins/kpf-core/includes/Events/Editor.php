<?php

declare(strict_types=1);

namespace KPF\Core\Events;

final class Editor {
	public static function register(): void {
		add_action( 'enqueue_block_editor_assets', array( self::class, 'enqueue' ) );
	}

	public static function enqueue(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ContentType::POST_TYPE !== $screen->post_type ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/events-editor.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array(
					'wp-api-fetch',
					'wp-block-editor',
					'wp-components',
					'wp-core-data',
					'wp-data',
					'wp-element',
					'wp-i18n',
					'wp-plugins',
					'wp-editor',
				),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_media();
		wp_enqueue_script(
			'kpf-events-editor',
			KPF_CORE_URL . 'build/events-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-events-editor',
			'kpfEventsEditor',
			array(
				'metaKey'      => Meta::META_KEY,
				'hostTaxonomy' => ContentType::HOST_TAXONOMY,
			)
		);
	}
}

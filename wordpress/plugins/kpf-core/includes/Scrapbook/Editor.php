<?php

declare(strict_types=1);

namespace KPF\Core\Scrapbook;

final class Editor {
	public static function register(): void {
		add_action('enqueue_block_editor_assets', array( self::class, 'enqueue' ));
	}

	public static function enqueue(): void {
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;
		if (! $screen || ContentType::POST_TYPE !== $screen->post_type) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/scrapbook-editor.asset.php';
		$asset      = is_readable($asset_file)
			? require $asset_file
			: array(
				'dependencies' => array(
					'wp-block-editor',
					'wp-components',
					'wp-core-data',
					'wp-data',
					'wp-edit-post',
					'wp-element',
					'wp-i18n',
					'wp-plugins',
				),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_media();
		wp_enqueue_script(
			'kpf-scrapbook-editor',
			KPF_CORE_URL . 'build/scrapbook-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-scrapbook-editor',
			'kpfScrapbookEditor',
			array(
				'metaKey' => Meta::META_KEY,
			)
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class Editor {
	public static function register(): void {
		add_action('enqueue_block_editor_assets', array( self::class, 'enqueue' ));
	}

	public static function enqueue(): void {
		$asset_file = KPF_CORE_PATH . 'build/seo-editor.asset.php';
		$asset      = is_readable($asset_file) ? require $asset_file : array(
			'dependencies' => array(
				'wp-plugins',
				'wp-edit-post',
				'wp-element',
				'wp-components',
				'wp-data',
				'wp-core-data',
				'wp-i18n',
				'wp-api-fetch',
			),
			'version'      => KPF_CORE_VERSION,
		);

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
				'restUrl' => esc_url_raw(rest_url('kpf-seo/v1')),
				'nonce'   => wp_create_nonce('wp_rest'),
				'metaKey' => MetaRepository::META_KEY,
			)
		);
	}
}

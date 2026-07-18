<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

final class Editor {
	public static function register(): void {
		add_action( 'enqueue_block_editor_assets', array( self::class, 'enqueue' ) );
	}

	public static function enqueue(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'page' !== $screen->post_type ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/designs-editor.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array(
					'react-jsx-runtime',
					'wp-api-fetch',
					'wp-components',
					'wp-core-data',
					'wp-data',
					'wp-editor',
					'wp-element',
					'wp-i18n',
					'wp-plugins',
				),
				'version'      => KPF_CORE_VERSION,
			);

		wp_enqueue_script(
			'kpf-designs-editor',
			KPF_CORE_URL . 'build/designs-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-designs-editor',
			'kpfDesignsEditor',
			array(
				'pageFieldsKey' => Meta::PAGE_FIELDS_META,
				'pageDesignKey' => Meta::PAGE_DESIGN_META,
				'designsUrl'    => admin_url( 'edit.php?post_type=page&page=' . ContentType::MENU_SLUG ),
				'nonce'         => wp_create_nonce( 'wp_rest' ),
			)
		);
	}
}

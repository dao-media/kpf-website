<?php

declare(strict_types=1);

namespace KPF\Core\Grantees;

final class Editor {
	public static function register(): void {
		add_action( 'enqueue_block_editor_assets', array( self::class, 'enqueue' ) );
	}

	public static function enqueue(): void {
		$post_type = '';
		$screen    = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && is_string( $screen->post_type ) ) {
			$post_type = $screen->post_type;
		} elseif ( isset( $_GET['post_type'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$post_type = sanitize_key( wp_unslash( (string) $_GET['post_type'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		} elseif ( isset( $_GET['post'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$post_type = get_post_type( absint( $_GET['post'] ) ) ?: ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		}
		if ( ContentType::POST_TYPE !== $post_type ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/grantee-editor.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array(
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
			'kpf-grantee-editor',
			KPF_CORE_URL . 'build/grantee-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-grantee-editor',
			'kpfGranteeEditor',
			array(
				'metaKey' => Meta::META_KEY,
			)
		);
	}
}

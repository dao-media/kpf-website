<?php

declare(strict_types=1);

namespace KPF\Core\Pages;

use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Designs\Placeholders;
use KPF\Core\Seo\MetaRepository;

/**
 * Replaces the Gutenberg page editor with a dedicated KPF page editor.
 */
final class Editor {
	private static bool $rendered = false;

	public static function register(): void {
		add_filter( 'replace_editor', array( self::class, 'replace' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	/**
	 * @param bool     $replace Whether the editor is replaced.
	 * @param \WP_Post $post    Post being edited.
	 */
	public static function replace( $replace, $post ): bool {
		if ( $replace || ! $post instanceof \WP_Post || 'page' !== $post->post_type ) {
			return (bool) $replace;
		}

		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			return false;
		}

		// WordPress (and some plugins) probe replace_editor before load-post.php.
		// Claim the custom editor then, but only print the shell on the real screen.
		$on_edit_screen = did_action( 'load-post.php' ) || did_action( 'load-post-new.php' );
		if ( ! $on_edit_screen ) {
			return true;
		}

		// post.php skips admin-header when replace_editor wins; load it ourselves.
		// Skip under WP-CLI / cron — those contexts only probe the filter.
		$can_load_header = ! ( defined( 'WP_CLI' ) && WP_CLI ) && ! wp_doing_cron();
		if ( $can_load_header && ! did_action( 'admin_enqueue_scripts' ) ) {
			require_once ABSPATH . 'wp-admin/admin-header.php';
		}

		self::render( $post );
		return true;
	}

	public static function render( \WP_Post $post ): void {
		if ( self::$rendered ) {
			return;
		}
		self::$rendered = true;

		$title = __( 'Edit Page', 'kpf-core' );
		if ( '' !== trim( $post->post_title ) ) {
			$title = sprintf(
				/* translators: %s: page title */
				__( 'Edit Page “%s”', 'kpf-core' ),
				$post->post_title
			);
		}

		echo '<div class="wrap kpf-page-editor-wrap">';
		echo '<h1 class="wp-heading-inline">' . esc_html( $title ) . '</h1>';
		echo '<hr class="wp-header-end" />';
		echo '<div id="kpf-page-editor-root" class="kpf-page-editor-root" data-page-id="' . esc_attr( (string) $post->ID ) . '"></div>';
		echo '</div>';
	}

	public static function enqueue( string $hook ): void {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'page' !== $screen->post_type ) {
			return;
		}

		$post_id = 0;
		if ( 'post.php' === $hook && isset( $_GET['post'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$post_id = absint( wp_unslash( (string) $_GET['post'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		}

		$asset_file = KPF_CORE_PATH . 'build/page-editor.asset.php';
		$asset      = is_readable( $asset_file ) ? require $asset_file : array(
			'dependencies' => array(
				'wp-element',
				'wp-components',
				'wp-api-fetch',
				'wp-i18n',
				'wp-data',
				'wp-core-data',
				'media-editor',
				'media-views',
			),
			'version'      => KPF_CORE_VERSION,
		);

		wp_enqueue_media();
		wp_enqueue_style( 'wp-components' );

		foreach ( array( 'page-editor.css', 'style-page-editor.css' ) as $stylesheet ) {
			$style_file = KPF_CORE_PATH . 'build/' . $stylesheet;
			if ( ! is_readable( $style_file ) ) {
				continue;
			}
			wp_enqueue_style(
				'kpf-page-editor-' . sanitize_key( $stylesheet ),
				KPF_CORE_URL . 'build/' . $stylesheet,
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-page-editor',
			KPF_CORE_URL . 'build/page-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-page-editor',
			'kpfPageEditor',
			array(
				'restUrl'       => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'seoRestUrl'    => esc_url_raw( rest_url( 'kpf-seo/v1' ) ),
				'nonce'         => wp_create_nonce( 'wp_rest' ),
				'pageId'        => $post_id,
				'seoMetaKey'    => MetaRepository::META_KEY,
				'designMetaKey' => DesignsMeta::PAGE_DESIGN_META,
				'fieldsMetaKey' => DesignsMeta::PAGE_FIELDS_META,
				'designsUrl'    => admin_url( 'edit.php?post_type=page&page=' . DesignsContentType::MENU_SLUG ),
				'pagesUrl'      => admin_url( 'edit.php?post_type=page' ),
				'designTags'    => Placeholders::editor_field_tags(),
			)
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Events;

final class Editor {
	public static function register(): void {
		add_action( 'add_meta_boxes', array( self::class, 'meta_boxes' ) );
		add_action( 'enqueue_block_editor_assets', array( self::class, 'enqueue' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue_admin' ) );
		add_filter( 'block_editor_settings_all', array( self::class, 'editor_settings' ), 20, 2 );
	}

	public static function meta_boxes(): void {
		add_meta_box(
			'kpf-event-details',
			__( 'Event details', 'kpf-core' ),
			static function (): void {
				echo '<div id="kpf-events-editor-root" class="kpf-events-editor-root"></div>';
			},
			ContentType::POST_TYPE,
			'normal',
			'high'
		);
	}

	public static function enqueue_admin( string $hook ): void {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}
		self::enqueue();
	}

	public static function enqueue(): void {
		$post_type = self::current_post_type();
		if ( ContentType::POST_TYPE !== $post_type ) {
			return;
		}

		// Avoid double-enqueue from admin_enqueue_scripts + block editor hook.
		if ( wp_script_is( 'kpf-events-editor', 'enqueued' ) ) {
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

		wp_register_style( 'kpf-events-editor', false, array(), (string) $asset['version'] );
		wp_enqueue_style( 'kpf-events-editor' );
		wp_add_inline_style(
			'kpf-events-editor',
			self::editor_chrome_css() . self::editor_app_css()
		);
	}

	/**
	 * Inject canvas CSS into the iframed block editor (title + hide empty blocks).
	 *
	 * @param array<string, mixed> $settings
	 * @param \WP_Block_Editor_Context $context
	 * @return array<string, mixed>
	 */
	public static function editor_settings( $settings, $context ) {
		$post_type = '';
		if ( is_object( $context ) && isset( $context->post ) && $context->post instanceof \WP_Post ) {
			$post_type = (string) $context->post->post_type;
		}
		if ( ContentType::POST_TYPE !== $post_type ) {
			return $settings;
		}
		if ( ! is_array( $settings ) ) {
			return $settings;
		}

		$settings['styles']   = isset( $settings['styles'] ) && is_array( $settings['styles'] )
			? $settings['styles']
			: array();
		$settings['styles'][] = array(
			'css' => self::editor_canvas_css(),
		);

		return $settings;
	}

	/**
	 * Parent-document chrome: keep a visible title band; do not collapse the iframed canvas to 0.
	 */
	public static function editor_chrome_css(): string {
		return <<<'CSS'
body.post-type-kpf_event .editor-visual-editor,
body.post-type-kpf_event .edit-post-visual-editor{
	flex-grow:0;
	flex-shrink:0;
	/* Title lives in the iframe — a 0-height host clips it completely */
	min-height:6.5rem;
	height:auto;
}
body.post-type-kpf_event .editor-visual-editor.is-iframed iframe[name="editor-canvas"]{
	min-height:6.5rem;
}
CSS;
	}

	/**
	 * Styles that run inside the editor canvas iframe.
	 */
	public static function editor_canvas_css(): string {
		return <<<'CSS'
.editor-visual-editor__post-title-wrapper,
.edit-post-visual-editor__post-title-wrapper,
.editor-post-title,
.wp-block-post-title,
[data-type="core/post-title"]{
	display:block!important;
	visibility:visible!important;
	opacity:1!important;
	height:auto!important;
	min-height:3.5rem;
}
.block-editor-block-list__layout{min-height:0}
.block-editor-default-block-appender,
.block-list-appender,
.is-root-container > .block-list-appender,
.is-root-container > .wp-block:not([data-type="core/post-title"]):not(.editor-post-title):not(.wp-block-post-title){
	display:none!important;
}
CSS;
	}

	public static function editor_app_css(): string {
		return <<<'CSS'
.kpf-events-editor-root{min-height:120px}
.kpf-events-editor-app{display:grid;gap:22px}
.kpf-events-editor-app__intro{margin:0;color:#646970}
.kpf-events-editor-app__section{display:grid;gap:12px;padding-top:4px}
.kpf-events-editor-app__section h3{margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#1e1e1e}
.kpf-events-editor-app .components-base-control{margin-bottom:8px}
CSS;
	}

	private static function current_post_type(): string {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && is_string( $screen->post_type ) && '' !== $screen->post_type ) {
			return $screen->post_type;
		}
		if ( isset( $_GET['post_type'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return sanitize_key( wp_unslash( (string) $_GET['post_type'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		}
		if ( isset( $_GET['post'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return get_post_type( absint( $_GET['post'] ) ) ?: ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		}
		return '';
	}
}

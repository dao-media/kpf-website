<?php

declare(strict_types=1);

namespace KPF\Core\Team;

use KPF\Core\Seo\MetaRepository;

/**
 * Replaces the Gutenberg team editor with a dedicated one-column KPF editor.
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
		if ( $replace || ! $post instanceof \WP_Post || ContentType::POST_TYPE !== $post->post_type ) {
			return (bool) $replace;
		}

		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			return false;
		}

		$on_edit_screen = did_action( 'load-post.php' ) || did_action( 'load-post-new.php' );
		if ( ! $on_edit_screen ) {
			return true;
		}

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

		$title = __( 'Edit Team Member', 'kpf-core' );
		if ( '' !== trim( $post->post_title ) ) {
			$title = sprintf(
				/* translators: %s: team member name */
				__( 'Edit Team Member “%s”', 'kpf-core' ),
				$post->post_title
			);
		}

		echo '<div class="wrap kpf-team-editor-wrap">';
		echo '<h1 class="wp-heading-inline">' . esc_html( $title ) . '</h1>';
		echo '<hr class="wp-header-end" />';
		echo '<div id="kpf-team-editor-root" class="kpf-team-editor-root" data-member-id="' . esc_attr( (string) $post->ID ) . '"></div>';
		echo '</div>';
	}

	public static function enqueue( string $hook ): void {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ContentType::POST_TYPE !== $screen->post_type ) {
			return;
		}

		$post_id = 0;
		if ( 'post.php' === $hook && isset( $_GET['post'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$post_id = absint( wp_unslash( (string) $_GET['post'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		} elseif ( isset( $GLOBALS['post'] ) && $GLOBALS['post'] instanceof \WP_Post ) {
			$post_id = (int) $GLOBALS['post']->ID;
		}

		$asset_file = KPF_CORE_PATH . 'build/team-editor.asset.php';
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

		foreach ( array( 'team-editor.css', 'style-team-editor.css' ) as $stylesheet ) {
			$style_file = KPF_CORE_PATH . 'build/' . $stylesheet;
			if ( ! is_readable( $style_file ) ) {
				continue;
			}
			wp_enqueue_style(
				'kpf-team-editor-' . sanitize_key( $stylesheet ),
				KPF_CORE_URL . 'build/' . $stylesheet,
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-team-editor',
			KPF_CORE_URL . 'build/team-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-team-editor',
			'kpfTeamEditor',
			array(
				'restUrl'     => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'seoRestUrl'  => esc_url_raw( rest_url( 'kpf-seo/v1' ) ),
				'nonce'       => wp_create_nonce( 'wp_rest' ),
				'memberId'    => $post_id,
				'metaKey'     => Meta::META_KEY,
				'seoMetaKey'  => MetaRepository::META_KEY,
				'socialTypes' => Meta::SOCIAL_TYPES,
				'teamUrl'     => admin_url( 'edit.php?post_type=' . ContentType::POST_TYPE ),
			)
		);
	}
}

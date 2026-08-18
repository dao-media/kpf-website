<?php

declare(strict_types=1);

namespace KPF\Core\Kevin;

use WP_Post;
use WP_Screen;

/**
 * Admin list polish for Kevin slides.
 */
final class Admin {
	public static function register(): void {
		add_filter( 'manage_' . ContentType::POST_TYPE . '_posts_columns', array( self::class, 'columns' ) );
		add_action( 'manage_' . ContentType::POST_TYPE . '_posts_custom_column', array( self::class, 'render_column' ), 10, 2 );
		add_filter( 'manage_edit-' . ContentType::POST_TYPE . '_sortable_columns', array( self::class, 'sortable_columns' ) );
		add_filter( 'admin_post_thumbnail_html', array( self::class, 'thumbnail_help' ), 10, 3 );
		add_action( 'admin_notices', array( self::class, 'editor_notice' ) );
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns( array $columns ): array {
		$next = array();
		foreach ( $columns as $key => $label ) {
			if ( 'title' === $key ) {
				$next['kpf_kevin_photo'] = __( 'Photo', 'kpf-core' );
			}
			$next[ $key ] = $label;
			if ( 'title' === $key ) {
				$next['kpf_kevin_order'] = __( 'Order', 'kpf-core' );
			}
		}
		return $next;
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function sortable_columns( array $columns ): array {
		$columns['kpf_kevin_order'] = 'menu_order';
		return $columns;
	}

	public static function render_column( string $column, int $post_id ): void {
		if ( 'kpf_kevin_photo' === $column ) {
			$thumb = get_the_post_thumbnail( $post_id, array( 48, 48 ) );
			echo $thumb ? wp_kses_post( $thumb ) : '&mdash;';
			return;
		}

		if ( 'kpf_kevin_order' === $column ) {
			$post = get_post( $post_id );
			echo esc_html( (string) ( $post->menu_order ?? 0 ) );
		}
	}

	public static function editor_notice(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen instanceof WP_Screen ) {
			return;
		}
		if ( ContentType::POST_TYPE !== $screen->post_type ) {
			return;
		}
		if ( ! in_array( $screen->base, array( 'post', 'post-new' ), true ) ) {
			return;
		}

		echo '<div class="notice notice-info"><p>';
		echo wp_kses(
			self::image_size_message(),
			array(
				'strong' => array(),
			)
		);
		echo '</p></div>';
	}

	/**
	 * @param string   $content       Featured-image panel HTML.
	 * @param int      $post_id       Post ID.
	 * @param int|null $thumbnail_id  Thumbnail attachment ID.
	 */
	public static function thumbnail_help( string $content, int $post_id, $thumbnail_id = null ): string {
		unset( $thumbnail_id );
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post || ContentType::POST_TYPE !== $post->post_type ) {
			return $content;
		}

		$note = '<p class="description" style="margin-top:8px;">'
			. wp_kses(
				self::image_size_message(),
				array(
					'strong' => array(),
				)
			)
			. '</p>';

		return $content . $note;
	}

	private static function image_size_message(): string {
		return sprintf(
			/* translators: %s: recommended pixel dimensions (e.g. 1120×1296). */
			__( 'Recommended slide photo: <strong>%s</strong> portrait PNG/WebP with a <strong>transparent background</strong>. Set Order under Page Attributes so the stack matches the designed sequence. See Dashboard → Resources for the full checklist.', 'kpf-core' ),
			'1120×1296'
		);
	}
}

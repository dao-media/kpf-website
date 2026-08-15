<?php

declare(strict_types=1);

namespace KPF\Core\Kevin;

/**
 * Admin list polish for Kevin slides.
 */
final class Admin {
	public static function register(): void {
		add_filter( 'manage_' . ContentType::POST_TYPE . '_posts_columns', array( self::class, 'columns' ) );
		add_action( 'manage_' . ContentType::POST_TYPE . '_posts_custom_column', array( self::class, 'render_column' ), 10, 2 );
		add_filter( 'manage_edit-' . ContentType::POST_TYPE . '_sortable_columns', array( self::class, 'sortable_columns' ) );
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
}

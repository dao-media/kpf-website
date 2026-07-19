<?php

declare(strict_types=1);

namespace KPF\Core\Pages;

/**
 * Enhances the Pages → Manage list table.
 */
final class ListTable {
	public static function register(): void {
		add_filter( 'page_row_actions', array( self::class, 'row_actions' ), 20, 2 );
	}

	/**
	 * @param array<string, string> $actions Row actions.
	 * @return array<string, string>
	 */
	public static function row_actions( array $actions, \WP_Post $post ): array {
		if ( 'page' !== $post->post_type ) {
			return $actions;
		}

		$url = self::preview_url( $post );
		if ( '' === $url ) {
			return $actions;
		}

		$label = sprintf(
			/* translators: %s: page title */
			__( 'Preview “%s”', 'kpf-core' ),
			get_the_title( $post )
		);

		$actions['kpf_preview'] = sprintf(
			'<a href="%s" target="_blank" rel="noopener noreferrer" aria-label="%s">%s</a>',
			esc_url( $url ),
			esc_attr( $label ),
			esc_html__( 'Preview', 'kpf-core' )
		);

		// Prefer our explicit new-tab Preview over the default same-tab View/Preview.
		unset( $actions['view'], $actions['preview'] );

		return $actions;
	}

	private static function preview_url( \WP_Post $post ): string {
		if ( 'publish' === $post->post_status ) {
			$permalink = get_permalink( $post );
			return is_string( $permalink ) ? $permalink : '';
		}

		$preview = get_preview_post_link( $post );
		return is_string( $preview ) ? $preview : '';
	}
}

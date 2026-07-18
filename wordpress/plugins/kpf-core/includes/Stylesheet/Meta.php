<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

final class Meta {
	public const CSS_META        = '_kpf_global_stylesheet';
	public const HISTORY_OPTION  = 'kpf_stylesheet_history_limit';
	public const HISTORY_DEFAULT = 20;
	public const HISTORY_MIN     = 2;
	public const HISTORY_MAX     = 100;
	public const MAX_BYTES       = 1048576;

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
		add_filter( 'wp_revisions_to_keep', array( self::class, 'revisions_to_keep' ), 10, 2 );
	}

	public static function register_meta(): void {
		register_post_meta(
			ContentType::POST_TYPE,
			self::CSS_META,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => '',
				'sanitize_callback' => array( self::class, 'sanitize_css' ),
				'auth_callback'     => static fn(): bool => current_user_can( 'edit_theme_options' ),
				'revisions_enabled' => true,
			)
		);
	}

	public static function ensure_stylesheet(): int {
		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => array( 'publish', 'draft', 'private' ),
				'posts_per_page' => 1,
				'orderby'        => 'ID',
				'order'          => 'ASC',
				'fields'         => 'ids',
			)
		);
		if ( $posts ) {
			return (int) $posts[0];
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => ContentType::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => __( 'Global stylesheet', 'kpf-core' ),
			),
			true
		);
		if ( is_wp_error( $post_id ) || ! $post_id ) {
			return 0;
		}
		update_post_meta( (int) $post_id, self::CSS_META, '' );
		return (int) $post_id;
	}

	public static function get_css( int $post_id ): string {
		return self::sanitize_css( get_post_meta( $post_id, self::CSS_META, true ) );
	}

	public static function sanitize_css( $value ): string {
		$css = substr( str_replace( "\0", '', (string) $value ), 0, self::MAX_BYTES );
		$css = wp_strip_all_tags( $css );
		$css = preg_replace( '/@import\s+[^;]+;?/i', '', $css ) ?: '';
		$css = preg_replace( '/(?:expression|javascript|behavior|-moz-binding)\s*[:(][^;}]*[;}]?/i', '', $css ) ?: '';
		return trim( $css );
	}

	public static function history_limit(): int {
		$limit = absint( get_option( self::HISTORY_OPTION, self::HISTORY_DEFAULT ) );
		return max( self::HISTORY_MIN, min( self::HISTORY_MAX, $limit ) );
	}

	public static function set_history_limit( $value ): int {
		$limit = max( self::HISTORY_MIN, min( self::HISTORY_MAX, absint( $value ) ) );
		update_option( self::HISTORY_OPTION, $limit, false );
		return $limit;
	}

	public static function revisions_to_keep( int $number, \WP_Post $post ): int {
		return ContentType::POST_TYPE === $post->post_type ? self::history_limit() : $number;
	}

	public static function revision( string $css ): string {
		return hash( 'sha256', $css );
	}
}

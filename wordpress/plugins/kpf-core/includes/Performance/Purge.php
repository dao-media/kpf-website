<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

/**
 * Cache purge orchestration for admin bar, REST, and Performance UI.
 */
final class Purge {
	public const ACTION = 'kpf_performance_purge';

	/**
	 * @param array{scope?:string,url?:string} $args
	 * @return array{ok:bool,scope:string,url:?string,last_purged:string,message:string}
	 */
	public static function run( array $args = array() ): array {
		$scope = sanitize_key( (string) ( $args['scope'] ?? 'all' ) );
		if ( ! in_array( $scope, array( 'all', 'page' ), true ) ) {
			$scope = 'all';
		}

		$url = isset( $args['url'] ) ? esc_url_raw( (string) $args['url'] ) : '';
		if ( 'page' === $scope && '' === $url ) {
			$url = self::current_public_url();
		}

		if ( 'all' === $scope && function_exists( 'wp_cache_flush' ) ) {
			wp_cache_flush();
		}

		if ( 'page' === $scope && '' !== $url && function_exists( 'clean_post_cache' ) ) {
			$post_id = url_to_postid( $url );
			if ( $post_id > 0 ) {
				clean_post_cache( $post_id );
			}
		}

		self::maybe_call_cdn_purge( $scope, $url );

		$timestamp = gmdate( 'c' );
		update_option( 'kpf_performance_last_purged', $timestamp, false );

		/**
		 * Fires after a Performance cache purge is requested.
		 *
		 * @param string               $scope  'all' or 'page'.
		 * @param array<string, mixed> $settings Current performance settings.
		 * @param string               $url    Target URL when scope is page.
		 */
		do_action( 'kpf_performance_purge', $scope, Settings::get(), $url );

		$message = 'page' === $scope
			? __( 'Page cache clear requested.', 'kpf-core' )
			: __( 'Full site cache clear requested.', 'kpf-core' );

		return array(
			'ok'          => true,
			'scope'       => $scope,
			'url'         => '' !== $url ? $url : null,
			'last_purged' => $timestamp,
			'message'     => $message,
		);
	}

	public static function current_public_url(): string {
		if ( is_admin() ) {
			$post_id = self::admin_context_post_id();
			if ( $post_id > 0 ) {
				$permalink = get_permalink( $post_id );
				if ( is_string( $permalink ) && '' !== $permalink ) {
					return $permalink;
				}
			}

			if ( class_exists( '\KPF\Core\Seo\Settings' ) ) {
				$seo           = \KPF\Core\Seo\Settings::get();
				$seo_frontend  = (string) ( $seo['global']['frontend_url'] ?? '' );
				if ( '' !== $seo_frontend ) {
					return trailingslashit( $seo_frontend );
				}
			}

			return home_url( '/' );
		}

		if ( isset( $_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI'] ) ) {
			$host   = sanitize_text_field( wp_unslash( (string) $_SERVER['HTTP_HOST'] ) );
			$uri    = esc_url_raw( wp_unslash( (string) $_SERVER['REQUEST_URI'] ) );
			$scheme = is_ssl() ? 'https' : 'http';
			return $scheme . '://' . $host . $uri;
		}

		return home_url( add_query_arg( array() ) );
	}

	public static function admin_context_post_id(): int {
		$screen_post = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( $screen_post > 0 ) {
			return $screen_post;
		}

		if ( function_exists( 'get_the_ID' ) ) {
			$id = (int) get_the_ID();
			if ( $id > 0 ) {
				return $id;
			}
		}

		return 0;
	}

	public static function can_purge_page_context(): bool {
		if ( ! is_admin() ) {
			return true;
		}

		return self::admin_context_post_id() > 0;
	}

	private static function maybe_call_cdn_purge( string $scope, string $url ): void {
		$cdn = Settings::get()['cdn'] ?? array();
		if ( empty( $cdn['enabled'] ) || empty( $cdn['purge_url'] ) ) {
			return;
		}

		$body = array(
			'scope' => $scope,
			'url'   => $url,
		);

		$args = array(
			'timeout' => 8,
			'headers' => array(
				'Content-Type' => 'application/json',
			),
			'body'    => wp_json_encode( $body ),
		);

		$token = (string) ( $cdn['purge_token'] ?? '' );
		if ( '' !== $token ) {
			$args['headers']['Authorization'] = 'Bearer ' . $token;
		}

		wp_remote_post( (string) $cdn['purge_url'], $args );
	}
}

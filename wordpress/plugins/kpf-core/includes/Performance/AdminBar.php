<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

/**
 * Admin bar (topbar) controls for clearing page or full-site cache.
 */
final class AdminBar {
	public static function register(): void {
		add_action( 'admin_bar_menu', array( self::class, 'menu' ), 80 );
		add_action( 'admin_post_' . Purge::ACTION, array( self::class, 'handle' ) );
		add_action( 'admin_notices', array( self::class, 'notice' ) );
		add_action( 'wp_footer', array( self::class, 'frontend_notice' ), 99 );
		add_action( 'admin_head', array( self::class, 'styles' ) );
		add_action( 'wp_head', array( self::class, 'styles' ) );
	}

	public static function menu( \WP_Admin_Bar $bar ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$bar->add_node(
			array(
				'id'    => 'kpf-performance',
				'title' => self::parent_title(),
				'href'  => admin_url( 'admin.php?page=kpf-performance' ),
				'meta'  => array(
					'title' => __( 'Performance cache', 'kpf-core' ),
				),
			)
		);

		$page_ready = Purge::can_purge_page_context();

		$bar->add_node(
			array(
				'id'     => 'kpf-performance-purge-page',
				'parent' => 'kpf-performance',
				'title'  => __( 'Clear cache for this page', 'kpf-core' ),
				'href'   => $page_ready ? self::purge_url( 'page' ) : '#',
				'meta'   => array(
					'title' => $page_ready
						? __( 'Purge cache for the current page or post.', 'kpf-core' )
						: __( 'Open a page or post to clear its cache, or clear the full site instead.', 'kpf-core' ),
					'class' => $page_ready ? '' : 'kpf-perf-ab-disabled',
				),
			)
		);

		$bar->add_node(
			array(
				'id'     => 'kpf-performance-purge-all',
				'parent' => 'kpf-performance',
				'title'  => __( 'Clear cache for entire site', 'kpf-core' ),
				'href'   => self::purge_url( 'all' ),
				'meta'   => array(
					'title' => __( 'Purge all Performance caches for the website.', 'kpf-core' ),
				),
			)
		);

		$bar->add_node(
			array(
				'id'     => 'kpf-performance-settings',
				'parent' => 'kpf-performance',
				'title'  => __( 'Performance settings', 'kpf-core' ),
				'href'   => admin_url( 'admin.php?page=kpf-performance' ),
			)
		);
	}

	public static function handle(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to clear the cache.', 'kpf-core' ), 403 );
		}

		check_admin_referer( Purge::ACTION );

		$scope = sanitize_key( (string) ( $_GET['scope'] ?? 'all' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$url   = isset( $_GET['url'] ) ? esc_url_raw( wp_unslash( (string) $_GET['url'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 'page' === $scope && '' === $url ) {
			$url = Purge::current_public_url();
		}

		$result = Purge::run(
			array(
				'scope' => $scope,
				'url'   => $url,
			)
		);

		$redirect = wp_get_referer();
		if ( ! is_string( $redirect ) || '' === $redirect ) {
			$redirect = admin_url( 'admin.php?page=kpf-performance' );
		}

		$redirect = add_query_arg(
			array(
				'kpf_perf_purged' => rawurlencode( $result['scope'] ),
			),
			$redirect
		);

		wp_safe_redirect( $redirect );
		exit;
	}

	public static function notice(): void {
		$message = self::notice_message();
		if ( null === $message ) {
			return;
		}

		printf(
			'<div class="notice notice-success is-dismissible"><p>%s</p></div>',
			esc_html( $message )
		);
	}

	public static function frontend_notice(): void {
		if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$message = self::notice_message();
		if ( null === $message ) {
			return;
		}

		printf(
			'<div class="kpf-perf-ab-toast" role="status">%s</div>',
			esc_html( $message )
		);
	}

	public static function styles(): void {
		if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		echo '<style id="kpf-performance-admin-bar">
			#wp-admin-bar-kpf-performance-purge-page.kpf-perf-ab-disabled > .ab-item {
				opacity: 0.45;
				pointer-events: none;
			}
			.kpf-perf-ab-toast {
				background: #1d2327;
				border-radius: 6px;
				bottom: 24px;
				box-shadow: 0 8px 24px rgba(0,0,0,.2);
				color: #fff;
				font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
				padding: 12px 16px;
				position: fixed;
				right: 24px;
				z-index: 100000;
			}
		</style>';
	}

	private static function parent_title(): string {
		return sprintf(
			'<span class="ab-icon" aria-hidden="true"></span><span class="ab-label">%s</span>',
			esc_html__( 'Performance', 'kpf-core' )
		);
	}

	private static function purge_url( string $scope ): string {
		$args = array(
			'action' => Purge::ACTION,
			'scope'  => $scope,
		);

		if ( 'page' === $scope ) {
			$args['url'] = Purge::current_public_url();
		}

		return wp_nonce_url(
			add_query_arg( $args, admin_url( 'admin-post.php' ) ),
			Purge::ACTION
		);
	}

	private static function notice_message(): ?string {
		if ( empty( $_GET['kpf_perf_purged'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return null;
		}

		$scope = sanitize_key( wp_unslash( (string) $_GET['kpf_perf_purged'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 'page' === $scope ) {
			return __( 'Page cache clear requested.', 'kpf-core' );
		}

		if ( 'all' === $scope ) {
			return __( 'Full site cache clear requested.', 'kpf-core' );
		}

		return __( 'Cache clear requested.', 'kpf-core' );
	}
}

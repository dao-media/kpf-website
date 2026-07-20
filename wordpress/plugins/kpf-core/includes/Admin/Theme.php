<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

final class Theme {
	public static function register(): void {
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ), 5 );
		add_action( 'wp_enqueue_scripts', array( self::class, 'enqueue_admin_bar' ), 5 );
		add_action( 'admin_head', array( self::class, 'critical_styles' ), 0 );
		add_filter( 'admin_body_class', array( self::class, 'body_class' ) );
		add_filter( 'admin_footer_text', array( self::class, 'footer_text' ) );
	}

	public static function enqueue(): void {
		self::enqueue_shell( true );
	}

	/**
	 * Load Lucide admin-bar icons on the public site when the toolbar is visible.
	 */
	public static function enqueue_admin_bar(): void {
		if ( ! is_admin_bar_showing() || ! is_user_logged_in() ) {
			return;
		}

		self::enqueue_shell( false );
	}

	/**
	 * @param bool $full Whether to run the full admin paint-gate shell (wp-admin only).
	 */
	private static function enqueue_shell( bool $full ): void {
		$asset_file = KPF_CORE_PATH . 'build/admin-shell.asset.php';
		$asset      = is_readable( $asset_file ) ? require $asset_file : array(
			'dependencies' => array( 'wp-element' ),
			'version'      => KPF_CORE_VERSION,
		);

		$style_file = KPF_CORE_PATH . 'build/admin-shell.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-admin-shell',
				KPF_CORE_URL . 'build/admin-shell.css',
				$full ? array() : array( 'admin-bar' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-admin-shell',
			KPF_CORE_URL . 'build/admin-shell.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
	}

	/**
	 * Prevent WordPress core chrome from painting before the custom shell mounts.
	 */
	public static function critical_styles(): void {
		echo '<style id="kpf-admin-critical">
			html.kpf-admin-booting {
				background: #f3f5f8;
			}
			html.kpf-admin-booting body {
				background: #f3f5f8;
			}
			html.kpf-admin-booting #wpwrap {
				opacity: 0;
				pointer-events: none;
			}
			html.kpf-admin-ready #wpwrap {
				opacity: 1;
				pointer-events: auto;
				transition: opacity 90ms ease-out;
			}
			@media (prefers-reduced-motion: reduce) {
				html.kpf-admin-ready #wpwrap {
					transition: none;
				}
			}
		</style>';
		echo '<script id="kpf-admin-paint-gate">
			document.documentElement.classList.add("kpf-admin-booting");
			window.kpfAdminPaintFallback = window.setTimeout(function () {
				document.documentElement.classList.add("kpf-admin-ready");
			}, 2000);
		</script>';
	}

	public static function body_class( string $classes ): string {
		return $classes . ' kpf-admin-theme';
	}

	public static function footer_text(): string {
		return sprintf(
			/* translators: %s: LinkedIn profile URL */
			__( 'Built by <a href="%s">Dane O\'Leary</a> from a custom WordPress fork.', 'kpf-core' ),
			esc_url( 'https://linkedin.com/in/daneoleary/' )
		);
	}
}

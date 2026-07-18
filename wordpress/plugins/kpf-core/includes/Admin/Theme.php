<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

final class Theme {
	public static function register(): void {
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ), 5 );
		add_filter( 'admin_body_class', array( self::class, 'body_class' ) );
	}

	public static function enqueue(): void {
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
				array(),
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

	public static function body_class( string $classes ): string {
		return $classes . ' kpf-admin-theme';
	}
}

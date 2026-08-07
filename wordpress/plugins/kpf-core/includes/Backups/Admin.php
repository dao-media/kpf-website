<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

use KPF\Core\Support\SiteDateTime;

final class Admin {
	public const MENU_SLUG = 'kpf-backups';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
	}

	/**
	 * @return array<string, string>
	 */
	public static function sections(): array {
		return array(
			'overview'  => __( 'Overview', 'kpf-core' ),
			'backups'   => __( 'Backups', 'kpf-core' ),
			'schedule'  => __( 'Schedule', 'kpf-core' ),
			'settings'  => __( 'Settings', 'kpf-core' ),
		);
	}

	public static function menu_slug_for_tab( string $tab ): string {
		return 'overview' === $tab ? self::MENU_SLUG : self::MENU_SLUG . '-' . $tab;
	}

	public static function tab_from_page( ?string $page = null ): string {
		$page = $page ?? ( isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: self::MENU_SLUG );

		if ( self::MENU_SLUG === $page ) {
			return 'overview';
		}

		$prefix = self::MENU_SLUG . '-';
		if ( str_starts_with( $page, $prefix ) ) {
			$tab = substr( $page, strlen( $prefix ) );
			if ( isset( self::sections()[ $tab ] ) ) {
				return $tab;
			}
		}

		return 'overview';
	}

	public static function menu(): void {
		$first = true;
		foreach ( self::sections() as $tab => $label ) {
			$slug = self::menu_slug_for_tab( $tab );
			if ( $first ) {
				add_menu_page(
					__( 'Backups', 'kpf-core' ),
					__( 'Backups', 'kpf-core' ),
					'manage_options',
					$slug,
					array( self::class, 'render' ),
					'dashicons-backup',
					59.5
				);
				$first = false;
			}

			add_submenu_page(
				self::MENU_SLUG,
				'overview' === $tab ? __( 'Overview', 'kpf-core' ) : $label,
				'overview' === $tab ? __( 'Overview', 'kpf-core' ) : $label,
				'manage_options',
				$slug,
				array( self::class, 'render' )
			);
		}
	}

	public static function render(): void {
		echo '<div class="wrap kpf-backups-wrap"><div id="kpf-backups-admin-root"></div></div>';
	}

	public static function enqueue( string $hook ): void {
		if ( ! self::is_backups_screen( $hook ) ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/backups-admin.asset.php';
		$asset      = is_readable( $asset_file ) ? require $asset_file : array(
			'dependencies' => array( 'wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n' ),
			'version'      => KPF_CORE_VERSION,
		);

		wp_enqueue_style( 'wp-components' );
		$style_file = KPF_CORE_PATH . 'build/backups-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-backups-admin',
				KPF_CORE_URL . 'build/backups-admin.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-backups-admin',
			KPF_CORE_URL . 'build/backups-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		$date_time = SiteDateTime::config();
		wp_localize_script(
			'kpf-backups-admin',
			'kpfBackupsAdmin',
			array(
				'restUrl'        => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'nonce'          => wp_create_nonce( 'wp_rest' ),
				'adminUrl'       => admin_url(),
				'initialTab'     => self::tab_from_page(),
				'sections'       => self::sections(),
				'components'     => Components::definitions(),
				'dateTime'       => $date_time,
				'timezone'       => $date_time['timezone'],
				'timezoneAbbr'   => $date_time['timezoneAbbr'],
				'cadenceOptions' => array(
					array( 'value' => 'hourly', 'label' => __( 'Hourly', 'kpf-core' ) ),
					array( 'value' => 'twicedaily', 'label' => __( 'Twice daily', 'kpf-core' ) ),
					array( 'value' => 'daily', 'label' => __( 'Daily', 'kpf-core' ) ),
					array( 'value' => 'weekly', 'label' => __( 'Weekly', 'kpf-core' ) ),
					array( 'value' => 'monthly', 'label' => __( 'Monthly', 'kpf-core' ) ),
					array( 'value' => 'custom', 'label' => __( 'Custom interval', 'kpf-core' ) ),
				),
			)
		);
	}

	private static function is_backups_screen( string $hook ): bool {
		if ( str_contains( $hook, self::MENU_SLUG ) ) {
			return true;
		}

		$page = isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		return self::MENU_SLUG === $page || str_starts_with( $page, self::MENU_SLUG . '-' );
	}
}

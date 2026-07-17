<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class Admin {
	public const MENU_SLUG = 'kpf-seo';

	public static function register(): void {
		add_action('admin_menu', array( self::class, 'menu' ));
		add_action('admin_enqueue_scripts', array( self::class, 'enqueue' ));
	}

	/**
	 * SEO sections shown as hover submenu items under the top-level SEO menu.
	 *
	 * @return array<string, string> Map of tab slug => menu label.
	 */
	public static function sections(): array {
		return array(
			'dashboard' => __('Dashboard', 'kpf-core'),
			'global'    => __('Site defaults', 'kpf-core'),
			'types'     => __('Content types', 'kpf-core'),
			'social'    => __('Social sharing', 'kpf-core'),
			'schema'    => __('Structured data', 'kpf-core'),
			'sitemaps'  => __('Sitemap', 'kpf-core'),
			'redirects' => __('Redirects', 'kpf-core'),
			'tags'      => __('Placeholders', 'kpf-core'),
		);
	}

	public static function menu_slug_for_tab(string $tab): string {
		return 'dashboard' === $tab ? self::MENU_SLUG : self::MENU_SLUG . '-' . $tab;
	}

	public static function tab_from_page(?string $page = null): string {
		$page = $page ?? ( isset($_GET['page']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key(wp_unslash((string) $_GET['page'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: self::MENU_SLUG );

		if (self::MENU_SLUG === $page) {
			return 'dashboard';
		}

		$prefix = self::MENU_SLUG . '-';
		if (str_starts_with($page, $prefix)) {
			$tab = substr($page, strlen($prefix));
			if (isset(self::sections()[ $tab ])) {
				return $tab;
			}
		}

		return 'dashboard';
	}

	public static function menu(): void {
		$first = true;
		foreach (self::sections() as $tab => $label) {
			$slug = self::menu_slug_for_tab($tab);
			if ($first) {
				add_menu_page(
					__('SEO', 'kpf-core'),
					__('SEO', 'kpf-core'),
					'manage_options',
					$slug,
					array( self::class, 'render' ),
					'dashicons-search',
					58
				);
				$first = false;
			}

			add_submenu_page(
				self::MENU_SLUG,
				'dashboard' === $tab ? __('Dashboard', 'kpf-core') : $label,
				'dashboard' === $tab ? __('Dashboard', 'kpf-core') : $label,
				'manage_options',
				$slug,
				array( self::class, 'render' )
			);
		}
	}

	public static function render(): void {
		echo '<div class="wrap kpf-seo-wrap"><div id="kpf-seo-admin-root"></div></div>';
	}

	public static function enqueue(string $hook): void {
		if (! self::is_seo_screen($hook)) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/seo-admin.asset.php';
		$asset      = is_readable($asset_file) ? require $asset_file : array(
			'dependencies' => array( 'wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n', 'wp-notices' ),
			'version'      => KPF_CORE_VERSION,
		);

		wp_enqueue_style('wp-components');
		$style_file = KPF_CORE_PATH . 'build/seo-admin.css';
		if (is_readable($style_file)) {
			wp_enqueue_style(
				'kpf-seo-admin',
				KPF_CORE_URL . 'build/seo-admin.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}
		wp_enqueue_script(
			'kpf-seo-admin',
			KPF_CORE_URL . 'build/seo-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-seo-admin',
			'kpfSeoAdmin',
			array(
				'restUrl'            => esc_url_raw(rest_url('kpf-seo/v1')),
				'nonce'              => wp_create_nonce('wp_rest'),
				'homeUrl'            => home_url('/'),
				'adminUrl'           => admin_url(),
				'postTypes'          => self::post_type_options(),
				'aiUserAgents'       => Sitemaps::ai_user_agents(),
				'robotsExtraExample' => Sitemaps::robots_extra_example(),
				'initialTab'         => self::tab_from_page(),
				'sections'           => self::sections(),
			)
		);
	}

	private static function is_seo_screen(string $hook): bool {
		if (str_contains($hook, self::MENU_SLUG)) {
			return true;
		}

		$page = isset($_GET['page']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key(wp_unslash((string) $_GET['page'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		return self::MENU_SLUG === $page || str_starts_with($page, self::MENU_SLUG . '-');
	}

	/**
	 * @return array<int, array{name:string,label:string}>
	 */
	private static function post_type_options(): array {
		$options = array();
		foreach (get_post_types(array( 'public' => true ), 'objects') as $post_type) {
			if ('attachment' === $post_type->name) {
				continue;
			}
			$options[] = array(
				'name'  => $post_type->name,
				'label' => $post_type->labels->singular_name ?: $post_type->label,
			);
		}
		return $options;
	}
}

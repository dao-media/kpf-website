<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class Conflicts {
	private const KNOWN = array(
		'wordpress-seo/wp-seo.php'                 => 'Yoast SEO',
		'wordpress-seo-premium/wp-seo-premium.php' => 'Yoast SEO Premium',
		'seo-by-rank-math/rank-math.php'           => 'Rank Math SEO',
		'all-in-one-seo-pack/all_in_one_seo_pack.php' => 'All in One SEO',
		'wp-seopress/seopress.php'                 => 'SEOPress',
		'autodescription/autodescription.php'      => 'The SEO Framework',
	);

	public static function register(): void {
		add_action('admin_notices', array( self::class, 'render_notice' ));
	}

	/**
	 * @return string[]
	 */
	public static function active_conflicts(): array {
		if (! function_exists('is_plugin_active')) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$found = array();
		foreach (self::KNOWN as $file => $label) {
			if (is_plugin_active($file)) {
				$found[] = $label;
			}
		}
		return $found;
	}

	public static function render_notice(): void {
		if (! current_user_can('manage_options')) {
			return;
		}

		$screen = function_exists('get_current_screen') ? get_current_screen() : null;
		if (! $screen || (strpos((string) $screen->id, 'kpf-seo') === false && 'plugins' !== $screen->id)) {
			return;
		}

		$conflicts = self::active_conflicts();
		if (! $conflicts) {
			return;
		}

		echo '<div class="notice notice-warning"><p>';
		echo esc_html(
			sprintf(
				/* translators: %s: comma-separated plugin names */
				__('KPF SEO is designed as a standalone SEO system. Conflicting plugins detected: %s. Disable them to avoid duplicate meta output.', 'kpf-core'),
				implode(', ', $conflicts)
			)
		);
		echo '</p></div>';
	}
}

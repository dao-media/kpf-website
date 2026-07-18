<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

/**
 * WordPress Dashboard summary for the site's SEO configuration.
 */
final class DashboardWidget {
	public static function register(): void {
		add_action('wp_dashboard_setup', array( self::class, 'add_widget' ));
		add_action('admin_enqueue_scripts', array( self::class, 'enqueue_styles' ));
	}

	public static function add_widget(): void {
		if (! current_user_can('manage_options')) {
			return;
		}

		wp_add_dashboard_widget(
			'kpf-seo-dashboard-widget',
			__('SEO overview', 'kpf-core'),
			array( self::class, 'render' )
		);
	}

	public static function enqueue_styles(string $hook): void {
		if ('index.php' !== $hook || ! current_user_can('manage_options')) {
			return;
		}

		wp_register_style('kpf-seo-dashboard-widget', false, array(), KPF_CORE_VERSION);
		wp_enqueue_style('kpf-seo-dashboard-widget');
		wp_add_inline_style('kpf-seo-dashboard-widget', self::styles());
	}

	public static function render(): void {
		$settings = Settings::get();
		$global   = is_array($settings['global'] ?? null) ? $settings['global'] : array();
		$sitemaps = is_array($settings['sitemaps'] ?? null) ? $settings['sitemaps'] : array();
		$schema   = is_array($settings['schema'] ?? null) ? $settings['schema'] : array();
		$social   = is_array($settings['social'] ?? null) ? $settings['social'] : array();

		$checks = array(
			array(
				'label'  => __('Search visibility', 'kpf-core'),
				'value'  => ! empty($global['robots_index'])
					? __('Indexing enabled', 'kpf-core')
					: __('Indexing blocked', 'kpf-core'),
				'status' => ! empty($global['robots_index']) ? 'good' : 'warning',
				'url'    => self::admin_url('global'),
			),
			array(
				'label'  => __('XML sitemap', 'kpf-core'),
				'value'  => ! empty($sitemaps['enabled'])
					? __('Enabled', 'kpf-core')
					: __('Disabled', 'kpf-core'),
				'status' => ! empty($sitemaps['enabled']) ? 'good' : 'warning',
				'url'    => self::admin_url('sitemaps'),
			),
			array(
				'label'  => __('Title template', 'kpf-core'),
				'value'  => ! empty($global['title_template'])
					? __('Configured', 'kpf-core')
					: __('Needs attention', 'kpf-core'),
				'status' => ! empty($global['title_template']) ? 'good' : 'warning',
				'url'    => self::admin_url('global'),
			),
			array(
				'label'  => __('Search description', 'kpf-core'),
				'value'  => ! empty($global['description_template'])
					? __('Configured', 'kpf-core')
					: __('Needs attention', 'kpf-core'),
				'status' => ! empty($global['description_template']) ? 'good' : 'warning',
				'url'    => self::admin_url('global'),
			),
			array(
				'label'  => __('Structured data', 'kpf-core'),
				'value'  => self::schema_enabled($schema)
					? __('Enabled', 'kpf-core')
					: __('Disabled', 'kpf-core'),
				'status' => self::schema_enabled($schema) ? 'good' : 'neutral',
				'url'    => self::admin_url('schema'),
			),
			array(
				'label'  => __('Social sharing', 'kpf-core'),
				'value'  => self::social_configured($global, $social)
					? __('Configured', 'kpf-core')
					: __('Optional setup', 'kpf-core'),
				'status' => self::social_configured($global, $social) ? 'good' : 'neutral',
				'url'    => self::admin_url('social'),
			),
		);

		$good_count = count(
			array_filter(
				$checks,
				static fn(array $check): bool => 'good' === $check['status']
			)
		);

		?>
		<div class="kpf-seo-widget">
			<div class="kpf-seo-widget__summary">
				<div class="kpf-seo-widget__score" aria-label="<?php echo esc_attr(sprintf(
					/* translators: 1: completed checks, 2: total checks. */
					__('%1$d of %2$d SEO checks are configured', 'kpf-core'),
					$good_count,
					count($checks)
				)); ?>">
					<strong><?php echo esc_html((string) $good_count); ?></strong>
					<span>&nbsp;/&nbsp;<?php echo esc_html((string) count($checks)); ?></span>
				</div>
				<div>
					<h3><?php esc_html_e('SEO configuration', 'kpf-core'); ?></h3>
					<p><?php esc_html_e('Review the essentials that control search visibility, previews, and discovery.', 'kpf-core'); ?></p>
				</div>
			</div>

			<ul class="kpf-seo-widget__checks">
				<?php foreach ($checks as $check) : ?>
					<li>
						<a href="<?php echo esc_url($check['url']); ?>">
							<span class="kpf-seo-widget__dot is-<?php echo esc_attr($check['status']); ?>" aria-hidden="true"></span>
							<span class="kpf-seo-widget__label"><?php echo esc_html($check['label']); ?></span>
							<span class="kpf-seo-widget__value"><?php echo esc_html($check['value']); ?></span>
						</a>
					</li>
				<?php endforeach; ?>
			</ul>

			<div class="kpf-seo-widget__actions">
				<a class="button button-primary" href="<?php echo esc_url(self::admin_url('dashboard')); ?>">
					<?php esc_html_e('Open SEO dashboard', 'kpf-core'); ?>
				</a>
				<a class="button" href="<?php echo esc_url(self::admin_url('global')); ?>">
					<?php esc_html_e('Edit site defaults', 'kpf-core'); ?>
				</a>
			</div>
		</div>
		<?php
	}

	/**
	 * @param array<string, mixed> $schema
	 */
	private static function schema_enabled(array $schema): bool {
		return ! empty($schema['enable_website'])
			|| ! empty($schema['enable_webpage'])
			|| ! empty($schema['enable_article'])
			|| ! empty($schema['enable_breadcrumbs']);
	}

	/**
	 * @param array<string, mixed> $global
	 * @param array<string, mixed> $social
	 */
	private static function social_configured(array $global, array $social): bool {
		return ! empty($global['og_default_image_id'])
			|| ! empty($global['twitter_site'])
			|| ! empty($social['facebook_app_id']);
	}

	private static function admin_url(string $tab): string {
		return admin_url('admin.php?page=' . Admin::menu_slug_for_tab($tab));
	}

	private static function styles(): string {
		return '
			#kpf-seo-dashboard-widget .inside {
				margin: 0;
				padding: 0;
			}
			.kpf-seo-widget__summary {
				align-items: center;
				border-bottom: 1px solid #dcdcde;
				display: flex;
				gap: 14px;
				padding: 16px;
			}
			.kpf-seo-widget__summary h3 {
				font-size: 14px;
				line-height: 1.3;
				margin: 0 0 3px;
			}
			.kpf-seo-widget__summary p {
				color: #646970;
				line-height: 1.4;
				margin: 0;
			}
			.kpf-seo-widget__score {
				align-items: center;
				background: #f0f6fc;
				border: 1px solid #c5d9ed;
				border-radius: 999px;
				color: #135e96;
				display: flex;
				flex: 0 0 auto;
				height: 52px;
				justify-content: center;
				width: 52px;
			}
			.kpf-seo-widget__score strong {
				font-size: 20px;
				line-height: 1;
			}
			.kpf-seo-widget__score span {
				font-size: 11px;
				line-height: 1;
			}
			.kpf-seo-widget__checks {
				margin: 0;
			}
			.kpf-seo-widget__checks li {
				border-bottom: 1px solid #f0f0f1;
				margin: 0;
			}
			.kpf-seo-widget__checks a {
				align-items: center;
				color: #1d2327;
				display: grid;
				gap: 9px;
				grid-template-columns: 10px minmax(0, 1fr) auto;
				padding: 10px 16px;
				text-decoration: none;
			}
			.kpf-seo-widget__checks a:hover,
			.kpf-seo-widget__checks a:focus {
				background: #f6f7f7;
				color: #135e96;
			}
			.kpf-seo-widget__dot {
				background: #a7aaad;
				border-radius: 50%;
				height: 8px;
				width: 8px;
			}
			.kpf-seo-widget__dot.is-good {
				background: #00a32a;
			}
			.kpf-seo-widget__dot.is-warning {
				background: #dba617;
			}
			.kpf-seo-widget__label {
				font-weight: 600;
				min-width: 0;
			}
			.kpf-seo-widget__value {
				color: #646970;
				font-size: 12px;
				text-align: right;
			}
			.kpf-seo-widget__actions {
				display: flex;
				flex-wrap: wrap;
				gap: 8px;
				padding: 14px 16px 16px;
			}
		';
	}
}

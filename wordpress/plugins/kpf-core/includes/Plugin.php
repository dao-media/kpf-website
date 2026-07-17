<?php

declare(strict_types=1);

namespace KPF\Core;

use KPF\Core\Admin\MenuOrganizer;
use KPF\Core\Blocks\Admin as BlocksAdmin;
use KPF\Core\Blocks\GraphQL as BlocksGraphQL;
use KPF\Core\Blocks\Groups as BlockGroups;
use KPF\Core\Blocks\Patterns as BlockPatterns;
use KPF\Core\Blocks\Registry as BlockRegistry;
use KPF\Core\Compat\WpGraphqlTelemetry;
use KPF\Core\Inbox\Admin as InboxAdmin;
use KPF\Core\Inbox\Comments as InboxComments;
use KPF\Core\Inbox\Forms as InboxForms;
use KPF\Core\Inbox\FormsAdmin as InboxFormsAdmin;
use KPF\Core\Inbox\Notifications as InboxNotifications;
use KPF\Core\Inbox\Settings as InboxSettings;
use KPF\Core\Performance\Admin as PerformanceAdmin;
use KPF\Core\Performance\AdminBar as PerformanceAdminBar;
use KPF\Core\Performance\Headers as PerformanceHeaders;
use KPF\Core\Performance\Optimizations as PerformanceOptimizations;
use KPF\Core\Performance\Rest as PerformanceRest;
use KPF\Core\Performance\Settings as PerformanceSettings;
use KPF\Core\Scrapbook\Admin as ScrapbookAdmin;
use KPF\Core\Scrapbook\ContentType as ScrapbookContentType;
use KPF\Core\Scrapbook\Editor as ScrapbookEditor;
use KPF\Core\Scrapbook\GraphQL as ScrapbookGraphQL;
use KPF\Core\Scrapbook\Meta as ScrapbookMeta;
use KPF\Core\Scrapbook\Rest as ScrapbookRest;
use KPF\Core\Seo\Admin;
use KPF\Core\Seo\Conflicts;
use KPF\Core\Seo\DashboardWidget;
use KPF\Core\Seo\Editor;
use KPF\Core\Seo\GraphQL;
use KPF\Core\Seo\MetaRepository;
use KPF\Core\Seo\Redirects\Table as RedirectsTable;
use KPF\Core\Seo\Rest;
use KPF\Core\Seo\Settings;
use KPF\Core\Seo\Sitemaps;
use KPF\Core\Seo\Slugs;
use KPF\Core\Seo\Tags\Registry as TagRegistry;

final class Plugin {
	private static ?self $instance = null;

	public static function instance(): self {
		return self::$instance ??= new self();
	}

	public function boot(): void {
		add_action('plugins_loaded', array( $this, 'init' ));
	}

	public function activate(): void {
		ScrapbookContentType::register_content();
		InboxForms::register_content();
		RedirectsTable::install();
		Settings::ensure_defaults();
		InboxSettings::ensure_defaults();
		PerformanceSettings::ensure_defaults();
		flush_rewrite_rules();
	}

	public function init(): void {
		load_plugin_textdomain('kpf-core', false, dirname(plugin_basename(KPF_CORE_FILE)) . '/languages');

		WpGraphqlTelemetry::register();

		MenuOrganizer::register();

		BlockGroups::register();
		BlockRegistry::register();
		BlockPatterns::register();
		BlocksGraphQL::register();
		BlocksAdmin::register();

		ScrapbookContentType::register();
		ScrapbookMeta::register();
		ScrapbookAdmin::register();
		ScrapbookEditor::register();
		ScrapbookGraphQL::register();
		ScrapbookRest::register();

		InboxSettings::register();
		InboxForms::register();
		InboxAdmin::register();
		InboxFormsAdmin::register();
		InboxComments::register();
		InboxNotifications::register();
		InboxSettings::ensure_defaults();

		PerformanceSettings::register();
		PerformanceRest::register();
		PerformanceHeaders::register();
		PerformanceOptimizations::register();
		PerformanceAdminBar::register();
		PerformanceSettings::ensure_defaults();

		Settings::register();
		MetaRepository::register();
		TagRegistry::boot();
		Rest::register();
		Slugs::register();
		Sitemaps::register();
		Conflicts::register();
		Admin::register();
		DashboardWidget::register();
		Editor::register();
		GraphQL::register();

		// Register after SEO so Utilities submenu lists SEO before Performance.
		PerformanceAdmin::register();

		if (get_option('kpf_seo_db_version') !== RedirectsTable::DB_VERSION) {
			RedirectsTable::install();
		}
	}
}

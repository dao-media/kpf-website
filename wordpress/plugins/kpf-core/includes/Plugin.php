<?php

declare(strict_types=1);

namespace KPF\Core;

use KPF\Core\Accessibility\Admin as AccessibilityAdmin;
use KPF\Core\Accessibility\GraphQL as AccessibilityGraphQL;
use KPF\Core\Accessibility\Rest as AccessibilityRest;
use KPF\Core\Accessibility\Settings as AccessibilitySettings;
use KPF\Core\Backups\Admin as BackupsAdmin;
use KPF\Core\Backups\AdminBar as BackupsAdminBar;
use KPF\Core\Backups\Rest as BackupsRest;
use KPF\Core\Backups\Scheduler as BackupsScheduler;
use KPF\Core\Backups\Settings as BackupsSettings;
use KPF\Core\Admin\Dashboard as AdminDashboard;
use KPF\Core\Admin\HeadlessAppearance;
use KPF\Core\Admin\MenuOrganizer;
use KPF\Core\Admin\Theme as AdminTheme;
use KPF\Core\Code\Admin as CodeAdmin;
use KPF\Core\Code\ContentType as CodeContentType;
use KPF\Core\Code\GraphQL as CodeGraphQL;
use KPF\Core\Code\Meta as CodeMeta;
use KPF\Core\Blocks\Admin as BlocksAdmin;
use KPF\Core\Blocks\Globals as BlockGlobals;
use KPF\Core\Blocks\GraphQL as BlocksGraphQL;
use KPF\Core\Blocks\Groups as BlockGroups;
use KPF\Core\Blocks\Patterns as BlockPatterns;
use KPF\Core\Blocks\Registry as BlockRegistry;
use KPF\Core\Compat\WpGraphqlTelemetry;
use KPF\Core\Design\Admin as DesignAdmin;
use KPF\Core\Design\Icons\Admin as DesignIconsAdmin;
use KPF\Core\Design\Icons\Rest as DesignIconsRest;
use KPF\Core\Design\Tokens\Admin as DesignTokensAdmin;
use KPF\Core\Design\Tokens\Rest as DesignTokensRest;
use KPF\Core\Designs\Admin as DesignsAdmin;
use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Editor as DesignsEditor;
use KPF\Core\Designs\GraphQL as DesignsGraphQL;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Designs\Rest as DesignsRest;
use KPF\Core\Designs\Settings as DesignsSettings;
use KPF\Core\Forms\Admin as FormsAdmin;
use KPF\Core\Forms\ContentType as FormsContentType;
use KPF\Core\Forms\GraphQL as FormsGraphQL;
use KPF\Core\Forms\Meta as FormsMeta;
use KPF\Core\Forms\Rest as FormsRest;
use KPF\Core\Forms\Settings as FormsSettings;
use KPF\Core\Queries\Admin as QueriesAdmin;
use KPF\Core\Queries\ContentType as QueriesContentType;
use KPF\Core\Queries\Defaults as QueriesDefaults;
use KPF\Core\Queries\GraphQL as QueriesGraphQL;
use KPF\Core\Queries\Meta as QueriesMeta;
use KPF\Core\Queries\Rest as QueriesRest;
use KPF\Core\Inbox\Admin as InboxAdmin;
use KPF\Core\Inbox\Comments as InboxComments;
use KPF\Core\Inbox\Forms as InboxForms;
use KPF\Core\Inbox\FormsAdmin as InboxFormsAdmin;
use KPF\Core\Inbox\Notifications as InboxNotifications;
use KPF\Core\Inbox\Rest as InboxRest;
use KPF\Core\Inbox\Settings as InboxSettings;
use KPF\Core\Interactions\Admin as InteractionsAdmin;
use KPF\Core\Interactions\ContentType as InteractionsContentType;
use KPF\Core\Interactions\GraphQL as InteractionsGraphQL;
use KPF\Core\Interactions\Meta as InteractionsMeta;
use KPF\Core\Interactions\Rest as InteractionsRest;
use KPF\Core\Media\AdminSrcset;
use KPF\Core\Media\SvgUploads;
use KPF\Core\Pages\Editor as PagesEditor;
use KPF\Core\Pages\ListTable as PagesListTable;
use KPF\Core\Pages\Rest as PagesRest;
use KPF\Core\Performance\Admin as PerformanceAdmin;
use KPF\Core\Performance\AdminBar as PerformanceAdminBar;
use KPF\Core\Performance\Headers as PerformanceHeaders;
use KPF\Core\Performance\Images as PerformanceImages;
use KPF\Core\Performance\Optimizations as PerformanceOptimizations;
use KPF\Core\Performance\Rest as PerformanceRest;
use KPF\Core\Performance\Settings as PerformanceSettings;
use KPF\Core\DynamicContent\Admin as DynamicContentAdmin;
use KPF\Core\DynamicContent\GraphQL as DynamicContentGraphQL;
use KPF\Core\DynamicContent\Registration as DynamicContentRegistration;
use KPF\Core\DynamicContent\Rest as DynamicContentRest;
use KPF\Core\DynamicContent\Settings as DynamicContentSettings;
use KPF\Core\Events\Admin as EventsAdmin;
use KPF\Core\Events\ContentType as EventsContentType;
use KPF\Core\Events\Editor as EventsEditor;
use KPF\Core\Events\GraphQL as EventsGraphQL;
use KPF\Core\Events\Meta as EventsMeta;
use KPF\Core\Events\Rest as EventsRest;
use KPF\Core\Grantees\Admin as GranteesAdmin;
use KPF\Core\Grantees\ContentType as GranteesContentType;
use KPF\Core\Grantees\Editor as GranteesEditor;
use KPF\Core\Grantees\GraphQL as GranteesGraphQL;
use KPF\Core\Grantees\Meta as GranteesMeta;
use KPF\Core\Grantees\Rest as GranteesRest;
use KPF\Core\Grants\Admin as GrantsAdmin;
use KPF\Core\Grants\ContentType as GrantsContentType;
use KPF\Core\Grants\GraphQL as GrantsGraphQL;
use KPF\Core\Grants\Meta as GrantsMeta;
use KPF\Core\Grants\Rest as GrantsRest;
use KPF\Core\Scrapbook\Admin as ScrapbookAdmin;
use KPF\Core\Kevin\Admin as KevinAdmin;
use KPF\Core\Kevin\ContentType as KevinContentType;
use KPF\Core\Kevin\GraphQL as KevinGraphQL;
use KPF\Core\Scrapbook\ContentType as ScrapbookContentType;
use KPF\Core\Scrapbook\Editor as ScrapbookEditor;
use KPF\Core\Scrapbook\GraphQL as ScrapbookGraphQL;
use KPF\Core\Scrapbook\Meta as ScrapbookMeta;
use KPF\Core\Scrapbook\Rest as ScrapbookRest;
use KPF\Core\Seo\Admin;
use KPF\Core\Seo\Conflicts;
use KPF\Core\Seo\Editor;
use KPF\Core\Seo\GraphQL;
use KPF\Core\Seo\MetaRepository;
use KPF\Core\Seo\Redirects\Table as RedirectsTable;
use KPF\Core\Seo\Rest;
use KPF\Core\Seo\Settings;
use KPF\Core\Seo\Sitemaps;
use KPF\Core\Seo\Slugs;
use KPF\Core\Seo\Tags\Registry as TagRegistry;
use KPF\Core\Stylesheet\Admin as StylesheetAdmin;
use KPF\Core\Stylesheet\Assets as StylesheetAssets;
use KPF\Core\Stylesheet\ContentType as StylesheetContentType;
use KPF\Core\Stylesheet\Defaults as StylesheetDefaults;
use KPF\Core\Stylesheet\GraphQL as StylesheetGraphQL;
use KPF\Core\Stylesheet\Meta as StylesheetMeta;
use KPF\Core\Stylesheet\Rest as StylesheetRest;
use KPF\Core\Scaffold\GraphQL as ScaffoldGraphQL;
use KPF\Core\Scaffold\Media as ScaffoldMedia;

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
		KevinContentType::register_content();
		GrantsContentType::register_content();
		GranteesContentType::register_content();
		GrantsContentType::maybe_migrate_from_grantees();
		EventsContentType::register_content();
		EventsContentType::maybe_migrate_hosts();
		DesignsContentType::register_content();
		InteractionsContentType::register_content();
		CodeContentType::register_content();
		QueriesContentType::register_content();
		FormsContentType::register_content();
		StylesheetContentType::register_content();
		StylesheetMeta::register_meta();
		StylesheetMeta::ensure_stylesheet();
		StylesheetDefaults::seed_if_empty();
		StylesheetDefaults::ensure_pages_layer();
		QueriesDefaults::ensure_kevin_query();
		InboxForms::register_content();
		RedirectsTable::install();
		Settings::ensure_defaults();
		InboxSettings::ensure_defaults();
		FormsSettings::ensure_defaults();
		PerformanceSettings::ensure_defaults();
		DynamicContentSettings::ensure_defaults();
		AccessibilitySettings::ensure_defaults();
		BackupsSettings::ensure_defaults();
		DesignsSettings::ensure_defaults();
		flush_rewrite_rules();
	}

	public function init(): void {
		load_plugin_textdomain('kpf-core', false, dirname(plugin_basename(KPF_CORE_FILE)) . '/languages');

		WpGraphqlTelemetry::register();
		SvgUploads::register();
		AdminSrcset::register();

		AdminDashboard::register();
		AdminTheme::register();
		HeadlessAppearance::register();
		MenuOrganizer::register();

		BlockGroups::register();
		BlockRegistry::register();
		BlockPatterns::register();
		BlockGlobals::register();
		BlocksGraphQL::register();
		BlocksAdmin::register();

		QueriesContentType::register();
		QueriesMeta::register();
		QueriesDefaults::register();
		QueriesAdmin::register();
		QueriesRest::register();
		QueriesGraphQL::register();

		FormsContentType::register();
		FormsMeta::register();
		FormsSettings::register();
		FormsSettings::ensure_defaults();
		FormsAdmin::register();
		FormsRest::register();
		FormsGraphQL::register();

		DesignsContentType::register();
		DesignsMeta::register();
		DesignsSettings::register();
		DesignsAdmin::register();
		DesignsEditor::register();
		DesignsRest::register();
		DesignsGraphQL::register();

		PagesEditor::register();
		PagesListTable::register();
		PagesRest::register();

		InteractionsContentType::register();
		InteractionsMeta::register();
		InteractionsAdmin::register();
		InteractionsRest::register();
		InteractionsGraphQL::register();

		CodeContentType::register();
		CodeMeta::register();
		CodeAdmin::register();
		CodeGraphQL::register();

		StylesheetContentType::register();
		StylesheetMeta::register();
		StylesheetDefaults::register();
		StylesheetAssets::register();
		DesignAdmin::register();
		StylesheetAdmin::register();
		StylesheetRest::register();
		StylesheetGraphQL::register();
		ScaffoldMedia::register();
		ScaffoldGraphQL::register();
		DesignTokensAdmin::register();
		DesignTokensRest::register();
		DesignIconsAdmin::register();
		DesignIconsRest::register();

		ScrapbookContentType::register();
		ScrapbookMeta::register();
		ScrapbookAdmin::register();
		ScrapbookEditor::register();
		ScrapbookGraphQL::register();
		ScrapbookRest::register();

		KevinContentType::register();
		KevinAdmin::register();
		KevinGraphQL::register();

		GrantsContentType::register();
		GrantsMeta::register();
		GrantsAdmin::register();
		GrantsGraphQL::register();
		GrantsRest::register();

		GranteesContentType::register();
		GranteesMeta::register();
		GranteesAdmin::register();
		GranteesEditor::register();
		GranteesGraphQL::register();
		GranteesRest::register();

		EventsContentType::register();
		EventsMeta::register();
		EventsAdmin::register();
		EventsEditor::register();
		EventsGraphQL::register();
		EventsRest::register();

		InboxSettings::register();
		InboxForms::register();
		InboxAdmin::register();
		InboxFormsAdmin::register();
		InboxComments::register();
		InboxNotifications::register();
		InboxRest::register();
		InboxSettings::ensure_defaults();

		PerformanceSettings::register();
		PerformanceRest::register();
		PerformanceHeaders::register();
		PerformanceImages::register();
		PerformanceOptimizations::register();
		PerformanceAdminBar::register();
		PerformanceSettings::ensure_defaults();

		AccessibilitySettings::register();
		AccessibilityRest::register();
		AccessibilityGraphQL::register();
		AccessibilitySettings::ensure_defaults();

		BackupsSettings::register();
		BackupsRest::register();
		BackupsScheduler::register();
		BackupsAdminBar::register();
		BackupsSettings::ensure_defaults();

		Settings::register();
		MetaRepository::register();
		DynamicContentSettings::register();
		DynamicContentRegistration::register();
		DynamicContentRest::register();
		DynamicContentGraphQL::register();
		DynamicContentAdmin::register();
		TagRegistry::boot();
		Rest::register();
		Slugs::register();
		Sitemaps::register();
		Conflicts::register();
		Admin::register();
		Editor::register();
		GraphQL::register();

		// Register after SEO so Utilities submenu lists SEO before Performance.
		PerformanceAdmin::register();
		// After Stylesheet in MenuOrganizer order (stylesheet → accessibility → interactions).
		AccessibilityAdmin::register();
		// Utilities: below Plugins in MenuOrganizer $desired list.
		BackupsAdmin::register();

		if (get_option('kpf_seo_db_version') !== RedirectsTable::DB_VERSION) {
			RedirectsTable::install();
		}
	}
}

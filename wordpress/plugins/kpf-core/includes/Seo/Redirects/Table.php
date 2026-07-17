<?php

declare(strict_types=1);

namespace KPF\Core\Seo\Redirects;

final class Table {
	public const DB_VERSION = '1.0.0';
	public const OPTION_KEY = 'kpf_seo_db_version';

	public static function name(): string {
		global $wpdb;
		return $wpdb->prefix . 'kpf_seo_redirects';
	}

	public static function install(): void {
		global $wpdb;

		$table           = self::name();
		$charset_collate = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$sql = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			source_path varchar(512) NOT NULL,
			target_url varchar(1024) NOT NULL,
			status_code smallint(3) unsigned NOT NULL DEFAULT 301,
			match_type varchar(16) NOT NULL DEFAULT 'exact',
			is_regex tinyint(1) NOT NULL DEFAULT 0,
			is_enabled tinyint(1) NOT NULL DEFAULT 1,
			hit_count bigint(20) unsigned NOT NULL DEFAULT 0,
			notes text NULL,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY source_path (source_path(191)),
			KEY is_enabled (is_enabled),
			KEY match_type (match_type)
		) {$charset_collate};";

		dbDelta($sql);
		update_option(self::OPTION_KEY, self::DB_VERSION, false);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Seo\Redirects;

final class Repository {
	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function all(): array {
		global $wpdb;
		$table = Table::name();
		$rows  = $wpdb->get_results("SELECT * FROM {$table} ORDER BY id DESC", ARRAY_A);
		return is_array($rows) ? array_map(array( self::class, 'normalize' ), $rows) : array();
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function get(int $id): ?array {
		global $wpdb;
		$table = Table::name();
		$row   = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $id), ARRAY_A);
		return is_array($row) ? self::normalize($row) : null;
	}

	/**
	 * @param array<string, mixed> $data
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function create(array $data) {
		global $wpdb;

		$clean = self::sanitize($data);
		if (is_wp_error($clean)) {
			return $clean;
		}

		$now = current_time('mysql');
		$ok  = $wpdb->insert(
			Table::name(),
			array_merge(
				$clean,
				array(
					'hit_count'  => 0,
					'created_at' => $now,
					'updated_at' => $now,
				)
			),
			array( '%s', '%s', '%d', '%s', '%d', '%d', '%s', '%d', '%s', '%s' )
		);

		if (! $ok) {
			return new \WP_Error('kpf_seo_redirect_create_failed', 'Unable to create redirect.');
		}

		return self::get((int) $wpdb->insert_id);
	}

	/**
	 * @param array<string, mixed> $data
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function update(int $id, array $data) {
		global $wpdb;

		$existing = self::get($id);
		if (! $existing) {
			return new \WP_Error('kpf_seo_redirect_missing', 'Redirect not found.', array( 'status' => 404 ));
		}

		$clean = self::sanitize(array_merge($existing, $data));
		if (is_wp_error($clean)) {
			return $clean;
		}

		$ok = $wpdb->update(
			Table::name(),
			array_merge($clean, array( 'updated_at' => current_time('mysql') )),
			array( 'id' => $id ),
			array( '%s', '%s', '%d', '%s', '%d', '%d', '%s', '%s' ),
			array( '%d' )
		);

		if (false === $ok) {
			return new \WP_Error('kpf_seo_redirect_update_failed', 'Unable to update redirect.');
		}

		return self::get($id);
	}

	public static function delete(int $id): bool {
		global $wpdb;
		return (bool) $wpdb->delete(Table::name(), array( 'id' => $id ), array( '%d' ));
	}

	public static function increment_hits(int $id): void {
		global $wpdb;
		$table = Table::name();
		$wpdb->query($wpdb->prepare("UPDATE {$table} SET hit_count = hit_count + 1 WHERE id = %d", $id));
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function enabled(): array {
		global $wpdb;
		$table = Table::name();
		$rows  = $wpdb->get_results("SELECT * FROM {$table} WHERE is_enabled = 1 ORDER BY is_regex ASC, id ASC", ARRAY_A);
		return is_array($rows) ? array_map(array( self::class, 'normalize' ), $rows) : array();
	}

	/**
	 * @param array<string, mixed> $data
	 * @return array<string, mixed>|\WP_Error
	 */
	private static function sanitize(array $data) {
		$source = self::normalize_path((string) ($data['source_path'] ?? ''));
		$target = esc_url_raw((string) ($data['target_url'] ?? ''));
		$code   = absint($data['status_code'] ?? 301);
		$regex  = ! empty($data['is_regex']);
		$match  = $regex ? 'regex' : 'exact';

		if ($source === '' || $source === '/') {
			return new \WP_Error('kpf_seo_invalid_source', 'A valid source path is required.');
		}
		if ($target === '') {
			return new \WP_Error('kpf_seo_invalid_target', 'A valid target URL is required.');
		}
		if (! in_array($code, array( 301, 302, 307, 308 ), true)) {
			$code = 301;
		}
		if ($regex && @preg_match('#' . $source . '#', '') === false) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
			return new \WP_Error('kpf_seo_invalid_regex', 'Invalid regular expression.');
		}

		// Loop protection for exact redirects to same path.
		$target_path = (string) wp_parse_url($target, PHP_URL_PATH);
		if (! $regex && $target_path && self::normalize_path($target_path) === $source) {
			return new \WP_Error('kpf_seo_redirect_loop', 'Redirect source and target path cannot match.');
		}

		return array(
			'source_path' => $source,
			'target_url'  => $target,
			'status_code' => $code,
			'match_type'  => $match,
			'is_regex'    => $regex ? 1 : 0,
			'is_enabled'  => ! empty($data['is_enabled']) || ! isset($data['is_enabled']) ? 1 : 0,
			'notes'       => sanitize_textarea_field((string) ($data['notes'] ?? '')),
		);
	}

	public static function normalize_path(string $path): string {
		$path = trim($path);
		if ($path === '') {
			return '';
		}
		if (! str_starts_with($path, '/') && ! str_starts_with($path, '^')) {
			$path = '/' . $path;
		}
		$path = preg_replace('#/+#', '/', $path) ?? $path;
		return rtrim($path, '/') ?: '/';
	}

	/**
	 * @param array<string, mixed> $row
	 * @return array<string, mixed>
	 */
	private static function normalize(array $row): array {
		return array(
			'id'          => (int) $row['id'],
			'source_path' => (string) $row['source_path'],
			'target_url'  => (string) $row['target_url'],
			'status_code' => (int) $row['status_code'],
			'match_type'  => (string) $row['match_type'],
			'is_regex'    => (bool) $row['is_regex'],
			'is_enabled'  => (bool) $row['is_enabled'],
			'hit_count'   => (int) $row['hit_count'],
			'notes'       => (string) ($row['notes'] ?? ''),
			'created_at'  => (string) $row['created_at'],
			'updated_at'  => (string) $row['updated_at'],
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class Slugs {
	private const HASH_OPTION = 'kpf_seo_slug_hash';

	public static function register(): void {
		add_filter('register_post_type_args', array( self::class, 'filter_post_type_args' ), 20, 2);
		add_action('update_option_' . Settings::OPTION_KEY, array( self::class, 'maybe_flush' ), 10, 2);
		add_action('init', array( self::class, 'maybe_flush_pending' ), 99);
	}

	/**
	 * @param array<string, mixed> $args
	 * @return array<string, mixed>
	 */
	public static function filter_post_type_args(array $args, string $post_type): array {
		if (in_array($post_type, array( 'post', 'page', 'attachment' ), true)) {
			return $args;
		}

		$settings = Settings::get();
		$prefix   = (string) ($settings['post_types'][ $post_type ]['slug_prefix'] ?? '');
		if ($prefix === '') {
			return $args;
		}

		if (! isset($args['rewrite']) || false === $args['rewrite']) {
			$args['rewrite'] = array();
		}
		if (! is_array($args['rewrite'])) {
			$args['rewrite'] = array();
		}

		$args['rewrite']['slug'] = trim($prefix, '/');
		return $args;
	}

	/**
	 * @param mixed $old
	 * @param mixed $new
	 */
	public static function maybe_flush($old, $new): void {
		$old_hash = self::hash_prefixes(is_array($old) ? $old : array());
		$new_hash = self::hash_prefixes(is_array($new) ? $new : array());
		if ($old_hash !== $new_hash) {
			update_option(self::HASH_OPTION . '_pending', 1, false);
		}
	}

	public static function maybe_flush_pending(): void {
		if (! get_option(self::HASH_OPTION . '_pending')) {
			return;
		}
		flush_rewrite_rules(false);
		delete_option(self::HASH_OPTION . '_pending');
		update_option(self::HASH_OPTION, self::hash_prefixes(Settings::get()), false);
	}

	/**
	 * @param array<string, mixed> $settings
	 */
	private static function hash_prefixes(array $settings): string {
		$prefixes = array();
		foreach ((array) ($settings['post_types'] ?? array()) as $type => $config) {
			$prefixes[ $type ] = (string) ($config['slug_prefix'] ?? '');
		}
		ksort($prefixes);
		return md5(wp_json_encode($prefixes) ?: '');
	}
}

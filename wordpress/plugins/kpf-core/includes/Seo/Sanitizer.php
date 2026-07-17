<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class Sanitizer {
	private const ALLOWED_META_ATTRS = array( 'name', 'property', 'content', 'rel', 'href', 'media' );
	private const MAX_CUSTOM_META    = 25;

	/**
	 * @param mixed $input
	 * @return array<string, mixed>
	 */
	public static function sanitize_settings($input): array {
		$defaults = Settings::defaults();
		$input    = is_array($input) ? $input : array();

		$global = is_array($input['global'] ?? null) ? $input['global'] : array();
		$social = is_array($input['social'] ?? null) ? $input['social'] : array();
		$schema = is_array($input['schema'] ?? null) ? $input['schema'] : array();
		$maps   = is_array($input['sitemaps'] ?? null) ? $input['sitemaps'] : array();

		$clean = array(
			'version'    => Settings::VERSION,
			'global'     => array(
				'title_template'       => self::sanitize_template($global['title_template'] ?? $defaults['global']['title_template']),
				'description_template' => self::sanitize_template($global['description_template'] ?? $defaults['global']['description_template']),
				'separator'            => sanitize_text_field((string) ($global['separator'] ?? '|')),
				'site_title'           => sanitize_text_field((string) ($global['site_title'] ?? '')),
				'site_description'     => sanitize_textarea_field((string) ($global['site_description'] ?? '')),
				'frontend_url'         => esc_url_raw((string) ($global['frontend_url'] ?? 'http://localhost:3000')),
				'robots_index'         => (bool) ($global['robots_index'] ?? true),
				'robots_follow'        => (bool) ($global['robots_follow'] ?? true),
				'robots_noarchive'     => (bool) ($global['robots_noarchive'] ?? false),
				'robots_nosnippet'     => (bool) ($global['robots_nosnippet'] ?? false),
				'og_default_image_id'  => absint($global['og_default_image_id'] ?? 0),
				'twitter_card'         => in_array($global['twitter_card'] ?? '', array( 'summary', 'summary_large_image' ), true)
					? (string) $global['twitter_card']
					: 'summary_large_image',
				'twitter_site'         => sanitize_text_field((string) ($global['twitter_site'] ?? '')),
				'custom_meta'          => self::sanitize_custom_meta($global['custom_meta'] ?? array()),
			),
			'post_types' => array(),
			'social'     => array(
				'facebook_app_id' => sanitize_text_field((string) ($social['facebook_app_id'] ?? '')),
				'og_type_default' => sanitize_text_field((string) ($social['og_type_default'] ?? 'website')),
			),
			'schema'     => array(
				'organization_name'  => sanitize_text_field((string) ($schema['organization_name'] ?? '')),
				'organization_url'   => esc_url_raw((string) ($schema['organization_url'] ?? '')),
				'organization_logo'  => absint($schema['organization_logo'] ?? 0),
				'enable_website'     => (bool) ($schema['enable_website'] ?? true),
				'enable_webpage'     => (bool) ($schema['enable_webpage'] ?? true),
				'enable_article'     => (bool) ($schema['enable_article'] ?? true),
				'enable_breadcrumbs' => (bool) ($schema['enable_breadcrumbs'] ?? true),
				'custom_json_ld'     => self::sanitize_json_ld_template((string) ($schema['custom_json_ld'] ?? '')),
			),
			'sitemaps'   => array(
				'enabled'            => (bool) ($maps['enabled'] ?? true),
				'include_images'     => (bool) ($maps['include_images'] ?? false),
				'exclude_post_types' => array_values(
					array_filter(
						array_map('sanitize_key', (array) ($maps['exclude_post_types'] ?? array()))
					)
				),
				'ai_crawlers'        => self::sanitize_ai_crawlers($maps['ai_crawlers'] ?? 'allow'),
				'robots_extra'       => sanitize_textarea_field((string) ($maps['robots_extra'] ?? '')),
			),
		);

		$incoming_types = is_array($input['post_types'] ?? null) ? $input['post_types'] : array();
		foreach (get_post_types(array( 'public' => true ), 'names') as $post_type) {
			$row = is_array($incoming_types[ $post_type ] ?? null) ? $incoming_types[ $post_type ] : array();
			$clean['post_types'][ $post_type ] = array(
				'title_template'       => self::nullable_template($row['title_template'] ?? null),
				'description_template' => self::nullable_template($row['description_template'] ?? null),
				'slug_prefix'          => sanitize_title((string) ($row['slug_prefix'] ?? ''), '', 'save'),
				'robots_index'         => self::nullable_bool($row['robots_index'] ?? null),
				'robots_follow'        => self::nullable_bool($row['robots_follow'] ?? null),
				'show_in_sitemap'      => (bool) ($row['show_in_sitemap'] ?? true),
				'schema_type'          => sanitize_text_field((string) ($row['schema_type'] ?? 'WebPage')),
				'og_type'              => sanitize_text_field((string) ($row['og_type'] ?? 'website')),
				'custom_meta'          => self::sanitize_custom_meta($row['custom_meta'] ?? array()),
			);
		}

		return $clean;
	}

	/**
	 * @param mixed $value
	 */
	public static function sanitize_ai_crawlers($value): string {
		$value = sanitize_key((string) $value);
		return in_array($value, array( 'allow', 'block', 'off' ), true) ? $value : 'allow';
	}

	/**
	 * @param mixed $input
	 * @return array<string, mixed>
	 */
	public static function sanitize_entity_meta($input): array {
		$input = is_array($input) ? $input : array();

		return array(
			'title_template'       => self::nullable_template($input['title_template'] ?? null),
			'description_template' => self::nullable_template($input['description_template'] ?? null),
			'canonical'            => self::nullable_url($input['canonical'] ?? null),
			'robots_index'         => self::nullable_bool($input['robots_index'] ?? null),
			'robots_follow'        => self::nullable_bool($input['robots_follow'] ?? null),
			'robots_noarchive'     => self::nullable_bool($input['robots_noarchive'] ?? null),
			'robots_nosnippet'     => self::nullable_bool($input['robots_nosnippet'] ?? null),
			'og_title'             => self::nullable_template($input['og_title'] ?? null),
			'og_description'       => self::nullable_template($input['og_description'] ?? null),
			'og_image_id'          => isset($input['og_image_id']) ? absint($input['og_image_id']) : null,
			'twitter_title'        => self::nullable_template($input['twitter_title'] ?? null),
			'twitter_description'  => self::nullable_template($input['twitter_description'] ?? null),
			'twitter_image_id'     => isset($input['twitter_image_id']) ? absint($input['twitter_image_id']) : null,
			'schema_type'          => self::nullable_string($input['schema_type'] ?? null),
			'custom_json_ld'       => self::nullable_json_ld($input['custom_json_ld'] ?? null),
			'show_in_sitemap'      => self::nullable_bool($input['show_in_sitemap'] ?? null),
			'custom_meta'          => self::sanitize_custom_meta($input['custom_meta'] ?? array()),
		);
	}

	public static function sanitize_template(string $value): string {
		$value = wp_strip_all_tags($value);
		$value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $value) ?? '';
		return trim($value);
	}

	/**
	 * @param mixed $value
	 */
	public static function nullable_template($value): ?string {
		if (null === $value || '' === $value) {
			return null;
		}
		return self::sanitize_template((string) $value);
	}

	/**
	 * @param mixed $value
	 */
	public static function nullable_bool($value): ?bool {
		if (null === $value || '' === $value) {
			return null;
		}
		return (bool) $value;
	}

	/**
	 * @param mixed $value
	 */
	public static function nullable_string($value): ?string {
		if (null === $value || '' === $value) {
			return null;
		}
		return sanitize_text_field((string) $value);
	}

	/**
	 * @param mixed $value
	 */
	public static function nullable_url($value): ?string {
		if (null === $value || '' === $value) {
			return null;
		}
		$url = esc_url_raw((string) $value);
		return $url !== '' ? $url : null;
	}

	/**
	 * @param mixed $value
	 */
	public static function nullable_json_ld($value): ?string {
		if (null === $value || '' === $value) {
			return null;
		}
		$clean = self::sanitize_json_ld_template((string) $value);
		return $clean !== '' ? $clean : null;
	}

	public static function sanitize_json_ld_template(string $value): string {
		$value = trim($value);
		if ($value === '') {
			return '';
		}

		// Strip script tags; only allow JSON-like template text.
		$value = wp_strip_all_tags($value);
		if (strlen($value) > 20000) {
			$value = substr($value, 0, 20000);
		}

		return $value;
	}

	/**
	 * @param mixed $items
	 * @return array<int, array<string, string>>
	 */
	public static function sanitize_custom_meta($items): array {
		if (! is_array($items)) {
			return array();
		}

		$clean = array();
		foreach (array_slice($items, 0, self::MAX_CUSTOM_META) as $item) {
			if (! is_array($item)) {
				continue;
			}

			$row = array();
			foreach (self::ALLOWED_META_ATTRS as $attr) {
				if (! isset($item[ $attr ]) || '' === $item[ $attr ]) {
					continue;
				}
				$value = (string) $item[ $attr ];
				if (in_array($attr, array( 'href' ), true)) {
					$row[ $attr ] = esc_url_raw($value);
				} else {
					$row[ $attr ] = sanitize_text_field($value);
				}
			}

			$has_identity = isset($row['name']) || isset($row['property']) || isset($row['rel']);
			$has_value    = isset($row['content']) || isset($row['href']);
			if ($has_identity && $has_value) {
				if (isset($row['name']) && strtolower($row['name']) === 'http-equiv') {
					continue;
				}
				$clean[] = $row;
			}
		}

		return $clean;
	}
}

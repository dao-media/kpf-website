<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class Settings {
	public const OPTION_KEY = 'kpf_seo_settings';
	public const VERSION    = 1;

	public static function register(): void {
		add_action(
			'init',
			static function (): void {
				register_setting(
					'kpf_seo',
					self::OPTION_KEY,
					array(
						'type'              => 'object',
						'default'           => self::defaults(),
						'sanitize_callback' => array( Sanitizer::class, 'sanitize_settings' ),
						'show_in_rest'      => false,
					)
				);
			}
		);
	}

	public static function ensure_defaults(): void {
		$current = get_option(self::OPTION_KEY, null);
		if (! is_array($current)) {
			update_option(self::OPTION_KEY, self::defaults(), false);
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		$post_types = array();
		foreach (get_post_types(array( 'public' => true ), 'names') as $post_type) {
			$post_types[ $post_type ] = self::default_post_type($post_type);
		}

		return array(
			'version'    => self::VERSION,
			'global'     => array(
				'title_template'       => '%%title%% %%sep%% %%sitename%%',
				'description_template' => '%%excerpt%%',
				'separator'            => '|',
				'site_title'           => '',
				'site_description'     => '',
				'frontend_url'         => 'http://localhost:3000',
				'robots_index'         => true,
				'robots_follow'        => true,
				'robots_noarchive'     => false,
				'robots_nosnippet'     => false,
				'og_default_image_id'  => 0,
				'twitter_card'         => 'summary_large_image',
				'twitter_site'         => '',
				'custom_meta'          => array(),
			),
			'post_types' => $post_types,
			'social'     => array(
				'facebook_app_id' => '',
				'og_type_default' => 'website',
			),
			'schema'     => array(
				'organization_name'  => '',
				'organization_url'   => '',
				'organization_logo'  => 0,
				'enable_website'     => true,
				'enable_webpage'     => true,
				'enable_article'     => true,
				'enable_breadcrumbs' => true,
				'custom_json_ld'     => '',
			),
			'sitemaps'   => array(
				'enabled'            => true,
				'include_images'     => false,
				'exclude_post_types' => array(),
				'ai_crawlers'        => 'allow',
				'robots_extra'       => '',
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_post_type(string $post_type): array {
		$is_page = 'page' === $post_type;

		return array(
			'title_template'       => null,
			'description_template' => null,
			'slug_prefix'          => '',
			'robots_index'         => null,
			'robots_follow'        => null,
			'show_in_sitemap'      => true,
			'schema_type'          => $is_page ? 'WebPage' : 'Article',
			'og_type'              => $is_page ? 'website' : 'article',
			'custom_meta'          => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get(): array {
		$stored = get_option(self::OPTION_KEY, array());
		if (! is_array($stored)) {
			$stored = array();
		}

		$merged = self::merge_defaults($stored);

		foreach (get_post_types(array( 'public' => true ), 'names') as $post_type) {
			if (! isset($merged['post_types'][ $post_type ]) || ! is_array($merged['post_types'][ $post_type ])) {
				$merged['post_types'][ $post_type ] = self::default_post_type($post_type);
			} else {
				$merged['post_types'][ $post_type ] = array_merge(
					self::default_post_type($post_type),
					$merged['post_types'][ $post_type ]
				);
			}
		}

		return $merged;
	}

	/**
	 * @param array<string, mixed> $settings
	 */
	public static function update(array $settings): array {
		$clean = Sanitizer::sanitize_settings($settings);
		update_option(self::OPTION_KEY, $clean, false);
		return self::get();
	}

	/**
	 * @param array<string, mixed> $stored
	 * @return array<string, mixed>
	 */
	private static function merge_defaults(array $stored): array {
		$defaults = self::defaults();

		return array(
			'version'    => self::VERSION,
			'global'     => array_merge($defaults['global'], is_array($stored['global'] ?? null) ? $stored['global'] : array()),
			'post_types' => is_array($stored['post_types'] ?? null) ? $stored['post_types'] : $defaults['post_types'],
			'social'     => array_merge($defaults['social'], is_array($stored['social'] ?? null) ? $stored['social'] : array()),
			'schema'     => array_merge($defaults['schema'], is_array($stored['schema'] ?? null) ? $stored['schema'] : array()),
			'sitemaps'   => array_merge($defaults['sitemaps'], is_array($stored['sitemaps'] ?? null) ? $stored['sitemaps'] : array()),
		);
	}
}

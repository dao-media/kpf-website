<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use KPF\Core\Seo\Tags\Engine;
use WP_Post;

final class Resolver {
	/**
	 * @param array<string, mixed> $overrides Optional draft values from the editor preview.
	 * @return array<string, mixed>
	 */
	public static function for_post(int $post_id, array $overrides = array()): array {
		$post = get_post($post_id);
		if (! $post instanceof WP_Post) {
			return self::empty_payload();
		}

		$settings = Settings::get();
		$global   = $settings['global'];
		$type     = $settings['post_types'][ $post->post_type ] ?? Settings::default_post_type($post->post_type);
		$entity   = isset($overrides['seo']) && is_array($overrides['seo'])
			? Sanitizer::sanitize_entity_meta($overrides['seo'])
			: MetaRepository::get($post_id);
		$context  = self::context_for_post($post, $settings, $overrides);

		$title_tpl = self::first_string(
			$entity['title_template'] ?? null,
			$type['title_template'] ?? null,
			$global['title_template']
		);
		$desc_tpl = self::first_string(
			$entity['description_template'] ?? null,
			$type['description_template'] ?? null,
			$global['description_template']
		);

		$title       = Engine::render($title_tpl, $context);
		$description = Engine::render($desc_tpl, $context);
		$canonical   = $entity['canonical'] ?: self::frontend_url($settings, $context['permalink']);

		$robots = array(
			'index'     => self::first_bool($entity['robots_index'] ?? null, $type['robots_index'] ?? null, (bool) $global['robots_index']),
			'follow'    => self::first_bool($entity['robots_follow'] ?? null, $type['robots_follow'] ?? null, (bool) $global['robots_follow']),
			'noarchive' => self::first_bool($entity['robots_noarchive'] ?? null, null, (bool) $global['robots_noarchive']),
			'nosnippet' => self::first_bool($entity['robots_nosnippet'] ?? null, null, (bool) $global['robots_nosnippet']),
		);

		if ('publish' !== $post->post_status) {
			$robots['index'] = false;
		}

		$og_title = Engine::render(
			self::first_string($entity['og_title'] ?? null, $title_tpl),
			$context
		);
		$og_description = Engine::render(
			self::first_string($entity['og_description'] ?? null, $desc_tpl),
			$context
		);

		if (array_key_exists('featured_media', $overrides)) {
			$featured_id = absint($overrides['featured_media']);
		} else {
			$featured_id = (int) get_post_thumbnail_id($post);
		}

		$image_id  = $entity['og_image_id'] ?: $featured_id ?: (int) $global['og_default_image_id'];
		$image_url = $image_id ? (string) wp_get_attachment_image_url($image_id, 'full') : '';

		$twitter_title = Engine::render(
			self::first_string($entity['twitter_title'] ?? null, $entity['og_title'] ?? null, $title_tpl),
			$context
		);
		$twitter_description = Engine::render(
			self::first_string($entity['twitter_description'] ?? null, $entity['og_description'] ?? null, $desc_tpl),
			$context
		);
		$twitter_image_id  = $entity['twitter_image_id'] ?: $image_id;
		$twitter_image_url = $twitter_image_id ? (string) wp_get_attachment_image_url((int) $twitter_image_id, 'full') : $image_url;

		$custom_meta = array_merge(
			(array) ($global['custom_meta'] ?? array()),
			(array) ($type['custom_meta'] ?? array()),
			(array) ($entity['custom_meta'] ?? array())
		);
		$custom_meta = array_map(
			static function (array $row) use ($context): array {
				if (isset($row['content'])) {
					$row['content'] = Engine::render((string) $row['content'], $context);
				}
				return $row;
			},
			$custom_meta
		);

		$schema_type = self::first_string($entity['schema_type'] ?? null, $type['schema_type'] ?? null, 'WebPage');
		$schema      = Schema::build_for_post($post, $settings, $canonical, $title, $description, $schema_type, $image_url, $entity);

		$show_in_sitemap = self::first_bool(
			$entity['show_in_sitemap'] ?? null,
			(bool) ($type['show_in_sitemap'] ?? true),
			true
		);

		$primary_category = PrimaryTerms::resolve(
			$post,
			'category',
			isset($entity['primary_category_id']) ? (int) $entity['primary_category_id'] : null
		);
		$primary_topic = PrimaryTerms::resolve(
			$post,
			'post_tag',
			isset($entity['primary_topic_id']) ? (int) $entity['primary_topic_id'] : null
		);

		$topic_terms = get_the_terms($post, 'post_tag');
		$og_tags     = array();
		if (is_array($topic_terms)) {
			foreach ($topic_terms as $term) {
				if ($term instanceof \WP_Term) {
					$og_tags[] = (string) $term->name;
				}
			}
		}

		$breadcrumbs = Breadcrumbs::for_post($post, $settings, $canonical, $title, $primary_category);

		return array(
			'title'            => $title,
			'description'      => $description,
			'canonical'        => $canonical,
			'robots'           => $robots,
			'openGraph'        => array(
				'title'       => $og_title,
				'description' => $og_description,
				'imageUrl'    => $image_url,
				'type'        => (string) ($type['og_type'] ?? 'website'),
				'url'         => $canonical,
				'section'     => $primary_category ? (string) $primary_category->name : '',
				'tags'        => $og_tags,
			),
			'twitter'          => array(
				'card'        => (string) $global['twitter_card'],
				'site'        => (string) $global['twitter_site'],
				'title'       => $twitter_title,
				'description' => $twitter_description,
				'imageUrl'    => $twitter_image_url,
			),
			'customMeta'       => array_values($custom_meta),
			'schema'           => $schema,
			'showInSitemap'    => $show_in_sitemap && 'publish' === $post->post_status && $robots['index'],
			'focusKeyphrase'   => (string) ($entity['focus_keyphrase'] ?? ''),
			'primaryCategory'  => PrimaryTerms::to_payload($primary_category, $settings),
			'primaryTopic'     => PrimaryTerms::to_payload($primary_topic, $settings),
			'breadcrumbs'      => $breadcrumbs,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function for_home(): array {
		$settings = Settings::get();
		$global   = $settings['global'];
		$context  = self::base_context($settings);
		$context['title']   = $context['sitename'];
		$context['excerpt'] = $context['sitedesc'];

		// Homepage has no content title distinct from the site name.
		$title       = Engine::render('%%sitename%%', $context);
		$description = Engine::render(
			(string) ($global['description_template'] ?: '%%sitedesc%%'),
			$context
		);
		$canonical   = self::frontend_url($settings, '/');
		$image_id    = (int) $global['og_default_image_id'];
		$image_url   = $image_id ? (string) wp_get_attachment_image_url($image_id, 'full') : '';

		$robots = array(
			'index'     => (bool) $global['robots_index'],
			'follow'    => (bool) $global['robots_follow'],
			'noarchive' => (bool) $global['robots_noarchive'],
			'nosnippet' => (bool) $global['robots_nosnippet'],
		);

		$custom_meta = array_map(
			static function (array $row) use ($context): array {
				if (isset($row['content'])) {
					$row['content'] = Engine::render((string) $row['content'], $context);
				}
				return $row;
			},
			(array) ($global['custom_meta'] ?? array())
		);

		return array(
			'title'           => $title !== '' ? $title : (string) $context['sitename'],
			'description'     => $description,
			'canonical'       => $canonical,
			'robots'          => $robots,
			'openGraph'       => array(
				'title'       => $title,
				'description' => $description,
				'imageUrl'    => $image_url,
				'type'        => (string) ($settings['social']['og_type_default'] ?? 'website'),
				'url'         => $canonical,
				'section'     => '',
				'tags'        => array(),
			),
			'twitter'         => array(
				'card'        => (string) $global['twitter_card'],
				'site'        => (string) $global['twitter_site'],
				'title'       => $title,
				'description' => $description,
				'imageUrl'    => $image_url,
			),
			'customMeta'      => array_values($custom_meta),
			'schema'          => Schema::build_for_home($settings, $canonical, $title, $description, $image_url),
			'showInSitemap'   => true,
			'focusKeyphrase'  => '',
			'primaryCategory' => null,
			'primaryTopic'    => null,
			'breadcrumbs'     => array(
				array(
					'name' => (string) ($context['sitename'] ?? get_bloginfo('name')),
					'url'  => $canonical,
				),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function empty_payload(): array {
		return array(
			'title'           => '',
			'description'     => '',
			'canonical'       => '',
			'robots'          => array(
				'index'     => true,
				'follow'    => true,
				'noarchive' => false,
				'nosnippet' => false,
			),
			'openGraph'       => array(
				'title'       => '',
				'description' => '',
				'imageUrl'    => '',
				'type'        => 'website',
				'url'         => '',
				'section'     => '',
				'tags'        => array(),
			),
			'twitter'         => array(
				'card'        => 'summary_large_image',
				'site'        => '',
				'title'       => '',
				'description' => '',
				'imageUrl'    => '',
			),
			'customMeta'      => array(),
			'schema'          => array(),
			'showInSitemap'   => false,
			'focusKeyphrase'  => '',
			'primaryCategory' => null,
			'primaryTopic'    => null,
			'breadcrumbs'     => array(),
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	/**
	 * @param array<string, mixed> $settings
	 * @param array<string, mixed> $overrides
	 * @return array<string, mixed>
	 */
	public static function context_for_post(WP_Post $post, array $settings, array $overrides = array()): array {
		$context = self::base_context($settings);
		$pto     = get_post_type_object($post->post_type);
		$entity  = isset($overrides['seo']) && is_array($overrides['seo'])
			? Sanitizer::sanitize_entity_meta($overrides['seo'])
			: MetaRepository::get((int) $post->ID);

		$excerpt = $post->post_excerpt !== '' ? $post->post_excerpt : wp_trim_words(wp_strip_all_tags($post->post_content), 40, '…');
		$author  = get_the_author_meta('display_name', (int) $post->post_author);

		if (array_key_exists('excerpt', $overrides)) {
			$excerpt = (string) $overrides['excerpt'];
		}

		$primary_category = PrimaryTerms::resolve(
			$post,
			'category',
			isset($entity['primary_category_id']) ? (int) $entity['primary_category_id'] : null
		);
		$primary_topic = PrimaryTerms::resolve(
			$post,
			'post_tag',
			isset($entity['primary_topic_id']) ? (int) $entity['primary_topic_id'] : null
		);

		$path = (string) get_page_uri($post);
		if ('page' !== $post->post_type) {
			$permalink = get_permalink($post);
			$path      = $permalink ? (string) wp_parse_url($permalink, PHP_URL_PATH) : '/' . $post->post_name;
		} else {
			$path = '/' . ltrim($path, '/');
		}

		$context['post_id']     = (int) $post->ID;
		$context['title']       = array_key_exists('title', $overrides)
			? (string) $overrides['title']
			: get_the_title($post);
		$context['excerpt']     = $excerpt;
		$context['author']      = is_string($author) ? $author : '';
		$context['category']    = $primary_category ? (string) $primary_category->name : '';
		$context['tag']         = $primary_topic ? (string) $primary_topic->name : '';
		$context['focuskw']     = (string) ($entity['focus_keyphrase'] ?? '');
		$context['date']        = get_the_date('', $post) ?: '';
		$context['modified']    = get_the_modified_date('', $post) ?: '';
		$context['pt_singular'] = $pto ? (string) $pto->labels->singular_name : $post->post_type;
		$context['pt_plural']   = $pto ? (string) $pto->labels->name : $post->post_type;
		$context['page']        = '';
		$context['permalink']   = $path ?: '/';

		return $context;
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function base_context(array $settings): array {
		$global = $settings['global'];

		return array(
			'sitename' => $global['site_title'] !== '' ? (string) $global['site_title'] : get_bloginfo('name'),
			'sitedesc' => $global['site_description'] !== '' ? (string) $global['site_description'] : get_bloginfo('description'),
			'sep'      => (string) ($global['separator'] ?: '|'),
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 */
	public static function frontend_url(array $settings, string $path = '/'): string {
		$base = rtrim((string) ($settings['global']['frontend_url'] ?: home_url('/')), '/');
		$path = '/' . ltrim($path, '/');
		if ($path === '/') {
			return $base . '/';
		}
		return $base . $path;
	}

	/**
	 * @param mixed ...$values
	 */
	private static function first_string(...$values): string {
		foreach ($values as $value) {
			if (null !== $value && '' !== $value) {
				return (string) $value;
			}
		}
		return '';
	}

	/**
	 * @param mixed ...$values
	 */
	private static function first_bool(...$values): bool {
		foreach ($values as $value) {
			if (null !== $value) {
				return (bool) $value;
			}
		}
		return true;
	}
}

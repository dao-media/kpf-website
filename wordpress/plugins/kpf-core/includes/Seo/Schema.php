<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use KPF\Core\Seo\Tags\Engine;
use WP_Post;

final class Schema {
	/**
	 * @param array<string, mixed> $settings
	 * @param array<string, mixed> $entity
	 * @return array<int, array<string, mixed>>
	 */
	public static function build_for_post(
		WP_Post $post,
		array $settings,
		string $canonical,
		string $title,
		string $description,
		string $schema_type,
		string $image_url,
		array $entity
	): array {
		$graph   = array();
		$schema  = $settings['schema'];
		$org_id  = trailingslashit(Resolver::frontend_url($settings, '/')) . '#organization';
		$web_id  = trailingslashit(Resolver::frontend_url($settings, '/')) . '#website';
		$page_id = $canonical . '#webpage';

		if (! empty($schema['enable_website'])) {
			$graph[] = self::website_node($settings, $web_id, $org_id);
		}

		if (! empty($schema['enable_webpage']) || 'WebPage' === $schema_type) {
			$graph[] = array(
				'@type'       => 'WebPage',
				'@id'         => $page_id,
				'url'         => $canonical,
				'name'        => $title,
				'description' => $description,
				'isPartOf'    => array( '@id' => $web_id ),
				'inLanguage'  => get_bloginfo('language'),
			);
		}

		if (! empty($schema['enable_article']) && in_array($schema_type, array( 'Article', 'NewsArticle', 'BlogPosting' ), true)) {
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

			$article = array(
				'@type'            => $schema_type,
				'@id'              => $canonical . '#article',
				'headline'         => $title,
				'description'      => $description,
				'datePublished'    => get_the_date('c', $post),
				'dateModified'     => get_the_modified_date('c', $post),
				'mainEntityOfPage' => array( '@id' => $page_id ),
				'author'           => array(
					'@type' => 'Person',
					'name'  => get_the_author_meta('display_name', (int) $post->post_author),
				),
				'image'            => $image_url !== '' ? array( $image_url ) : array(),
			);

			if ($primary_category) {
				$article['articleSection'] = (string) $primary_category->name;
			}

			$keywords = array();
			if (! empty($entity['focus_keyphrase'])) {
				$keywords[] = (string) $entity['focus_keyphrase'];
			}
			if ($primary_topic) {
				$keywords[] = (string) $primary_topic->name;
			}
			$topic_terms = get_the_terms($post, 'post_tag');
			if (is_array($topic_terms)) {
				foreach ($topic_terms as $term) {
					if ($term instanceof \WP_Term && ( ! $primary_topic || (int) $term->term_id !== (int) $primary_topic->term_id )) {
						$keywords[] = (string) $term->name;
					}
				}
			}
			$keywords = array_values(array_unique(array_filter($keywords)));
			if ($keywords !== array()) {
				$article['keywords'] = implode(', ', $keywords);
			}

			$graph[] = $article;
		}

		if (! empty($schema['enable_breadcrumbs'])) {
			$primary_category = PrimaryTerms::resolve(
				$post,
				'category',
				isset($entity['primary_category_id']) ? (int) $entity['primary_category_id'] : null
			);
			$graph[] = self::breadcrumb_node($post, $settings, $canonical, $title, $primary_category);
		}

		$org = self::organization_node($settings, $org_id);
		if ($org) {
			array_unshift($graph, $org);
		}

		$custom = $entity['custom_json_ld'] ?? ($schema['custom_json_ld'] ?? '');
		if (is_string($custom) && $custom !== '') {
			$rendered = Engine::render($custom, Resolver::context_for_post($post, $settings));
			$decoded  = json_decode($rendered, true);
			if (is_array($decoded)) {
				$graph[] = $decoded;
			}
		}

		return array(
			'@context' => 'https://schema.org',
			'@graph'   => $graph,
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function build_for_home(
		array $settings,
		string $canonical,
		string $title,
		string $description,
		string $image_url
	): array {
		$graph  = array();
		$schema = $settings['schema'];
		$org_id = trailingslashit($canonical) . '#organization';
		$web_id = trailingslashit($canonical) . '#website';

		$org = self::organization_node($settings, $org_id);
		if ($org) {
			$graph[] = $org;
		}

		if (! empty($schema['enable_website'])) {
			$graph[] = self::website_node($settings, $web_id, $org_id);
		}

		if (! empty($schema['enable_webpage'])) {
			$graph[] = array(
				'@type'       => 'WebPage',
				'@id'         => $canonical . '#webpage',
				'url'         => $canonical,
				'name'        => $title,
				'description' => $description,
				'isPartOf'    => array( '@id' => $web_id ),
				'about'       => array( '@id' => $org_id ),
				'image'       => $image_url !== '' ? $image_url : null,
			);
		}

		return array(
			'@context' => 'https://schema.org',
			'@graph'   => array_values(array_filter($graph)),
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>|null
	 */
	private static function organization_node(array $settings, string $org_id): ?array {
		$schema = $settings['schema'];
		$name   = (string) ($schema['organization_name'] ?: get_bloginfo('name'));
		$url    = (string) ($schema['organization_url'] ?: Resolver::frontend_url($settings, '/'));
		$logo   = ! empty($schema['organization_logo'])
			? (string) wp_get_attachment_image_url((int) $schema['organization_logo'], 'full')
			: '';

		$node = array(
			'@type' => 'Organization',
			'@id'   => $org_id,
			'name'  => $name,
			'url'   => $url,
		);

		if ($logo !== '') {
			$node['logo'] = array(
				'@type' => 'ImageObject',
				'url'   => $logo,
			);
		}

		return $node;
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	private static function website_node(array $settings, string $web_id, string $org_id): array {
		return array(
			'@type'     => 'WebSite',
			'@id'       => $web_id,
			'url'       => Resolver::frontend_url($settings, '/'),
			'name'      => (string) ($settings['global']['site_title'] ?: get_bloginfo('name')),
			'publisher' => array( '@id' => $org_id ),
			'inLanguage'=> get_bloginfo('language'),
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	private static function breadcrumb_node(
		WP_Post $post,
		array $settings,
		string $canonical,
		string $title,
		?\WP_Term $primary_category = null
	): array {
		$trail = Breadcrumbs::for_post($post, $settings, $canonical, $title, $primary_category);
		$items = array();
		foreach ($trail as $index => $crumb) {
			$items[] = array(
				'@type'    => 'ListItem',
				'position' => $index + 1,
				'name'     => $crumb['name'],
				'item'     => $crumb['url'],
			);
		}

		return array(
			'@type'           => 'BreadcrumbList',
			'@id'             => $canonical . '#breadcrumb',
			'itemListElement' => $items,
		);
	}
}

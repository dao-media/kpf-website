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
			$graph[] = array(
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
		}

		if (! empty($schema['enable_breadcrumbs'])) {
			$graph[] = self::breadcrumb_node($post, $settings, $canonical, $title);
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
	private static function breadcrumb_node(WP_Post $post, array $settings, string $canonical, string $title): array {
		$items = array(
			array(
				'@type'    => 'ListItem',
				'position' => 1,
				'name'     => (string) ($settings['global']['site_title'] ?: get_bloginfo('name')),
				'item'     => Resolver::frontend_url($settings, '/'),
			),
		);

		if ('page' === $post->post_type) {
			$ancestors = array_reverse(get_post_ancestors($post));
			$position  = 2;
			foreach ($ancestors as $ancestor_id) {
				$items[] = array(
					'@type'    => 'ListItem',
					'position' => $position,
					'name'     => get_the_title($ancestor_id),
					'item'     => Resolver::frontend_url($settings, (string) get_page_uri($ancestor_id)),
				);
				++$position;
			}
			$items[] = array(
				'@type'    => 'ListItem',
				'position' => $position,
				'name'     => $title,
				'item'     => $canonical,
			);
		} else {
			$items[] = array(
				'@type'    => 'ListItem',
				'position' => 2,
				'name'     => $title,
				'item'     => $canonical,
			);
		}

		return array(
			'@type'           => 'BreadcrumbList',
			'@id'             => $canonical . '#breadcrumb',
			'itemListElement' => $items,
		);
	}
}

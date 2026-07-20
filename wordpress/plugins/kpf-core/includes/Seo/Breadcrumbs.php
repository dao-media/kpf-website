<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use WP_Post;
use WP_Term;

/**
 * Builds a breadcrumb trail for schema and frontend rendering.
 */
final class Breadcrumbs {
	/**
	 * @param array<string, mixed> $settings
	 * @return array<int, array{name: string, url: string}>
	 */
	public static function for_post(
		WP_Post $post,
		array $settings,
		string $canonical,
		string $title,
		?WP_Term $primary_category = null
	): array {
		$items = array(
			array(
				'name' => (string) ($settings['global']['site_title'] ?: get_bloginfo('name')),
				'url'  => Resolver::frontend_url($settings, '/'),
			),
		);

		if ('page' === $post->post_type) {
			$ancestors = array_reverse(get_post_ancestors($post));
			foreach ($ancestors as $ancestor_id) {
				$items[] = array(
					'name' => (string) get_the_title($ancestor_id),
					'url'  => Resolver::frontend_url($settings, '/' . ltrim((string) get_page_uri($ancestor_id), '/')),
				);
			}
		} elseif ($primary_category instanceof WP_Term) {
			$category_url = PrimaryTerms::term_url($primary_category, $settings);
			if ($category_url !== '') {
				$items[] = array(
					'name' => (string) $primary_category->name,
					'url'  => $category_url,
				);
			}
		}

		$items[] = array(
			'name' => $title,
			'url'  => $canonical,
		);

		return $items;
	}
}

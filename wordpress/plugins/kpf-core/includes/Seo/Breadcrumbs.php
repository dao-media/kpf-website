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
		?WP_Term $primary_category = null // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
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
		} elseif ('post' === $post->post_type) {
			// Faust has no category archives; /category/… 404s. Trail through the blog.
			$blog_id   = (int) get_option('page_for_posts');
			$blog_name = $blog_id > 0 ? (string) get_the_title($blog_id) : '';
			$items[]   = array(
				'name' => $blog_name !== '' ? $blog_name : __( 'Blog', 'kpf-core' ),
				'url'  => Resolver::frontend_url($settings, '/blog'),
			);
		}

		$items[] = array(
			'name' => (string) get_the_title($post) ?: $title,
			'url'  => $canonical,
		);

		return $items;
	}
}

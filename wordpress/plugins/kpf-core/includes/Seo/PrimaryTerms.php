<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use WP_Post;
use WP_Term;

/**
 * Resolves Yoast/Rank Math–style primary taxonomy terms for a post.
 */
final class PrimaryTerms {
	/**
	 * Prefer an explicitly chosen primary term when it is still assigned;
	 * otherwise fall back to the first assigned term.
	 */
	public static function resolve(WP_Post $post, string $taxonomy, ?int $preferred_id): ?WP_Term {
		$terms = get_the_terms($post, $taxonomy);
		if (! is_array($terms) || $terms === array()) {
			return null;
		}

		if ($preferred_id) {
			foreach ($terms as $term) {
				if ($term instanceof WP_Term && (int) $term->term_id === $preferred_id) {
					return $term;
				}
			}
		}

		$first = $terms[0];
		return $first instanceof WP_Term ? $first : null;
	}

	/**
	 * @param array<string, mixed> $settings
	 */
	public static function term_url(WP_Term $term, array $settings): string {
		$link = get_term_link($term);
		if (is_wp_error($link) || ! is_string($link) || $link === '') {
			return '';
		}
		$path = (string) wp_parse_url($link, PHP_URL_PATH);
		return $path !== '' ? Resolver::frontend_url($settings, $path) : '';
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array{id: int, name: string, slug: string, url: string}|null
	 */
	public static function to_payload(?WP_Term $term, array $settings): ?array {
		if (! $term instanceof WP_Term) {
			return null;
		}

		return array(
			'id'   => (int) $term->term_id,
			'name' => (string) $term->name,
			'slug' => (string) $term->slug,
			'url'  => self::term_url($term, $settings),
		);
	}
}

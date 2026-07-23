<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

use KPF\Core\Seo\Tags\Registry as SeoTagRegistry;

final class Placeholders {
	/**
	 * @return array<int, array{token: string, label: string, description: string, group: string}>
	 */
	public static function all(): array {
		$items = array(
			self::item( '{{page.title}}', __( 'Page title', 'kpf-core' ), __( 'Escaped page title.', 'kpf-core' ), 'page' ),
			self::item( '{{{page.content}}}', __( 'Page content', 'kpf-core' ), __( 'Rendered WordPress block content.', 'kpf-core' ), 'page' ),
			self::item( '{{page.excerpt}}', __( 'Page excerpt', 'kpf-core' ), __( 'Escaped page summary.', 'kpf-core' ), 'page' ),
			self::item( '{{page.slug}}', __( 'Page slug', 'kpf-core' ), __( 'URL-safe page name.', 'kpf-core' ), 'page' ),
			self::item( '{{page.uri}}', __( 'Page URI', 'kpf-core' ), __( 'Relative WordPress page address.', 'kpf-core' ), 'page' ),
			self::item( '{{page.link}}', __( 'Page URL', 'kpf-core' ), __( 'Canonical public page URL.', 'kpf-core' ), 'page' ),
			self::item( '{{page.date}}', __( 'Published date', 'kpf-core' ), __( 'ISO publication date.', 'kpf-core' ), 'page' ),
			self::item( '{{page.modified}}', __( 'Modified date', 'kpf-core' ), __( 'ISO last-modified date.', 'kpf-core' ), 'page' ),
			self::item( '{{page.author.name}}', __( 'Author name', 'kpf-core' ), __( 'Display name of the page author.', 'kpf-core' ), 'page' ),
			self::item( '{{page.author.uri}}', __( 'Author URI', 'kpf-core' ), __( 'Public author archive URI.', 'kpf-core' ), 'page' ),
			self::item( '{{page.featuredImage.url}}', __( 'Featured image URL', 'kpf-core' ), __( 'Full featured-image URL.', 'kpf-core' ), 'media' ),
			self::item( '{{page.featuredImage.alt}}', __( 'Featured image description', 'kpf-core' ), __( 'Alternative text for the featured image.', 'kpf-core' ), 'media' ),
			self::item( '{{page.featuredImage.caption}}', __( 'Featured image caption', 'kpf-core' ), __( 'Featured-image caption.', 'kpf-core' ), 'media' ),
			self::item( '{{page.featuredImage.width}}', __( 'Featured image width', 'kpf-core' ), __( 'Image width in pixels.', 'kpf-core' ), 'media' ),
			self::item( '{{page.featuredImage.height}}', __( 'Featured image height', 'kpf-core' ), __( 'Image height in pixels.', 'kpf-core' ), 'media' ),
			self::item( '{{page.featuredImage.srcSet}}', __( 'Featured image source set', 'kpf-core' ), __( 'Responsive image srcset.', 'kpf-core' ), 'media' ),
			self::item( '{{page.seo.title}}', __( 'SEO title', 'kpf-core' ), __( 'Resolved search title.', 'kpf-core' ), 'seo' ),
			self::item( '{{page.seo.description}}', __( 'SEO description', 'kpf-core' ), __( 'Resolved search description.', 'kpf-core' ), 'seo' ),
			self::item( '{{page.seo.canonical}}', __( 'Canonical URL', 'kpf-core' ), __( 'Resolved canonical page URL.', 'kpf-core' ), 'seo' ),
			self::item( '{{fields.key}}', __( 'Custom design field', 'kpf-core' ), __( 'Replace “key” with a custom field key from the Page editor.', 'kpf-core' ), 'fields' ),
		);

		foreach ( self::seo_pattern_items() as $item ) {
			$items[] = $item;
		}

		/**
		 * Filter the design placeholder catalog (e.g. site-wide custom tags).
		 *
		 * @param array<int, array{token: string, label: string, description: string, group: string}> $items
		 */
		$items = apply_filters( 'kpf_design_placeholders', $items );
		if ( ! is_array( $items ) ) {
			$items = array();
		}

		usort(
			$items,
			static function ( array $a, array $b ): int {
				$group = self::group_sort_key( $a['group'] ) <=> self::group_sort_key( $b['group'] );
				if ( 0 !== $group ) {
					return $group;
				}
				return strcasecmp( $a['label'], $b['label'] );
			}
		);

		return $items;
	}

	/**
	 * SEO %% tokens for title/description patterns (also listed in SEO → Placeholders).
	 *
	 * @return array<int, array{token: string, label: string, description: string, group: string}>
	 */
	public static function seo_pattern_items(): array {
		if ( ! class_exists( SeoTagRegistry::class ) ) {
			return array();
		}

		SeoTagRegistry::boot();
		$items = array();
		foreach ( SeoTagRegistry::catalog() as $tag ) {
			$invocation = (string) ( $tag['invocation'] ?? '' );
			if ( $invocation === '' ) {
				continue;
			}
			$items[] = self::item(
				$invocation,
				(string) ( $tag['label'] ?? $tag['token'] ?? $invocation ),
				(string) ( $tag['description'] ?? '' ),
				'seo_patterns'
			);
		}

		return $items;
	}

	/**
	 * Map of page-editor field keys → design Mustache tags for label chips.
	 *
	 * @return array<string, string>
	 */
	public static function editor_field_tags(): array {
		return array(
			'title'             => '{{page.title}}',
			'slug'              => '{{page.slug}}',
			'excerpt'           => '{{page.excerpt}}',
			'date'              => '{{page.date}}',
			'featuredImage.url' => '{{page.featuredImage.url}}',
			'seo.title'         => '{{page.seo.title}}',
			'seo.description'   => '{{page.seo.description}}',
			'seo.canonical'     => '{{page.seo.canonical}}',
		);
	}

	/**
	 * @return array{token: string, label: string, description: string, group: string}
	 */
	private static function item( string $token, string $label, string $description, string $group ): array {
		return compact( 'token', 'label', 'description', 'group' );
	}

	private static function group_sort_key( string $group ): int {
		$order = array(
			'page'         => 10,
			'media'        => 20,
			'seo'          => 30,
			'seo_patterns' => 40,
			'fields'       => 50,
			'site'         => 55,
			'queries'      => 57,
			'library'      => 60,
		);
		return $order[ $group ] ?? 100;
	}
}

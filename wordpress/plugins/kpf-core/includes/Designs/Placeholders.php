<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

final class Placeholders {
	/**
	 * @return array<int, array{token: string, label: string, description: string}>
	 */
	public static function all(): array {
		return array(
			self::item( '{{page.title}}', __( 'Page title', 'kpf-core' ), __( 'Escaped page title.', 'kpf-core' ) ),
			self::item( '{{{page.content}}}', __( 'Page content', 'kpf-core' ), __( 'Rendered WordPress block content.', 'kpf-core' ) ),
			self::item( '{{page.excerpt}}', __( 'Page excerpt', 'kpf-core' ), __( 'Escaped page summary.', 'kpf-core' ) ),
			self::item( '{{page.slug}}', __( 'Page slug', 'kpf-core' ), __( 'URL-safe page name.', 'kpf-core' ) ),
			self::item( '{{page.uri}}', __( 'Page URI', 'kpf-core' ), __( 'Relative WordPress page address.', 'kpf-core' ) ),
			self::item( '{{page.link}}', __( 'Page URL', 'kpf-core' ), __( 'Canonical public page URL.', 'kpf-core' ) ),
			self::item( '{{page.date}}', __( 'Published date', 'kpf-core' ), __( 'ISO publication date.', 'kpf-core' ) ),
			self::item( '{{page.modified}}', __( 'Modified date', 'kpf-core' ), __( 'ISO last-modified date.', 'kpf-core' ) ),
			self::item( '{{page.author.name}}', __( 'Author name', 'kpf-core' ), __( 'Display name of the page author.', 'kpf-core' ) ),
			self::item( '{{page.author.uri}}', __( 'Author URI', 'kpf-core' ), __( 'Public author archive URI.', 'kpf-core' ) ),
			self::item( '{{page.featuredImage.url}}', __( 'Featured image URL', 'kpf-core' ), __( 'Full featured-image URL.', 'kpf-core' ) ),
			self::item( '{{page.featuredImage.alt}}', __( 'Featured image description', 'kpf-core' ), __( 'Alternative text for the featured image.', 'kpf-core' ) ),
			self::item( '{{page.featuredImage.caption}}', __( 'Featured image caption', 'kpf-core' ), __( 'Featured-image caption.', 'kpf-core' ) ),
			self::item( '{{page.featuredImage.width}}', __( 'Featured image width', 'kpf-core' ), __( 'Image width in pixels.', 'kpf-core' ) ),
			self::item( '{{page.featuredImage.height}}', __( 'Featured image height', 'kpf-core' ), __( 'Image height in pixels.', 'kpf-core' ) ),
			self::item( '{{page.featuredImage.srcSet}}', __( 'Featured image source set', 'kpf-core' ), __( 'Responsive image srcset.', 'kpf-core' ) ),
			self::item( '{{page.seo.title}}', __( 'SEO title', 'kpf-core' ), __( 'Resolved search title.', 'kpf-core' ) ),
			self::item( '{{page.seo.description}}', __( 'SEO description', 'kpf-core' ), __( 'Resolved search description.', 'kpf-core' ) ),
			self::item( '{{page.seo.canonical}}', __( 'Canonical URL', 'kpf-core' ), __( 'Resolved canonical page URL.', 'kpf-core' ) ),
			self::item( '{{fields.key}}', __( 'Custom design field', 'kpf-core' ), __( 'Replace “key” with a custom field key from the Page editor.', 'kpf-core' ) ),
		);
	}

	/**
	 * @return array{token: string, label: string, description: string}
	 */
	private static function item( string $token, string $label, string $description ): array {
		return compact( 'token', 'label', 'description' );
	}
}

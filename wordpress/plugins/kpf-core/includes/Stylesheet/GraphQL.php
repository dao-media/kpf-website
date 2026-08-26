<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

/**
 * WPGraphQL exposure for the managed global stylesheet.
 *
 * Faust should query revision/href only. Requesting css/foundation/pages
 * serializes megabytes into Apollo + __NEXT_DATA__.
 */
final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_object_type' ) || ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfStylesheetInfo',
			array(
				'description' => 'Layered KPF global stylesheet for the headless frontend (foundation tokens/components + pages layout/chrome).',
				'fields'      => array(
					'css'           => array(
						'type'        => 'String',
						'description' => 'Combined sanitized CSS ready for <style> injection (managed CMS CSS with current pages layer).',
					),
					'foundation'    => array(
						'type'        => 'String',
						'description' => 'Shipped foundation.css (tokens + component primitives).',
					),
					'pages'         => array(
						'type'        => 'String',
						'description' => 'Shipped pages.css (layout utilities, chrome, page section contracts).',
					),
					'revision'      => array(
						'type'        => 'String',
						'description' => 'SHA-256 of the combined css payload.',
					),
					'hasPagesLayer' => array(
						'type'        => 'Boolean',
						'description' => 'True when the combined css includes the KPF pages layer marker.',
					),
					'hasOverlay'    => array(
						'type'        => 'Boolean',
						'description' => 'True when the public Faust overlay (CMS tokens block) is non-empty. Faust should omit the stylesheet <link> when false.',
					),
					'byteLength'    => array(
						'type'        => 'Int',
						'description' => 'Byte length of the combined css payload.',
					),
					'updatedAt'     => array(
						'type'        => 'String',
						'description' => 'GMT modified datetime of the stylesheet CPT, when available.',
					),
					'href'          => array(
						'type'        => 'String',
						'description' => 'Public CSS URL. Faust should link this instead of inlining css into Apollo state.',
					),
				),
			)
		);

		// Backward-compatible raw string used by GlobalStylesheet / Faust templates.
		register_graphql_field(
			'RootQuery',
			'kpfStylesheet',
			array(
				'type'        => 'String',
				'description' => 'Sanitized global CSS for the Faust frontend (CMS stylesheet with the current pages layout layer).',
				'resolve'     => static fn(): string => self::resolve_css(),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfStylesheetInfo',
			array(
				'type'        => 'KpfStylesheetInfo',
				'description' => 'Foundation + pages stylesheet layers and revision metadata.',
				'resolve'     => static fn(): array => self::resolve_info(),
			)
		);
	}

	/**
	 * Combined CSS for injection. Always overlays the shipped pages layer so
	 * Faust receives responsive page contracts even if the CMS copy is stale.
	 */
	public static function resolve_css(): string {
		$managed    = self::managed_css();
		$foundation = Defaults::foundation_css();
		$pages      = Defaults::pages_css();
		$base       = '' !== $managed ? $managed : $foundation;

		return self::with_pages_layer( $base, $pages );
	}

	/**
	 * @return array{
	 *   css: string,
	 *   foundation: string,
	 *   pages: string,
	 *   revision: string,
	 *   hasPagesLayer: bool,
	 *   hasOverlay: bool,
	 *   byteLength: int,
	 *   updatedAt: string|null,
	 *   href: string
	 * }
	 */
	public static function resolve_info(): array {
		$foundation = Defaults::foundation_css();
		$pages      = Defaults::pages_css();
		$css        = self::resolve_css();
		$overlay    = Defaults::public_overlay_css( $css );

		return array(
			'css'           => $css,
			'foundation'    => $foundation,
			'pages'         => $pages,
			'revision'      => Meta::revision( $css ),
			'hasPagesLayer' => '' !== $pages && str_contains( $css, Defaults::PAGES_MARKER ),
			'hasOverlay'    => '' !== $overlay,
			'byteLength'    => strlen( $css ),
			'updatedAt'     => self::updated_at(),
			'href'          => Rest::public_url(),
		);
	}

	/**
	 * Ensure the pages layer is present and matches the shipped pages.css file.
	 */
	public static function with_pages_layer( string $css, string $pages ): string {
		$pages = trim( $pages );
		if ( '' === $pages ) {
			return Meta::sanitize_css( $css );
		}

		return Meta::sanitize_css( Defaults::replace_pages_layer( $css, $pages ) );
	}

	private static function managed_css(): string {
		$post_id = self::stylesheet_id();
		return $post_id ? Meta::get_css( $post_id ) : '';
	}

	private static function updated_at(): ?string {
		$post_id = self::stylesheet_id();
		if ( $post_id < 1 ) {
			return null;
		}

		$gmt = get_post_field( 'post_modified_gmt', $post_id );
		if ( ! is_string( $gmt ) || '' === $gmt || '0000-00-00 00:00:00' === $gmt ) {
			return null;
		}

		return $gmt;
	}

	private static function stylesheet_id(): int {
		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'orderby'        => 'ID',
				'order'          => 'ASC',
				'fields'         => 'ids',
			)
		);

		return $posts ? (int) $posts[0] : 0;
	}
}

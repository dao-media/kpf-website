<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use KPF\Core\Support\FrontendUrl;

/**
 * Seeds unique titles/descriptions onto core pages once.
 */
final class PageCopy {
	public const OPTION_KEY = 'kpf_seo_page_copy_v1';

	public static function ensure(): void {
		if ( get_option( self::OPTION_KEY ) === '1' ) {
			return;
		}

		self::patch_settings();
		self::patch_pages();
		self::patch_posts();

		update_option( self::OPTION_KEY, '1', true );
	}

	private static function patch_settings(): void {
		$settings = Settings::get();
		$global   = is_array( $settings['global'] ?? null ) ? $settings['global'] : array();
		$schema   = is_array( $settings['schema'] ?? null ) ? $settings['schema'] : array();
		$types    = is_array( $settings['post_types'] ?? null ) ? $settings['post_types'] : array();

		$global['home_title']       = PageDefaults::HOME_TITLE;
		$global['home_description'] = PageDefaults::HOME_DESCRIPTION;
		if ( empty( $global['og_default_image_url'] ) ) {
			$global['og_default_image_url'] = PageDefaults::default_og_url();
		}

		if ( (string) ( $schema['organization_name'] ?? '' ) === '' ) {
			$schema['organization_name'] = PageDefaults::ORG_NAME;
		}
		$schema['legal_name']     = PageDefaults::LEGAL_NAME;
		$schema['facebook_url']   = PageDefaults::FACEBOOK;
		$schema['instagram_url']  = PageDefaults::INSTAGRAM;
		$schema['founding_date']  = PageDefaults::FOUNDING_DATE;
		$schema['organization_url'] = $schema['organization_url'] ?: ( FrontendUrl::public_origin() . '/' );

		if ( ! isset( $types['post'] ) || ! is_array( $types['post'] ) ) {
			$types['post'] = Settings::default_post_type( 'post' );
		}
		$types['post']['title_template'] = '%%title%% %%sep%% Kevin Popke Foundation';
		$types['post']['schema_type']    = 'BlogPosting';

		$settings['global']     = $global;
		$settings['schema']     = $schema;
		$settings['post_types'] = $types;
		Settings::update( $settings );
	}

	private static function patch_pages(): void {
		foreach ( PageDefaults::pages() as $slug => $defaults ) {
			$page = get_page_by_path( $slug );
			if ( ! $page instanceof \WP_Post ) {
				continue;
			}

			$meta        = MetaRepository::get( (int) $page->ID );
			$description = (string) ( $meta['description_template'] ?? '' );
			$title       = (string) ( $meta['title_template'] ?? '' );

			$replace_description = ! PageDefaults::is_usable_description( $description );
			$replace_title       = PageDefaults::is_generic_title( $title !== '' ? $title : get_the_title( $page ), $slug );

			if ( 'blog' === $slug && PageDefaults::is_usable_description( $description ) ) {
				$replace_description = false;
				$replace_title       = false;
			}

			if ( $replace_title ) {
				$meta['title_template'] = $defaults['title'];
			}
			if ( $replace_description ) {
				$meta['description_template'] = $defaults['description'];
			}
			if ( empty( $meta['schema_type'] ) ) {
				$meta['schema_type'] = $defaults['schema_type'];
			}

			MetaRepository::update( (int) $page->ID, $meta );
		}
	}

	private static function patch_posts(): void {
		$query = new \WP_Query(
			array(
				'post_type'              => 'post',
				'post_status'            => 'publish',
				'posts_per_page'         => 50,
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof \WP_Post ) {
				continue;
			}
			$meta = MetaRepository::get( (int) $post->ID );
			if ( empty( $meta['schema_type'] ) || 'Article' === $meta['schema_type'] ) {
				$meta['schema_type'] = 'BlogPosting';
			}
			if ( ! PageDefaults::is_usable_description( (string) ( $meta['description_template'] ?? '' ) ) ) {
				$excerpt = $post->post_excerpt !== ''
					? $post->post_excerpt
					: wp_trim_words( wp_strip_all_tags( $post->post_content ), 28, '…' );
				if ( PageDefaults::is_usable_description( (string) $excerpt ) ) {
					$meta['description_template'] = $excerpt;
				}
			}
			MetaRepository::update( (int) $post->ID, $meta );
		}
	}
}

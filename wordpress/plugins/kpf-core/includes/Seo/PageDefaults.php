<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use KPF\Core\Support\FrontendUrl;

/**
 * Canonical public titles, descriptions, and share images for core pages.
 */
final class PageDefaults {
	public const HOME_TITLE = 'Kevin Popke Foundation | Veteran Grants in Tampa Bay, FL';
	public const HOME_DESCRIPTION = 'The Kevin Popke Foundation makes targeted grants to veteran-focused nonprofits across Tampa Bay and Florida. See where your donation goes — and give today.';

	public const LEGAL_NAME = 'The Kevin Popke Foundation, Inc.';
	public const ORG_NAME   = 'The Kevin Popke Foundation';
	public const FACEBOOK   = 'https://www.facebook.com/kevinpopkefoundation';
	public const INSTAGRAM  = 'https://www.instagram.com/kevinpopkefoundation';
	public const FOUNDING_DATE = '2016';

	public const DEFAULT_OG_PATH = '/media/home/kevin-double-exposure-cutout.webp';
	public const LOGO_PATH       = '/media/brand/50-badge.png';

	/**
	 * @return array<string, array{title: string, description: string, og_path: string, schema_type: string}>
	 */
	public static function pages(): array {
		return array(
			'about'   => array(
				'title'       => 'Who Was Kevin Popke? | About the Foundation in His Name',
				'description' => 'Meet Donald “Kevin” Popke — Army First Sergeant, paratrooper, and the man behind a foundation funding Florida’s veteran charities in his honor.',
				'og_path'     => '/media/about/hero-frame.png',
				'schema_type' => 'AboutPage',
			),
			'events'  => array(
				'title'       => 'Songwriters for Vets | Kevin Popke Foundation Events',
				'description' => 'Songwriters for Vets brings Nashville songwriters to Tampa Bay each year to raise grants for veteran charities. Get tickets or become a sponsor.',
				'og_path'     => '/media/events/featured-1.webp',
				'schema_type' => 'WebPage',
			),
			'contact' => array(
				'title'       => 'Contact the Kevin Popke Foundation | Tampa Bay, FL',
				'description' => 'Questions about a grant, event, sponsorship, or how to help Florida’s veterans? Contact the Kevin Popke Foundation — a real person reads every message.',
				'og_path'     => '/media/contact/hero-bridge.webp',
				'schema_type' => 'ContactPage',
			),
			'blog'    => array(
				'title'       => 'News & Updates | Kevin Popke Foundation, Inc.',
				'description' => 'Follow our grantees, volunteers, and events on the KPF blog, where we post regular news and updates to keep you informed.',
				'og_path'     => self::DEFAULT_OG_PATH,
				'schema_type' => 'CollectionPage',
			),
		);
	}

	public static function home(): array {
		return array(
			'title'       => self::HOME_TITLE,
			'description' => self::HOME_DESCRIPTION,
			'og_path'     => self::DEFAULT_OG_PATH,
			'schema_type' => 'WebPage',
		);
	}

	/**
	 * @return string[]
	 */
	public static function same_as(): array {
		return array( self::FACEBOOK, self::INSTAGRAM );
	}

	public static function media_url( string $path ): string {
		$path = '/' . ltrim( $path, '/' );
		return FrontendUrl::public_origin() . $path;
	}

	public static function default_og_url(): string {
		return self::media_url( self::DEFAULT_OG_PATH );
	}

	public static function logo_url(): string {
		return self::media_url( self::LOGO_PATH );
	}

	public static function for_slug( string $slug ): ?array {
		$slug = sanitize_title( $slug );
		if ( 'home' === $slug || '' === $slug ) {
			return self::home();
		}
		$pages = self::pages();
		return $pages[ $slug ] ?? null;
	}

	public static function is_usable_description( string $description ): bool {
		$description = trim( wp_strip_all_tags( $description ) );
		if ( $description === '' ) {
			return false;
		}
		if ( 0 === strcasecmp( $description, 'Editor save check' ) ) {
			return false;
		}
		return true;
	}

	public static function is_generic_title( string $title, string $slug ): bool {
		$title = trim( html_entity_decode( wp_strip_all_tags( $title ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
		if ( $title === '' ) {
			return true;
		}

		$slug = sanitize_title( $slug );
		if ( 'home' === $slug || '' === $slug ) {
			return in_array( $title, array( self::ORG_NAME, 'Kevin Popke Foundation' ), true );
		}

		$prefixes = array(
			'about'   => 'About |',
			'events'  => 'Events |',
			'contact' => 'Contact |',
		);
		if ( isset( $prefixes[ $slug ] ) && str_starts_with( $title, $prefixes[ $slug ] ) ) {
			return true;
		}

		return false;
	}
}

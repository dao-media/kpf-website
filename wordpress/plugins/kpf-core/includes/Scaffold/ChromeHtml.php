<?php

declare(strict_types=1);

namespace KPF\Core\Scaffold;

use KPF\Core\Support\FrontendUrl;

/**
 * Static HTML for global header / footer Components (wp_block).
 * Matches Faust scaffolds: KpfHeader, KpfMobileNav, KpfFooter (Figma 616:1061 / 950:566 / 416:100).
 */
final class ChromeHtml {
	/**
	 * @return list<array{href: string, label: string}>
	 */
	public static function primary_nav(): array {
		return array(
			array( 'href' => '/', 'label' => 'Home' ),
			array( 'href' => '/about/', 'label' => 'About' ),
			array( 'href' => '/events/', 'label' => 'Events' ),
			array( 'href' => '/blog/', 'label' => 'Blog' ),
			array( 'href' => '/contact/', 'label' => 'Contact' ),
		);
	}

	public static function donate_href(): string {
		return '/#donate';
	}

	public static function brandmark_html(): string {
		$src = FrontendUrl::base() . 'media/brand/50-badge.png';

		return '<span class="kpf-header__badge"><img class="kpf-header__mark" src="' . esc_url( $src ) . '" alt="" width="320" height="480" decoding="async" aria-hidden="true" /></span>';
	}

	/** @deprecated Use brandmark_html(). */
	public static function brandmark_svg(): string {
		return self::brandmark_html();
	}

	public static function arrow_svg(): string {
		return '<svg class="kpf-mobile-nav__arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6.2 3.2 10.8 8l-4.6 4.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	}

	public static function menu_icon_svg(): string {
		return '<svg class="kpf-mobile-nav__icon kpf-mobile-nav__icon--menu" viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false"><path d="M2 5h18M2 11h18M2 17h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
	}

	public static function close_icon_svg(): string {
		return '<svg class="kpf-mobile-nav__icon kpf-mobile-nav__icon--close" viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false"><path d="M5 5l12 12M17 5 5 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
	}

	public static function header_html(): string {
		$brand   = 'Kevin Popke Foundation';
		$donate  = self::donate_href();
		$nav     = self::primary_nav();
		$items   = '';
		$mobile  = '';

		foreach ( $nav as $item ) {
			$href  = esc_url( $item['href'] );
			$label = esc_html( $item['label'] );
			$items .= '<li><a class="kpf-nav-link" href="' . $href . '" data-label="' . esc_attr( $item['label'] ) . '"><span class="kpf-nav-link__label">' . $label . '</span><span class="kpf-nav-link__line" aria-hidden="true"></span></a></li>';
			$mobile .= '<a class="kpf-mobile-nav__item" href="' . $href . '">' . self::arrow_svg() . '<span class="kpf-mobile-nav__label">' . $label . '</span></a>';
		}

		$html  = '<header class="kpf-header" data-kpf-header="float">';
		$html .= '<a class="kpf-header__brand" href="/" aria-label="' . esc_attr( $brand ) . '">';
		$html .= self::brandmark_html();
		$html .= '<span class="kpf-header__brand-text">' . esc_html( $brand ) . '</span>';
		$html .= '</a>';
		$html .= '<div class="kpf-header__spacer" aria-hidden="true"></div>';
		$html .= '<ul class="kpf-header__nav" aria-label="Primary">' . $items . '</ul>';
		$html .= '<div class="kpf-header__actions"><a class="kpf-btn kpf-btn--primary" href="' . esc_url( $donate ) . '">Donate</a></div>';
		$html .= '<div class="kpf-header__menu-slot">';
		$html .= '<div class="kpf-mobile-nav" data-state="closed">';
		$html .= '<button type="button" class="kpf-mobile-nav__toggle" aria-expanded="false" aria-controls="kpf-mobile-nav-panel" aria-label="Open menu">';
		$html .= self::menu_icon_svg() . self::close_icon_svg();
		$html .= '</button>';
		$html .= '<div id="kpf-mobile-nav-panel" class="kpf-mobile-nav__panel" aria-hidden="true"><nav aria-label="Mobile">' . $mobile . '</nav></div>';
		$html .= '</div></div></header>';

		return $html;
	}

	public static function footer_html(): string {
		$brand   = 'The Kevin Popke Foundation, Inc.';
		$year    = (int) gmdate( 'Y' );
		$donate  = self::donate_href();
		$explore = array(
			array( 'href' => '/about/', 'label' => 'About' ),
			array( 'href' => '/events/', 'label' => 'Events' ),
			array( 'href' => '/blog/', 'label' => 'Blog' ),
		);
		$connect = array(
			array( 'href' => '/contact/', 'label' => 'Contact' ),
			array( 'href' => $donate, 'label' => 'Donate' ),
		);

		$explore_lis = '';
		foreach ( $explore as $item ) {
			$explore_lis .= '<li><a href="' . esc_url( $item['href'] ) . '">' . esc_html( $item['label'] ) . '</a></li>';
		}
		$connect_lis = '';
		foreach ( $connect as $item ) {
			$connect_lis .= '<li><a href="' . esc_url( $item['href'] ) . '">' . esc_html( $item['label'] ) . '</a></li>';
		}

		$html  = '<footer class="kpf-footer">';
		$html .= '<div class="kpf-footer__rule" aria-hidden="true"></div>';
		$html .= '<div class="kpf-footer__body kpf-u-container">';
		$html .= '<blockquote class="kpf-footer__tagline">Together, we can.</blockquote>';
		$html .= '<div class="kpf-footer__grid">';
		$html .= '<div class="kpf-footer__brand"><p class="kpf-footer__brand-name">' . esc_html( $brand ) . '</p>';
		$html .= '<p class="kpf-footer__brand-note">A 501(c)(3) nonprofit organization serving Tampa Bay &amp; Florida.</p></div>';
		$html .= '<div class="kpf-footer__columns"><div><p class="kpf-footer__heading">Explore</p><ul class="kpf-footer__list">' . $explore_lis . '</ul></div>';
		$html .= '<div><p class="kpf-footer__heading">Connect</p><ul class="kpf-footer__list">' . $connect_lis . '</ul></div></div>';
		$html .= '<div class="kpf-footer__cta-card"><p class="kpf-footer__cta-title">Prefer to just give?</p>';
		$html .= '<p class="kpf-footer__cta-body">Every gift becomes a grant in Kevin’s name.</p>';
		$html .= '<a class="kpf-btn kpf-btn--primary kpf-btn--sm" href="' . esc_url( $donate ) . '">Donate</a></div>';
		$html .= '</div></div>';
		$html .= '<div class="kpf-footer__bar kpf-u-container"><p>© ' . $year . ' ' . esc_html( $brand ) . '</p><p><a href="/">Home</a></p></div>';
		$html .= '</footer>';

		return $html;
	}

	/**
	 * Gutenberg HTML block wrapper for a synced Component.
	 */
	public static function as_html_block( string $inner_html ): string {
		return "<!-- wp:html -->\n" . $inner_html . "\n<!-- /wp:html -->";
	}

	/**
	 * Absolute frontend asset URL helper (unused in seeded HTML; kept for media sync).
	 */
	public static function frontend_media( string $path ): string {
		return FrontendUrl::base() . ltrim( $path, '/' );
	}
}

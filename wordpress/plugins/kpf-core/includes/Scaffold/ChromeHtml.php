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
		return 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=kevinpopke.foundation%40gmail.com&item_name=The%20Kevin%20Popke%20Foundation&currency_code=USD';
	}

	/**
	 * PayPal donate CTA — same destination as Faust DonateButton.
	 */
	public static function donate_button( string $label = 'Donate', string $classes = 'kpf-btn kpf-btn--primary' ): string {
		if ( ! str_contains( $classes, 'kpf-btn--donate' ) ) {
			$classes .= ' kpf-btn--donate';
		}

		$ext_attr = ' data-kpf-external="true"';
		$onclick  = '(function(el){var h=el.getAttribute("data-kpf-href");if(!h)return;if(el.getAttribute("data-kpf-external")==="true"&&!/^mailto:|^tel:/i.test(h)){window.open(h,"_blank","noopener,noreferrer");return;}location.assign(h);})(this)';

		$button = '<button type="button" class="' . esc_attr( $classes ) . '" data-kpf-href="' . esc_url( self::donate_href() ) . '"' . $ext_attr . ' onclick="' . esc_attr( $onclick ) . '"><span class="kpf-btn__cluster"><span class="kpf-btn__label">' . esc_html( $label ) . '</span><span class="kpf-btn__paypal-clip"><span class="kpf-btn__icon kpf-btn__icon--trailing kpf-btn__icon--paypal" aria-hidden="true">' . self::paypal_mark_html() . '</span></span></span></button>';

		return '<span class="kpf-chip-tip-host kpf-donate-tip" data-kpf-chip-tip="Opens PayPal" data-kpf-chip-tip-desktop="true">' . $button . '</span>';
	}

	/** Official 2014 PayPal monogram (baked white + alpha — do not tint). */
	public static function paypal_mark_html(): string {
		$src = FrontendUrl::base() . 'media/brand/paypal-icon.png';

		return '<img class="kpf-btn__paypal" src="' . esc_url( $src ) . '" alt="" width="16" height="20" decoding="async" draggable="false" />';
	}

	public static function brandmark_html(): string {
		$src = FrontendUrl::base() . 'media/brand/50-badge.png';

		$strings  = '<svg class="kpf-header__badge-strings" viewBox="0 0 86 177" width="86" height="177" aria-hidden="true" focusable="false">';
		$strings .= '<defs><filter id="kpf-badge-string-shadow" x="-40%" y="-20%" width="180%" height="140%" color-interpolation-filters="sRGB">';
		$strings .= '<feDropShadow dx="0" dy="0.6" stdDeviation="0.55" flood-color="#12090a" flood-opacity="0.28"/>';
		$strings .= '</filter></defs>';
		$strings .= '<g class="kpf-header__badge-strings-group" filter="url(#kpf-badge-string-shadow)" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" fill="none">';
		$strings .= '<line x1="43" y1="5" x2="31" y2="52"/><line x1="43" y1="5" x2="55" y2="52"/>';
		$strings .= '</g>';
		$strings .= '<circle class="kpf-header__badge-string-pin" cx="43" cy="5" r="1.65" filter="url(#kpf-badge-string-shadow)"/>';
		$strings .= '</svg>';

		return '<span class="kpf-header__badge" data-kpf-badge="">' . $strings
			. '<img class="kpf-header__mark" src="' . esc_url( $src ) . '" alt="" width="320" height="480" decoding="async" aria-hidden="true" /></span>';
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
		$html .= '<span class="kpf-header__brand-text">';
		$html .= '<span class="kpf-header__brand-text-label">';
		$html .= '<span class="kpf-header__brand-line">Kevin Popke</span>';
		$html .= '<span class="kpf-header__brand-line">Foundation</span>';
		$html .= '</span>';
		$html .= '</span>';
		$html .= '</a>';
		$html .= '<div class="kpf-header__spacer" aria-hidden="true"></div>';
		$html .= '<ul class="kpf-header__nav" aria-label="Primary">' . $items . '</ul>';
		$html .= '<div class="kpf-header__actions">' . self::donate_button( 'Donate', 'kpf-btn kpf-btn--primary' ) . '</div>';
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
			$is_external = (bool) preg_match( '#^(https?:|mailto:|tel:)#i', $item['href'] );
			if ( $is_external ) {
				$connect_lis .= '<li><a href="' . esc_url( $item['href'] ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( $item['label'] ) . '</a></li>';
			} else {
				$connect_lis .= '<li><a href="' . esc_url( $item['href'] ) . '">' . esc_html( $item['label'] ) . '</a></li>';
			}
		}

		$html  = '<footer class="kpf-footer">';
		$html .= '<div class="kpf-footer__body kpf-u-container">';
		$html .= '<blockquote class="kpf-footer__tagline">Together, we can.</blockquote>';
		$html .= '<div class="kpf-footer__grid">';
		$html .= '<div class="kpf-footer__brand"><p class="kpf-footer__brand-name">' . esc_html( $brand ) . '</p>';
		$html .= '<p class="kpf-footer__brand-note">A 501(c)(3) nonprofit organization serving Tampa Bay &amp; Florida.</p>';
		$html .= '<div class="kpf-cigar kpf-footer__cigar" aria-hidden="true">';
		$html .= '<img class="kpf-cigar__image" src="/media/cigar/Cigar.png" alt=""/>';
		$html .= '<video class="kpf-cigar__smoke" autoplay loop muted playsinline preload="auto" aria-hidden="true"><source src="/media/cigar/smoke.mp4" type="video/mp4"/></video>';
		$html .= '</div></div>';
		$html .= '<div class="kpf-footer__columns"><div><p class="kpf-footer__heading">Explore</p><ul class="kpf-footer__list">' . $explore_lis . '</ul></div>';
		$html .= '<div><p class="kpf-footer__heading">Connect</p><ul class="kpf-footer__list">' . $connect_lis . '</ul></div></div>';
		$html .= '<div class="kpf-footer__cta-card"><h5 class="kpf-footer__cta-title">Your donations support our nation’s protectors.</h5>';
		$html .= '<p class="kpf-footer__cta-body kpf-body--s">Every gift provided to the Kevin Popke Foundation is invested back into organizations doing incredible work for vets and their families.</p>';
		$html .= self::donate_button( 'Donate', 'kpf-btn kpf-btn--primary kpf-btn--sm' ) . '</div>';
		$html .= '</div></div>';
		$html .= '<div class="kpf-footer__bar kpf-u-container">';
		$html .= '<p class="kpf-footer__copy">© <time datetime="' . esc_attr( (string) $year ) . '">' . esc_html( (string) $year ) . '</time> ' . esc_html( $brand ) . ' All rights reserved.</p>';
		$html .= '<p class="kpf-footer__legal"><a href="/privacy/">Privacy Policy</a></p>';
		$html .= '</div>';
		$html .= '</footer>';

		return $html;
	}

	/**
	 * Native button CTA for scaffold chrome (keeps buttons as buttons in the a11y tree).
	 */
	public static function action_button( string $label, string $href, string $classes = 'kpf-btn kpf-btn--primary', bool $external = false ): string {
		$ext_attr = $external ? ' data-kpf-external="true"' : '';
		$onclick  = '(function(el){var h=el.getAttribute("data-kpf-href");if(!h)return;if(el.getAttribute("data-kpf-external")==="true"&&!/^mailto:|^tel:/i.test(h)){window.open(h,"_blank","noopener,noreferrer");return;}location.assign(h);})(this)';

		return '<button type="button" class="' . esc_attr( $classes ) . '" data-kpf-href="' . esc_url( $href ) . '"' . $ext_attr . ' onclick="' . esc_attr( $onclick ) . '">' . esc_html( $label ) . '</button>';
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

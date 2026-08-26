<?php

declare(strict_types=1);

namespace KPF\Core\Code;

use KPF\Core\Stylesheet\Meta as StylesheetMeta;

/**
 * Allowlisted public snippet bodies. Admin CPT still stores raw code;
 * GraphQL / Faust only receive sanitized CSS, an https GTM/analytics script
 * src on known hosts, a GTM noscript iframe, or script-free HTML.
 * Inline admin JS is never returned.
 */
final class PublicPayload {
	public const SCRIPT_HOSTS = array(
		'www.googletagmanager.com',
		'googletagmanager.com',
		'www.google-analytics.com',
		'google-analytics.com',
		'www.googletagmanager.cn',
	);

	/**
	 * @param array<string, mixed> $snippet
	 * @return array<string, mixed>|null
	 */
	public static function for_public( array $snippet ): ?array {
		$type     = sanitize_key( (string) ( $snippet['type'] ?? 'html' ) );
		$location = sanitize_key( (string) ( $snippet['location'] ?? 'header' ) );
		$raw      = (string) ( $snippet['code'] ?? '' );

		if ( 'css' === $type ) {
			$code = StylesheetMeta::sanitize_css( $raw );
		} elseif ( 'js' === $type ) {
			$code = self::allowlisted_script_src( $raw );
		} else {
			$gtm = self::gtm_id( $raw );
			if ( '' !== $gtm ) {
				if ( 'footer' === $location ) {
					$type = 'html';
					$code = self::gtm_body( $gtm );
				} else {
					$type = 'js';
					$code = self::gtm_script_src( $gtm );
				}
			} else {
				$code = wp_kses( $raw, self::html_allowed() );
			}
		}

		if ( '' === trim( $code ) ) {
			return null;
		}

		$snippet['type']     = $type;
		$snippet['location'] = $location;
		$snippet['code']     = $code;
		return $snippet;
	}

	public static function code( string $type, string $code, string $location = 'header' ): string {
		$public = self::for_public(
			array(
				'type'     => $type,
				'code'     => $code,
				'location' => $location,
			)
		);

		return is_array( $public ) ? (string) $public['code'] : '';
	}

	public static function allowlisted_script_src( string $code ): string {
		$code = trim( $code );
		if ( '' === $code ) {
			return '';
		}

		$url = $code;
		if ( preg_match( '/\bsrc\s*=\s*["\']([^"\']+)["\']/i', $code, $match ) ) {
			$url = $match[1];
		} elseif ( preg_match( '#https://[^\s\'"<>]+#i', $code, $match ) ) {
			$url = $match[0];
		}

		$url  = esc_url_raw( $url, array( 'https' ) );
		$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );
		if ( '' === $url || ! in_array( $host, self::SCRIPT_HOSTS, true ) ) {
			return '';
		}

		return $url;
	}

	public static function gtm_id( string $code ): string {
		if ( ! preg_match( '/\b(GTM-[A-Z0-9]+)\b/i', $code, $match ) ) {
			return '';
		}
		if ( ! preg_match( '/googletagmanager\.com/i', $code ) ) {
			return '';
		}

		return strtoupper( $match[1] );
	}

	public static function gtm_script_src( string $id ): string {
		$id = preg_replace( '/[^A-Z0-9\-]/', '', strtoupper( $id ) ) ?: '';
		if ( '' === $id ) {
			return '';
		}

		return 'https://www.googletagmanager.com/gtm.js?id=' . rawurlencode( $id );
	}

	public static function gtm_body( string $id ): string {
		$id = preg_replace( '/[^A-Z0-9\-]/', '', strtoupper( $id ) ) ?: '';
		if ( '' === $id ) {
			return '';
		}

		return "<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src=\"https://www.googletagmanager.com/ns.html?id={$id}\"\nheight=\"0\" width=\"0\" style=\"display:none;visibility:hidden\"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->";
	}

	/**
	 * @return array<string, array<string, bool>>
	 */
	private static function html_allowed(): array {
		return array(
			'a'        => array(
				'href'   => true,
				'title'  => true,
				'rel'    => true,
				'target' => true,
			),
			'br'       => array(),
			'div'      => array(
				'class' => true,
				'id'    => true,
			),
			'img'      => array(
				'src'    => true,
				'alt'    => true,
				'width'  => true,
				'height' => true,
				'class'  => true,
			),
			'noscript' => array(),
			'p'        => array(
				'class' => true,
			),
			'span'     => array(
				'class' => true,
			),
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Code;

use KPF\Core\Stylesheet\Meta as StylesheetMeta;

/**
 * Allowlisted public snippet bodies. Admin CPT still stores raw code;
 * GraphQL / Faust only receive CSS, reconstructed GTM, or https script src
 * on known hosts.
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
		$code     = self::code( $type, (string) ( $snippet['code'] ?? '' ), $location );
		if ( '' === trim( $code ) ) {
			return null;
		}

		$snippet['type']     = $type;
		$snippet['location'] = $location;
		$snippet['code']     = $code;
		return $snippet;
	}

	public static function code( string $type, string $code, string $location = 'header' ): string {
		$code = str_replace( "\0", '', $code );
		if ( 'css' === $type ) {
			return StylesheetMeta::sanitize_css( $code );
		}

		if ( 'js' === $type ) {
			return self::allowlisted_script_src( $code );
		}

		$gtm = self::gtm_id( $code );
		if ( '' !== $gtm ) {
			return 'footer' === $location ? self::gtm_body( $gtm ) : self::gtm_head( $gtm );
		}

		return wp_kses( $code, self::html_allowed() );
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

	public static function gtm_head( string $id ): string {
		$id = preg_replace( '/[^A-Z0-9\-]/', '', strtoupper( $id ) ) ?: '';
		if ( '' === $id ) {
			return '';
		}

		return "<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','{$id}');</script>\n<!-- End Google Tag Manager -->";
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

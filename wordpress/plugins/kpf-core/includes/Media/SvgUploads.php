<?php

declare(strict_types=1);

namespace KPF\Core\Media;

use DOMDocument;
use DOMElement;
use DOMNode;
use WP_Error;

final class SvgUploads {
	private const MIME = 'image/svg+xml';
	private const MAX_BYTES = 5_242_880;

	/** @var array<int, string> */
	private const TAGS = array(
		'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
		'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'pattern',
		'symbol', 'use', 'title', 'desc', 'text', 'tspan', 'marker',
	);

	/** @var array<int, string> */
	private const ATTRIBUTES = array(
		'id', 'class', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
		'xmlns', 'xmlns:xlink', 'viewbox', 'preserveaspectratio', 'width', 'height',
		'x', 'y', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy', 'cx', 'cy', 'r', 'rx', 'ry',
		'd', 'points', 'pathlength', 'marker-start', 'marker-mid', 'marker-end',
		'markerwidth', 'markerheight', 'refx', 'refy', 'orient', 'markerunits',
		'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-opacity',
		'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
		'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'transform', 'transform-origin',
		'gradientunits', 'gradienttransform', 'spreadmethod', 'fx', 'fy', 'fr',
		'offset', 'stop-color', 'stop-opacity', 'clip-path', 'clippathunits',
		'mask', 'maskunits', 'maskcontentunits', 'patternunits', 'patterncontentunits',
		'patterntransform', 'href', 'xlink:href', 'text-anchor', 'textlength',
		'lengthadjust', 'font-family', 'font-size', 'font-style', 'font-weight',
		'letter-spacing', 'word-spacing', 'dominant-baseline', 'vector-effect',
		'visibility', 'display', 'overflow', 'color', 'color-interpolation',
	);

	public static function register(): void {
		add_filter( 'upload_mimes', array( self::class, 'allow_mime' ) );
		add_filter( 'wp_check_filetype_and_ext', array( self::class, 'correct_filetype' ), 10, 5 );
		add_filter( 'wp_handle_upload_prefilter', array( self::class, 'sanitize_upload' ) );
		add_filter( 'wp_handle_sideload_prefilter', array( self::class, 'sanitize_upload' ) );
		add_filter( 'wp_generate_attachment_metadata', array( self::class, 'attachment_metadata' ), 10, 3 );
	}

	/**
	 * @param array<string, string> $mimes
	 * @return array<string, string>
	 */
	public static function allow_mime( array $mimes ): array {
		$mimes['svg'] = self::MIME;
		return $mimes;
	}

	/**
	 * @param array<string, mixed>  $data
	 * @param array<string, string>|null $mimes
	 * @return array<string, mixed>
	 */
	public static function correct_filetype( array $data, string $file, string $filename, ?array $mimes, $real_mime ): array {
		unset( $file, $real_mime );
		$mimes = $mimes ?? get_allowed_mime_types();

		if ( 'svg' !== strtolower( (string) pathinfo( $filename, PATHINFO_EXTENSION ) ) || ! isset( $mimes['svg'] ) ) {
			return $data;
		}

		$data['ext']             = 'svg';
		$data['type']            = self::MIME;
		$data['proper_filename'] = false;
		return $data;
	}

	/**
	 * @param array<string, mixed> $file
	 * @return array<string, mixed>
	 */
	public static function sanitize_upload( array $file ): array {
		$filename = (string) ( $file['name'] ?? '' );
		if ( 'svg' !== strtolower( (string) pathinfo( $filename, PATHINFO_EXTENSION ) ) || ! empty( $file['error'] ) ) {
			return $file;
		}

		$path = (string) ( $file['tmp_name'] ?? '' );
		if ( '' === $path || ! is_readable( $path ) ) {
			$file['error'] = __( 'The SVG upload could not be read.', 'kpf-core' );
			return $file;
		}

		$source = file_get_contents( $path );
		if ( false === $source ) {
			$file['error'] = __( 'The SVG upload could not be read.', 'kpf-core' );
			return $file;
		}

		$sanitized = self::sanitize( $source );
		if ( is_wp_error( $sanitized ) ) {
			$file['error'] = $sanitized->get_error_message();
			return $file;
		}

		if ( false === file_put_contents( $path, $sanitized, LOCK_EX ) ) {
			$file['error'] = __( 'The sanitized SVG could not be saved.', 'kpf-core' );
		}

		return $file;
	}

	/**
	 * @return string|WP_Error
	 */
	public static function sanitize( string $source ) {
		$source = trim( str_replace( "\0", '', $source ) );
		if ( '' === $source || strlen( $source ) > self::MAX_BYTES ) {
			return new WP_Error( 'kpf_svg_size', __( 'SVG files must be non-empty and 5 MB or smaller.', 'kpf-core' ) );
		}
		if ( preg_match( '/<!DOCTYPE|<!ENTITY/i', $source ) ) {
			return new WP_Error( 'kpf_svg_doctype', __( 'SVG files cannot contain document type or entity declarations.', 'kpf-core' ) );
		}

		$previous = libxml_use_internal_errors( true );
		$document = new DOMDocument();
		$loaded   = $document->loadXML( $source, LIBXML_NONET | LIBXML_COMPACT );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );

		if (
			! $loaded
			|| ! $document->documentElement
			|| 'svg' !== strtolower( $document->documentElement->localName )
			|| (
				null !== $document->documentElement->namespaceURI
				&& '' !== $document->documentElement->namespaceURI
				&& 'http://www.w3.org/2000/svg' !== $document->documentElement->namespaceURI
			)
		) {
			return new WP_Error( 'kpf_svg_invalid', __( 'The file is not valid SVG markup.', 'kpf-core' ) );
		}

		self::sanitize_node( $document->documentElement );
		$output = $document->saveXML( $document->documentElement );
		if ( false === $output || '' === trim( $output ) ) {
			return new WP_Error( 'kpf_svg_invalid', __( 'The SVG file could not be sanitized.', 'kpf-core' ) );
		}

		return $output;
	}

	private static function sanitize_node( DOMNode $node ): void {
		$children = iterator_to_array( $node->childNodes );
		foreach ( $children as $child ) {
			if ( XML_COMMENT_NODE === $child->nodeType || XML_PI_NODE === $child->nodeType ) {
				$node->removeChild( $child );
				continue;
			}
			if ( XML_ELEMENT_NODE !== $child->nodeType ) {
				continue;
			}
			if (
				! $child instanceof DOMElement
				|| ! in_array( strtolower( $child->localName ), self::TAGS, true )
				|| (
					null !== $child->namespaceURI
					&& '' !== $child->namespaceURI
					&& 'http://www.w3.org/2000/svg' !== $child->namespaceURI
				)
			) {
				$node->removeChild( $child );
				continue;
			}
			self::sanitize_element( $child );
			self::sanitize_node( $child );
		}

		if ( $node instanceof DOMElement ) {
			self::sanitize_element( $node );
		}
	}

	private static function sanitize_element( DOMElement $element ): void {
		$remove = array();
		foreach ( $element->attributes as $attribute ) {
			$name  = strtolower( $attribute->nodeName );
			$value = trim( $attribute->nodeValue );

			if (
				str_starts_with( $name, 'on' )
				|| 'style' === $name
				|| ! in_array( $name, self::ATTRIBUTES, true )
				|| self::has_unsafe_url( $name, $value )
			) {
				$remove[] = $attribute->nodeName;
			}
		}

		foreach ( $remove as $name ) {
			$element->removeAttribute( $name );
		}
	}

	private static function has_unsafe_url( string $name, string $value ): bool {
		if ( 'xmlns' === $name ) {
			return 'http://www.w3.org/2000/svg' !== $value;
		}
		if ( 'xmlns:xlink' === $name ) {
			return 'http://www.w3.org/1999/xlink' !== $value;
		}
		if ( in_array( $name, array( 'href', 'xlink:href' ), true ) ) {
			return ! preg_match( '/^#[A-Za-z_][A-Za-z0-9_.:-]*$/', $value );
		}
		if ( preg_match( '/(?:javascript|data|vbscript|file|https?):/i', $value ) ) {
			return true;
		}
		if ( false !== stripos( $value, 'url(' ) ) {
			return ! preg_match( '/^\s*url\(\s*["\']?#[A-Za-z_][A-Za-z0-9_.:-]*["\']?\s*\)\s*$/i', $value );
		}
		return false;
	}

	/**
	 * @param array<string, mixed> $metadata
	 * @return array<string, mixed>
	 */
	public static function attachment_metadata( array $metadata, int $attachment_id, string $context ): array {
		unset( $context );
		if ( self::MIME !== get_post_mime_type( $attachment_id ) ) {
			return $metadata;
		}

		$path = get_attached_file( $attachment_id );
		if ( ! is_string( $path ) || ! is_readable( $path ) ) {
			return $metadata;
		}

		$dimensions = self::dimensions( $path );
		if ( $dimensions ) {
			$metadata['width']  = $dimensions['width'];
			$metadata['height'] = $dimensions['height'];
		}
		if ( empty( $metadata['file'] ) ) {
			$metadata['file'] = _wp_relative_upload_path( $path );
		}
		return $metadata;
	}

	/**
	 * @return array{width: int, height: int}|null
	 */
	private static function dimensions( string $path ): ?array {
		$document = new DOMDocument();
		$previous = libxml_use_internal_errors( true );
		$loaded   = $document->load( $path, LIBXML_NONET | LIBXML_COMPACT );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );
		if ( ! $loaded || ! $document->documentElement ) {
			return null;
		}

		$root   = $document->documentElement;
		$width  = (float) $root->getAttribute( 'width' );
		$height = (float) $root->getAttribute( 'height' );
		if ( $width <= 0 || $height <= 0 ) {
			$viewbox = preg_split( '/[\s,]+/', trim( $root->getAttribute( 'viewBox' ) ) );
			if ( is_array( $viewbox ) && 4 === count( $viewbox ) ) {
				$width  = (float) $viewbox[2];
				$height = (float) $viewbox[3];
			}
		}

		return $width > 0 && $height > 0
			? array( 'width' => (int) round( $width ), 'height' => (int) round( $height ) )
			: null;
	}
}

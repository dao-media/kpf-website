<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

final class Meta {
	public const DESIGN_META      = '_kpf_design';
	public const PAGE_DESIGN_META = '_kpf_page_design_id';
	public const PAGE_FIELDS_META = '_kpf_design_fields';
	public const VERSION          = 1;
	public const MAX_SOURCE_BYTES = 1048576;
	public const MAX_FIELDS       = 50;
	public const HISTORY_OPTION   = 'kpf_design_history_limit';
	public const HISTORY_DEFAULT  = 20;
	public const HISTORY_MIN      = 2;
	public const HISTORY_MAX      = 100;

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
		add_filter(
			'rest_pre_insert_' . ContentType::POST_TYPE,
			array( self::class, 'validate_rest_request' ),
			10,
			2
		);
		add_filter( 'wp_revisions_to_keep', array( self::class, 'revisions_to_keep' ), 10, 2 );
	}

	public static function register_meta(): void {
		register_post_meta(
			ContentType::POST_TYPE,
			self::DESIGN_META,
			array(
				'type'              => 'object',
				'single'            => true,
				'default'           => self::design_defaults(),
				'show_in_rest'      => array( 'schema' => self::design_schema() ),
				'sanitize_callback' => array( self::class, 'sanitize_design' ),
				'auth_callback'     => static fn(): bool => current_user_can( 'manage_options' ),
				'revisions_enabled' => true,
			)
		);

		register_post_meta(
			'page',
			self::PAGE_DESIGN_META,
			array(
				'type'              => 'integer',
				'single'            => true,
				'default'           => 0,
				'show_in_rest'      => true,
				'sanitize_callback' => array( self::class, 'sanitize_page_design_id' ),
				'auth_callback'     => static function ( bool $allowed, string $key, int $post_id ): bool {
					unset( $allowed, $key );
					return current_user_can( 'edit_post', $post_id );
				},
				'revisions_enabled' => true,
			)
		);

		register_post_meta(
			'page',
			self::PAGE_FIELDS_META,
			array(
				'type'              => 'array',
				'single'            => true,
				'default'           => array(),
				'show_in_rest'      => array( 'schema' => self::fields_schema() ),
				'sanitize_callback' => array( self::class, 'sanitize_fields' ),
				'auth_callback'     => static function ( bool $allowed, string $key, int $post_id ): bool {
					unset( $allowed, $key );
					return current_user_can( 'edit_post', $post_id );
				},
				'revisions_enabled' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function design_defaults(): array {
		return array(
			'version'       => self::VERSION,
			'html_filename' => '',
			'html'          => '',
			'css_filename'  => '',
			'css'           => '',
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function design_schema(): array {
		return array(
			'type'                 => 'object',
			'additionalProperties' => false,
			'properties'           => array(
				'version'       => array( 'type' => 'integer', 'default' => self::VERSION ),
				'html_filename' => array( 'type' => 'string', 'default' => '' ),
				'html'          => array( 'type' => 'string', 'default' => '' ),
				'css_filename'  => array( 'type' => 'string', 'default' => '' ),
				'css'           => array( 'type' => 'string', 'default' => '' ),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function fields_schema(): array {
		return array(
			'type'     => 'array',
			'default'  => array(),
			'maxItems' => self::MAX_FIELDS,
			'items'    => array(
				'type'                 => 'object',
				'additionalProperties' => false,
				'required'             => array( 'key', 'value' ),
				'properties'           => array(
					'key'   => array( 'type' => 'string' ),
					'value' => array( 'type' => 'string' ),
				),
			),
		);
	}

	/**
	 * @param mixed $value Raw metadata.
	 * @return array<string, mixed>
	 */
	public static function sanitize_design( $value ): array {
		$value = is_array( $value ) ? $value : array();

		return array(
			'version'       => self::VERSION,
			'html_filename' => self::sanitize_filename( $value['html_filename'] ?? '', array( 'html', 'htm' ) ),
			'html'          => self::sanitize_html( self::limit_source( $value['html'] ?? '' ) ),
			'css_filename'  => self::sanitize_filename( $value['css_filename'] ?? '', array( 'css' ) ),
			'css'           => self::sanitize_css( self::limit_source( $value['css'] ?? '' ) ),
		);
	}

	/**
	 * @param mixed $value Raw page design ID.
	 */
	public static function sanitize_page_design_id( $value ): int {
		$design_id = absint( $value );
		if ( 0 === $design_id ) {
			return 0;
		}

		return ContentType::POST_TYPE === get_post_type( $design_id ) ? $design_id : 0;
	}

	/**
	 * @param mixed $value Raw custom fields.
	 * @return array<int, array{key: string, value: string}>
	 */
	public static function sanitize_fields( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$clean = array();
		$seen  = array();
		foreach ( array_slice( $value, 0, self::MAX_FIELDS ) as $field ) {
			if ( ! is_array( $field ) ) {
				continue;
			}

			$key = strtolower( trim( (string) ( $field['key'] ?? '' ) ) );
			$key = preg_replace( '/[^a-z0-9_-]/', '_', $key ) ?: '';
			$key = trim( $key, '_-' );
			if ( '' === $key || isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;
			$clean[]      = array(
				'key'   => substr( $key, 0, 80 ),
				'value' => sanitize_textarea_field( (string) ( $field['value'] ?? '' ) ),
			);
		}

		return $clean;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get_design( int $post_id ): array {
		$value = get_post_meta( $post_id, self::DESIGN_META, true );
		return array_merge( self::design_defaults(), self::sanitize_design( is_array( $value ) ? $value : array() ) );
	}

	/**
	 * @return array<int, array{key: string, value: string}>
	 */
	public static function get_page_fields( int $post_id ): array {
		return self::sanitize_fields( get_post_meta( $post_id, self::PAGE_FIELDS_META, true ) );
	}

	public static function page_has_design( int $page_id ): bool {
		$design_id = (int) get_post_meta( $page_id, self::PAGE_DESIGN_META, true );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return false;
		}

		$design = self::get_design( $design_id );
		return '' !== trim( (string) $design['html'] );
	}

	public static function history_limit(): int {
		$limit = absint( get_option( self::HISTORY_OPTION, self::HISTORY_DEFAULT ) );
		return max( self::HISTORY_MIN, min( self::HISTORY_MAX, $limit ) );
	}

	public static function set_history_limit( $value ): int {
		$limit = max( self::HISTORY_MIN, min( self::HISTORY_MAX, absint( $value ) ) );
		update_option( self::HISTORY_OPTION, $limit, false );
		return $limit;
	}

	public static function revisions_to_keep( int $number, \WP_Post $post ): int {
		return ContentType::POST_TYPE === $post->post_type ? self::history_limit() : $number;
	}

	/**
	 * Create or return the design record assigned to a page.
	 */
	public static function ensure_page_design( int $page_id ): int {
		$existing = (int) get_post_meta( $page_id, self::PAGE_DESIGN_META, true );
		if ( $existing > 0 && ContentType::POST_TYPE === get_post_type( $existing ) ) {
			return $existing;
		}

		$title = get_the_title( $page_id );
		$design_id = wp_insert_post(
			array(
				'post_type'   => ContentType::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => $title
					? sprintf( __( 'Design for %s', 'kpf-core' ), $title )
					: __( 'Page design', 'kpf-core' ),
			),
			true
		);

		if ( is_wp_error( $design_id ) || ! $design_id ) {
			return 0;
		}

		update_post_meta( (int) $design_id, self::DESIGN_META, self::design_defaults() );
		update_post_meta( $page_id, self::PAGE_DESIGN_META, (int) $design_id );

		return (int) $design_id;
	}

	/**
	 * @param mixed            $prepared_post Prepared post.
	 * @param \WP_REST_Request $request REST request.
	 * @return mixed
	 */
	public static function validate_rest_request( $prepared_post, \WP_REST_Request $request ) {
		$incoming = $request->get_param( 'meta' );
		$post_id  = isset( $prepared_post->ID ) ? (int) $prepared_post->ID : 0;
		$raw      = is_array( $incoming ) && isset( $incoming[ self::DESIGN_META ] )
			? $incoming[ self::DESIGN_META ]
			: ( $post_id > 0 ? self::get_design( $post_id ) : self::design_defaults() );
		$clean    = self::sanitize_design( is_array( $raw ) ? $raw : array() );

		if ( 'publish' === $request->get_param( 'status' ) && '' === trim( $clean['html'] ) ) {
			return new \WP_Error(
				'kpf_design_html_required',
				__( 'Add an HTML template before publishing this design.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		return $prepared_post;
	}

	private static function limit_source( $value ): string {
		return substr( str_replace( "\0", '', (string) $value ), 0, self::MAX_SOURCE_BYTES );
	}

	/**
	 * @param array<int, string> $extensions Allowed extensions.
	 */
	private static function sanitize_filename( $value, array $extensions ): string {
		$filename  = sanitize_file_name( (string) $value );
		$extension = strtolower( (string) pathinfo( $filename, PATHINFO_EXTENSION ) );
		return in_array( $extension, $extensions, true ) ? $filename : '';
	}

	private static function sanitize_html( string $html ): string {
		$allowed = wp_kses_allowed_html( 'post' );
		foreach ( array( 'header', 'footer', 'main', 'section', 'article', 'aside', 'nav', 'picture', 'source', 'video' ) as $tag ) {
			$allowed[ $tag ] = array(
				'id'         => true,
				'class'      => true,
				'role'       => true,
				'aria-label' => true,
				'style'      => true,
				'src'        => true,
				'srcset'     => true,
				'sizes'      => true,
				'type'       => true,
				'media'      => true,
				'alt'        => true,
				'width'      => true,
				'height'     => true,
				'controls'   => true,
				'autoplay'   => true,
				'loop'       => true,
				'muted'      => true,
				'poster'     => true,
			);
		}

		$svg_attributes = array(
			'id'                  => true,
			'class'               => true,
			'role'                => true,
			'aria-label'          => true,
			'aria-labelledby'     => true,
			'aria-hidden'         => true,
			'style'               => true,
			'xmlns'               => true,
			'viewbox'             => true,
			'preserveaspectratio' => true,
			'width'               => true,
			'height'              => true,
			'x'                   => true,
			'y'                   => true,
			'x1'                  => true,
			'y1'                  => true,
			'x2'                  => true,
			'y2'                  => true,
			'cx'                  => true,
			'cy'                  => true,
			'r'                   => true,
			'rx'                  => true,
			'ry'                  => true,
			'd'                   => true,
			'points'              => true,
			'pathlength'          => true,
			'fill'                => true,
			'fill-rule'           => true,
			'clip-rule'           => true,
			'stroke'              => true,
			'stroke-width'        => true,
			'stroke-linecap'      => true,
			'stroke-linejoin'     => true,
			'stroke-dasharray'    => true,
			'stroke-dashoffset'   => true,
			'opacity'             => true,
			'transform'           => true,
			'transform-origin'    => true,
			'gradientunits'       => true,
			'gradienttransform'   => true,
			'offset'              => true,
			'stop-color'          => true,
			'stop-opacity'        => true,
			'clip-path'           => true,
			'mask'                => true,
			'patternunits'        => true,
			'patterncontentunits' => true,
			'href'                => true,
			'xlink:href'          => true,
			'text-anchor'         => true,
			'font-family'         => true,
			'font-size'           => true,
			'font-weight'         => true,
			'letter-spacing'      => true,
			'dominant-baseline'   => true,
		);
		foreach (
			array(
				'svg',
				'g',
				'path',
				'circle',
				'ellipse',
				'rect',
				'line',
				'polyline',
				'polygon',
				'defs',
				'lineargradient',
				'radialgradient',
				'stop',
				'clippath',
				'mask',
				'pattern',
				'symbol',
				'use',
				'title',
				'desc',
				'text',
				'tspan',
			) as $tag
		) {
			$allowed[ $tag ] = $svg_attributes;
		}

		return wp_kses( $html, $allowed, array( 'http', 'https', 'mailto', 'tel' ) );
	}

	private static function sanitize_css( string $css ): string {
		$css = wp_strip_all_tags( $css );
		$css = preg_replace( '/@import\s+[^;]+;?/i', '', $css ) ?: '';
		$css = preg_replace( '/(?:expression|javascript|behavior|-moz-binding)\s*[:(][^;}]*[;}]?/i', '', $css ) ?: '';
		return trim( $css );
	}
}

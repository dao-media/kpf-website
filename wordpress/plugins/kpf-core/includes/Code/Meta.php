<?php

declare(strict_types=1);

namespace KPF\Core\Code;

final class Meta {
	public const META_KEY  = '_kpf_code';
	public const VERSION   = 1;
	public const MAX_BYTES = 102400;

	public const LOCATIONS = array( 'header', 'footer' );
	public const TYPES     = array( 'html', 'css', 'js' );
	public const SCOPES    = array( 'global', 'urls' );

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
	}

	public static function register_meta(): void {
		register_post_meta(
			ContentType::POST_TYPE,
			self::META_KEY,
			array(
				'type'              => 'object',
				'single'            => true,
				'default'           => self::defaults(),
				'sanitize_callback' => array( self::class, 'sanitize' ),
				'auth_callback'     => static function (): bool {
					return current_user_can( 'edit_theme_options' );
				},
				'show_in_rest'      => false,
				'revisions_enabled' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'  => self::VERSION,
			'location' => 'header',
			'type'     => 'html',
			'code'     => '',
			'scope'    => 'global',
			'urls'     => array(),
		);
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$value = is_array( $value ) ? $value : array();

		$location = sanitize_key( (string) ( $value['location'] ?? 'header' ) );
		if ( ! in_array( $location, self::LOCATIONS, true ) ) {
			$location = 'header';
		}

		$type = sanitize_key( (string) ( $value['type'] ?? 'html' ) );
		if ( ! in_array( $type, self::TYPES, true ) ) {
			$type = 'html';
		}

		$scope = sanitize_key( (string) ( $value['scope'] ?? 'global' ) );
		if ( ! in_array( $scope, self::SCOPES, true ) ) {
			$scope = 'global';
		}

		$code = (string) ( $value['code'] ?? '' );
		$code = str_replace( "\0", '', $code );
		if ( strlen( $code ) > self::MAX_BYTES ) {
			$code = substr( $code, 0, self::MAX_BYTES );
		}

		$urls = array();
		foreach ( (array) ( $value['urls'] ?? array() ) as $url ) {
			$url = trim( (string) $url );
			$url = str_replace( "\0", '', $url );
			if ( '' === $url ) {
				continue;
			}
			// Allow path patterns like /about, /blog/*, https://example.com/path.
			$url = sanitize_text_field( $url );
			if ( '' !== $url ) {
				$urls[] = $url;
			}
		}
		$urls = array_values( array_unique( $urls ) );

		return array(
			'version'  => self::VERSION,
			'location' => $location,
			'type'     => $type,
			'code'     => $code,
			'scope'    => $scope,
			'urls'     => $urls,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get( int $post_id ): array {
		$value = get_post_meta( $post_id, self::META_KEY, true );
		return array_merge( self::defaults(), self::sanitize( is_array( $value ) ? $value : array() ) );
	}

	/**
	 * @param array<string, mixed> $value
	 */
	public static function update( int $post_id, array $value ): array {
		$clean = self::sanitize( $value );
		update_post_meta( $post_id, self::META_KEY, $clean );
		return $clean;
	}
}

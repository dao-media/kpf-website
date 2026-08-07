<?php

declare(strict_types=1);

namespace KPF\Core\Grantees;

final class Meta {
	public const META_KEY = '_kpf_grantee';
	public const VERSION  = 2;

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
				'show_in_rest'      => array( 'schema' => self::rest_schema() ),
				'sanitize_callback' => array( self::class, 'sanitize' ),
				'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
					unset( $allowed, $meta_key );
					return current_user_can( 'edit_post', $post_id );
				},
				'revisions_enabled' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'      => self::VERSION,
			'contact_name' => '',
			'website'      => '',
			'blurb'        => '',
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function rest_schema(): array {
		return array(
			'type'                 => 'object',
			'additionalProperties' => false,
			'properties'           => array(
				'version'      => array(
					'type'    => 'integer',
					'default' => self::VERSION,
				),
				'contact_name' => array(
					'type'    => 'string',
					'default' => '',
				),
				'website'      => array(
					'type'    => 'string',
					'default' => '',
					'format'  => 'uri',
				),
				'blurb'        => array(
					'type'    => 'string',
					'default' => '',
				),
			),
		);
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$input = is_array( $value ) ? $value : array();

		return array(
			'version'      => self::VERSION,
			'contact_name' => sanitize_text_field( (string) ( $input['contact_name'] ?? '' ) ),
			'website'      => self::sanitize_website( (string) ( $input['website'] ?? '' ) ),
			'blurb'        => sanitize_textarea_field( (string) ( $input['blurb'] ?? '' ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get( int $post_id ): array {
		$stored = get_post_meta( $post_id, self::META_KEY, true );
		return self::sanitize( is_array( $stored ) ? $stored : array() );
	}

	private static function sanitize_website( string $url ): string {
		$url = trim( $url );
		if ( '' === $url ) {
			return '';
		}
		if ( ! preg_match( '#^https?://#i', $url ) ) {
			$url = 'https://' . $url;
		}
		$clean = esc_url_raw( $url );
		return is_string( $clean ) ? $clean : '';
	}
}

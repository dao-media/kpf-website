<?php

declare(strict_types=1);

namespace KPF\Core\Grants;

use KPF\Core\Grantees\ContentType as GranteeContentType;

final class Meta {
	public const META_KEY              = '_kpf_grant';
	public const SORT_DATE_KEY         = '_kpf_grant_sort_date';
	public const SORT_AMOUNT_KEY       = '_kpf_grant_sort_amount';
	public const SORT_RECIPIENT_KEY    = '_kpf_grant_sort_recipient';
	public const VERSION               = 1;

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

		foreach (
			array(
				self::SORT_DATE_KEY      => 'integer',
				self::SORT_AMOUNT_KEY    => 'number',
				self::SORT_RECIPIENT_KEY => 'string',
			) as $key => $type
		) {
			register_post_meta(
				ContentType::POST_TYPE,
				$key,
				array(
					'type'          => $type,
					'single'        => true,
					'show_in_rest'  => false,
					'auth_callback' => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
						unset( $allowed, $meta_key );
						return current_user_can( 'edit_post', $post_id );
					},
				)
			);
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'        => self::VERSION,
			'grantee_id'     => 0,
			'recipient_name' => '',
			'grant_amount'   => 0.0,
			'check_photo_id' => 0,
			'awarded_month'  => 0,
			'awarded_year'   => 0,
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
				'version'        => array(
					'type'    => 'integer',
					'default' => self::VERSION,
				),
				'grantee_id'     => array(
					'type'    => 'integer',
					'minimum' => 0,
					'default' => 0,
				),
				'recipient_name' => array(
					'type'    => 'string',
					'default' => '',
				),
				'grant_amount'   => array(
					'type'    => 'number',
					'minimum' => 0,
					'default' => 0,
				),
				'check_photo_id' => array(
					'type'    => 'integer',
					'minimum' => 0,
					'default' => 0,
				),
				'awarded_month'  => array(
					'type'    => 'integer',
					'minimum' => 0,
					'maximum' => 12,
					'default' => 0,
				),
				'awarded_year'   => array(
					'type'    => 'integer',
					'minimum' => 0,
					'maximum' => 9999,
					'default' => 0,
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

		$grantee_id = self::sanitize_grantee_id( $input['grantee_id'] ?? 0 );
		$recipient  = sanitize_text_field( (string) ( $input['recipient_name'] ?? '' ) );
		$recipient  = html_entity_decode( $recipient, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		if ( '' === $recipient && $grantee_id > 0 ) {
			$post = get_post( $grantee_id );
			$recipient = $post instanceof \WP_Post
				? html_entity_decode( $post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8' )
				: '';
		}

		$amount   = self::sanitize_grant_amount( $input['grant_amount'] ?? 0 );
		$check_id = self::sanitize_attachment_id( $input['check_photo_id'] ?? 0 );
		$month    = absint( $input['awarded_month'] ?? 0 );
		$year     = absint( $input['awarded_year'] ?? 0 );

		if ( $month < 1 || $month > 12 ) {
			$month = 0;
		}
		if ( $year < 1900 || $year > 2100 ) {
			$year = 0;
		}

		return array(
			'version'        => self::VERSION,
			'grantee_id'     => $grantee_id,
			'recipient_name' => $recipient,
			'grant_amount'   => $amount,
			'check_photo_id' => $check_id,
			'awarded_month'  => $month,
			'awarded_year'   => $year,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get( int $post_id ): array {
		$stored = get_post_meta( $post_id, self::META_KEY, true );
		return self::sanitize( is_array( $stored ) ? $stored : array() );
	}

	/**
	 * Persist grant bag + flat sort keys used by the list table.
	 *
	 * @param array<string, mixed> $meta
	 */
	public static function save( int $post_id, array $meta ): void {
		$clean = self::sanitize( $meta );
		update_post_meta( $post_id, self::META_KEY, $clean );
		self::sync_sort_keys( $post_id, $clean );
	}

	/**
	 * @param array<string, mixed> $meta
	 */
	public static function sync_sort_keys( int $post_id, array $meta ): void {
		$year  = (int) ( $meta['awarded_year'] ?? 0 );
		$month = (int) ( $meta['awarded_month'] ?? 0 );
		$sort  = 0;
		if ( $year > 0 ) {
			$sort = ( $year * 100 ) + ( $month >= 1 && $month <= 12 ? $month : 0 );
		}

		update_post_meta( $post_id, self::SORT_DATE_KEY, $sort );
		update_post_meta( $post_id, self::SORT_AMOUNT_KEY, (float) ( $meta['grant_amount'] ?? 0 ) );
		update_post_meta(
			$post_id,
			self::SORT_RECIPIENT_KEY,
			strtolower( (string) ( $meta['recipient_name'] ?? '' ) )
		);
	}

	/**
	 * Auto title: Recipient · Mon YYYY · $amount (omit empty parts).
	 *
	 * @param array<string, mixed> $meta
	 */
	public static function compose_title( array $meta ): string {
		$parts = array();
		$name  = trim( (string) ( $meta['recipient_name'] ?? '' ) );
		if ( '' !== $name ) {
			$parts[] = $name;
		}
		$date = self::format_awarded( $meta );
		if ( '' !== $date ) {
			$parts[] = $date;
		}
		$amount = self::format_grant_amount( $meta );
		if ( '' !== $amount ) {
			$parts[] = $amount;
		}
		if ( empty( $parts ) ) {
			return __( 'Untitled grant', 'kpf-core' );
		}
		return implode( ' · ', $parts );
	}

	/**
	 * @param array<string, mixed> $meta
	 */
	public static function format_awarded( array $meta ): string {
		$month = (int) ( $meta['awarded_month'] ?? 0 );
		$year  = (int) ( $meta['awarded_year'] ?? 0 );
		if ( $year < 1 ) {
			return '';
		}
		if ( $month >= 1 && $month <= 12 ) {
			$label = gmdate( 'M', mktime( 0, 0, 0, $month, 1, 2000 ) );
			return sprintf( '%s %d', $label, $year );
		}
		return (string) $year;
	}

	/**
	 * @param array<string, mixed> $meta
	 */
	public static function format_grant_amount( array $meta ): string {
		$amount = (float) ( $meta['grant_amount'] ?? 0 );
		if ( $amount <= 0 ) {
			return '';
		}
		$decimals = abs( $amount - round( $amount ) ) < 0.00001 ? 0 : 2;
		return '$' . number_format_i18n( $amount, $decimals );
	}

	/**
	 * @param mixed $value
	 */
	private static function sanitize_grantee_id( $value ): int {
		$id = absint( $value );
		if ( $id < 1 ) {
			return 0;
		}
		if ( GranteeContentType::POST_TYPE !== get_post_type( $id ) ) {
			return 0;
		}
		$status = get_post_status( $id );
		if ( ! in_array( $status, array( 'publish', 'draft', 'private', 'pending' ), true ) ) {
			return 0;
		}
		return $id;
	}

	/**
	 * @param mixed $value
	 */
	private static function sanitize_grant_amount( $value ): float {
		if ( is_string( $value ) ) {
			$value = trim( str_replace( array( '$', ',' ), '', $value ) );
			if ( '' === $value ) {
				return 0.0;
			}
		}
		if ( ! is_numeric( $value ) ) {
			return 0.0;
		}
		$amount = round( (float) $value, 2 );
		return $amount > 0 ? $amount : 0.0;
	}

	/**
	 * @param mixed $value
	 */
	private static function sanitize_attachment_id( $value ): int {
		$id = absint( $value );
		if ( $id < 1 ) {
			return 0;
		}
		if ( 'attachment' !== get_post_type( $id ) || ! wp_attachment_is_image( $id ) ) {
			return 0;
		}
		return $id;
	}
}

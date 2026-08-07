<?php

declare(strict_types=1);

namespace KPF\Core\Events;

final class Rest {
	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'register_fields' ) );
	}

	public static function register_fields(): void {
		register_rest_field(
			ContentType::POST_TYPE,
			'eventDetails',
			array(
				'get_callback' => static function ( array $object ): array {
					return GraphQL::details( (int) ( $object['id'] ?? 0 ) );
				},
				'schema'       => array(
					'description' => __( 'Resolved event card details.', 'kpf-core' ),
					'type'        => 'object',
					'readonly'    => true,
					'context'     => array( 'view', 'edit', 'embed' ),
				),
			)
		);

		register_rest_field(
			ContentType::HOST_TAXONOMY,
			'logo',
			array(
				'get_callback'    => static function ( array $term ): array {
					$logo_id = (int) get_term_meta( (int) ( $term['id'] ?? 0 ), ContentType::HOST_LOGO_META, true );
					return array(
						'id'  => $logo_id,
						'url' => $logo_id > 0 ? (string) wp_get_attachment_image_url( $logo_id, 'medium' ) : '',
					);
				},
				'update_callback' => static function ( $value, \WP_Term $term ): void {
					$logo_id = is_array( $value ) ? absint( $value['id'] ?? 0 ) : absint( $value );
					if ( $logo_id > 0 ) {
						update_term_meta( $term->term_id, ContentType::HOST_LOGO_META, $logo_id );
					} else {
						delete_term_meta( $term->term_id, ContentType::HOST_LOGO_META );
					}
				},
				'schema'          => array(
					'description' => __( 'Host logo attachment.', 'kpf-core' ),
					'type'        => 'object',
					'context'     => array( 'view', 'edit' ),
					'properties'  => array(
						'id'  => array( 'type' => 'integer' ),
						'url' => array( 'type' => 'string' ),
					),
				),
			)
		);
	}
}

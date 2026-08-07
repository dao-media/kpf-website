<?php

declare(strict_types=1);

namespace KPF\Core\Grants;

final class Rest {
	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'register_fields' ) );
	}

	public static function register_fields(): void {
		register_rest_field(
			ContentType::POST_TYPE,
			'grantDetails',
			array(
				'get_callback' => static function ( array $object ): array {
					return GraphQL::details( (int) ( $object['id'] ?? 0 ) );
				},
				'schema'       => array(
					'description' => __( 'Resolved grant details for headless consumers.', 'kpf-core' ),
					'type'        => 'object',
					'readonly'    => true,
					'context'     => array( 'view', 'edit', 'embed' ),
					'properties'  => array(
						'granteeId'        => array( 'type' => 'integer' ),
						'recipientName'    => array( 'type' => 'string' ),
						'grantAmount'      => array( 'type' => 'number' ),
						'grantAmountLabel' => array( 'type' => 'string' ),
						'awardedMonth'     => array( 'type' => 'integer' ),
						'awardedYear'      => array( 'type' => 'integer' ),
						'awardedLabel'     => array( 'type' => 'string' ),
						'checkPhotoUrl'    => array( 'type' => array( 'string', 'null' ) ),
					),
				),
			)
		);
	}
}

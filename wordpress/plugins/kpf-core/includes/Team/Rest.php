<?php

declare(strict_types=1);

namespace KPF\Core\Team;

final class Rest {
	public static function register(): void {
		add_action('rest_api_init', array( self::class, 'register_fields' ));
	}

	public static function register_fields(): void {
		register_rest_field(
			ContentType::POST_TYPE,
			'teamDetails',
			array(
				'get_callback' => static function (array $object): array {
					return GraphQL::details((int) ($object['id'] ?? 0));
				},
				'schema'       => array(
					'description' => __('Resolved team member profile details.', 'kpf-core'),
					'type'        => 'object',
					'readonly'    => true,
					'context'     => array( 'view', 'edit', 'embed' ),
				),
			)
		);
	}
}

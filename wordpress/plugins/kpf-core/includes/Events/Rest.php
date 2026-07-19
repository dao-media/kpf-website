<?php

declare(strict_types=1);

namespace KPF\Core\Events;

use WP_REST_Request;

final class Rest {
	public static function register(): void {
		add_action('rest_api_init', array( self::class, 'register_fields' ));
		add_filter(
			'rest_' . ContentType::POST_TYPE . '_collection_params',
			array( self::class, 'collection_params' )
		);
		add_filter(
			'rest_' . ContentType::POST_TYPE . '_query',
			array( self::class, 'collection_query' ),
			10,
			2
		);
	}

	public static function register_fields(): void {
		register_rest_field(
			ContentType::POST_TYPE,
			'eventDetails',
			array(
				'get_callback' => static function (array $object): array {
					return GraphQL::details((int) ($object['id'] ?? 0));
				},
				'schema'       => array(
					'description' => __('Resolved event scheduling and host details.', 'kpf-core'),
					'type'        => 'object',
					'readonly'    => true,
					'context'     => array( 'view', 'edit', 'embed' ),
				),
			)
		);

		register_rest_field(
			ContentType::PARTNER_TAXONOMY,
			'logo',
			array(
				'get_callback'    => static function (array $term): array {
					$logo_id = (int) get_term_meta((int) ($term['id'] ?? 0), ContentType::PARTNER_LOGO_META, true);
					return array(
						'id'  => $logo_id,
						'url' => $logo_id > 0 ? (string) wp_get_attachment_image_url($logo_id, 'medium') : '',
					);
				},
				'update_callback' => static function ($value, \WP_Term $term): void {
					$logo_id = is_array($value) ? absint($value['id'] ?? 0) : absint($value);
					if ($logo_id > 0) {
						update_term_meta($term->term_id, ContentType::PARTNER_LOGO_META, $logo_id);
					} else {
						delete_term_meta($term->term_id, ContentType::PARTNER_LOGO_META);
					}
				},
				'schema'          => array(
					'description' => __('Partner logo attachment.', 'kpf-core'),
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

	/**
	 * @param array<string, mixed> $params
	 * @return array<string, mixed>
	 */
	public static function collection_params(array $params): array {
		$params['kpf_event_view'] = array(
			'description'       => __('Filter events: upcoming, past, or recurring.', 'kpf-core'),
			'type'              => 'string',
			'enum'              => array( 'upcoming', 'past', 'recurring' ),
			'sanitize_callback' => 'sanitize_key',
		);
		return $params;
	}

	/**
	 * @param array<string, mixed> $args
	 * @return array<string, mixed>
	 */
	public static function collection_query(array $args, WP_REST_Request $request): array {
		$view = (string) $request->get_param('kpf_event_view');
		if (! in_array($view, array( 'upcoming', 'past', 'recurring' ), true)) {
			return $args;
		}

		$today      = gmdate('Y-m-d');
		$meta_query = is_array($args['meta_query'] ?? null) ? $args['meta_query'] : array();

		if ('upcoming' === $view) {
			$meta_query[] = array(
				'key'     => Meta::END_DATE_META,
				'value'   => $today,
				'compare' => '>=',
				'type'    => 'DATE',
			);
		} elseif ('past' === $view) {
			$meta_query[] = array(
				'key'     => Meta::END_DATE_META,
				'value'   => $today,
				'compare' => '<',
				'type'    => 'DATE',
			);
		} else {
			$meta_query[] = array(
				'key'   => Meta::IS_RECURRING_META,
				'value' => '1',
			);
		}

		$args['meta_query'] = $meta_query;
		return $args;
	}
}

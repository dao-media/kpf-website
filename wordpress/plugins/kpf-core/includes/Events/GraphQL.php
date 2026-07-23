<?php

declare(strict_types=1);

namespace KPF\Core\Events;

final class GraphQL {
	public static function register(): void {
		add_action('graphql_register_types', array( self::class, 'register_types' ));
	}

	public static function register_types(): void {
		if (! function_exists('register_graphql_object_type')) {
			return;
		}

		register_graphql_enum_type(
			'KpfEventLocationTypeEnum',
			array(
				'description' => 'Indoor / outdoor setting for an event.',
				'values'      => array(
					'INDOOR'  => array( 'value' => 'indoor' ),
					'OUTDOOR' => array( 'value' => 'outdoor' ),
					'BOTH'    => array( 'value' => 'both' ),
					'TBD'     => array( 'value' => 'tbd' ),
				),
			)
		);

		register_graphql_enum_type(
			'KpfEventFoodDrinksEnum',
			array(
				'description' => 'Whether food and/or drinks are served.',
				'values'      => array(
					'BOTH'   => array( 'value' => 'both' ),
					'FOOD'   => array( 'value' => 'food' ),
					'DRINKS' => array( 'value' => 'drinks' ),
					'NONE'   => array( 'value' => 'none' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventRecurrence',
			array(
				'description' => 'Recurrence rule for a repeating event.',
				'fields'      => array(
					'frequency'   => array( 'type' => 'String' ),
					'interval'    => array( 'type' => 'Int' ),
					'byWeekday'   => array( 'type' => array( 'list_of' => 'String' ) ),
					'byMonthday'  => array( 'type' => array( 'list_of' => 'Int' ) ),
					'byMonth'     => array( 'type' => array( 'list_of' => 'Int' ) ),
					'monthlyMode' => array( 'type' => 'String' ),
					'nthWeekdayN' => array( 'type' => 'Int' ),
					'nthWeekdayDay' => array( 'type' => 'String' ),
					'endMode'     => array( 'type' => 'String' ),
					'until'       => array( 'type' => 'String' ),
					'count'       => array( 'type' => 'Int' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventException',
			array(
				'fields' => array(
					'date'   => array( 'type' => 'String' ),
					'reason' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventReschedule',
			array(
				'fields' => array(
					'originalDate' => array( 'type' => 'String' ),
					'newDate'      => array( 'type' => 'String' ),
					'startTime'    => array( 'type' => 'String' ),
					'endTime'      => array( 'type' => 'String' ),
					'note'         => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventPartnerDetails',
			array(
				'fields' => array(
					'termId'    => array( 'type' => 'Int' ),
					'name'      => array( 'type' => 'String' ),
					'slug'      => array( 'type' => 'String' ),
					'logoId'    => array( 'type' => 'Int' ),
					'logoUrl'   => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventDetails',
			array(
				'description' => 'Scheduling and hosting details for a foundation event.',
				'fields'      => array(
					'startDate'      => array( 'type' => 'String' ),
					'endDate'        => array( 'type' => 'String' ),
					'startTime'      => array( 'type' => 'String' ),
					'endTime'        => array( 'type' => 'String' ),
					'timezone'       => array( 'type' => 'String' ),
					'locationType'   => array( 'type' => 'KpfEventLocationTypeEnum' ),
					'description'    => array( 'type' => 'String' ),
					'details'        => array( 'type' => 'String' ),
					'foodDrinks'     => array( 'type' => 'KpfEventFoodDrinksEnum' ),
					'isRecurring'    => array( 'type' => 'Boolean' ),
					'recurrence'     => array( 'type' => 'KpfEventRecurrence' ),
					'exceptions'     => array( 'type' => array( 'list_of' => 'KpfEventException' ) ),
					'reschedules'    => array( 'type' => array( 'list_of' => 'KpfEventReschedule' ) ),
					'coHostTermIds'  => array( 'type' => array( 'list_of' => 'Int' ) ),
					'coHosts'        => array( 'type' => array( 'list_of' => 'KpfEventPartnerDetails' ) ),
					'occurrenceDate' => array(
						'type'        => 'String',
						'description' => 'YYYYMMDD or YYYY-MM-DD for a recurring occurrence request.',
						'resolve'     => static function (): ?string {
							$raw = get_query_var(ContentType::OCCURRENCE_QUERY);
							return is_string($raw) && '' !== $raw ? $raw : null;
						},
					),
				),
			)
		);

		register_graphql_field(
			'FoundationEvent',
			'eventDetails',
			array(
				'type'        => 'KpfEventDetails',
				'description' => 'Structured event scheduling and host details.',
				'resolve'     => static function ($source): array {
					$id = is_object($source) && isset($source->ID) ? (int) $source->ID : 0;
					return self::details($id);
				},
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function details(int $post_id): array {
		$meta = Meta::get($post_id);
		$rec  = is_array($meta['recurrence'] ?? null) ? $meta['recurrence'] : Meta::default_recurrence();

		$co_hosts = array();
		foreach ($meta['co_host_term_ids'] as $term_id) {
			$term = get_term((int) $term_id, ContentType::PARTNER_TAXONOMY);
			if (! $term || is_wp_error($term)) {
				continue;
			}
			$logo_id = (int) get_term_meta((int) $term_id, ContentType::PARTNER_LOGO_META, true);
			$co_hosts[] = array(
				'termId'  => (int) $term_id,
				'name'    => $term->name,
				'slug'    => $term->slug,
				'logoId'  => $logo_id,
				'logoUrl' => $logo_id > 0 ? (string) wp_get_attachment_image_url($logo_id, 'medium') : '',
			);
		}

		return array(
			'startDate'     => $meta['start_date'],
			'endDate'       => $meta['end_date'],
			'startTime'     => $meta['start_time'],
			'endTime'       => $meta['end_time'],
			'timezone'      => $meta['timezone'],
			'locationType'  => $meta['location_type'],
			'description'   => $meta['description'],
			'details'       => $meta['details'],
			'foodDrinks'    => $meta['food_drinks'],
			'isRecurring'   => (bool) $meta['is_recurring'],
			'recurrence'    => array(
				'frequency'     => $rec['frequency'],
				'interval'      => (int) $rec['interval'],
				'byWeekday'     => $rec['by_weekday'],
				'byMonthday'    => $rec['by_monthday'],
				'byMonth'       => $rec['by_month'],
				'monthlyMode'   => $rec['monthly_mode'],
				'nthWeekdayN'   => (int) ($rec['nth_weekday']['n'] ?? 1),
				'nthWeekdayDay' => (string) ($rec['nth_weekday']['day'] ?? 'MO'),
				'endMode'       => $rec['end_mode'],
				'until'         => $rec['until'],
				'count'         => (int) $rec['count'],
			),
			'exceptions'    => array_map(
				static function (array $row): array {
					return array(
						'date'   => $row['date'],
						'reason' => $row['reason'],
					);
				},
				$meta['exceptions']
			),
			'reschedules'   => array_map(
				static function (array $row): array {
					return array(
						'originalDate' => $row['original_date'],
						'newDate'      => $row['new_date'],
						'startTime'    => $row['start_time'],
						'endTime'      => $row['end_time'],
						'note'         => $row['note'],
					);
				},
				$meta['reschedules']
			),
			'coHostTermIds' => $meta['co_host_term_ids'],
			'coHosts'       => $co_hosts,
		);
	}
}

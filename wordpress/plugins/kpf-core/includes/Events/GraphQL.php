<?php

declare(strict_types=1);

namespace KPF\Core\Events;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_object_type' ) ) {
			return;
		}

		register_graphql_enum_type(
			'KpfEventFrequencyEnum',
			array(
				'description' => 'How often an event occurs.',
				'values'      => array(
					'ONE_TIME'     => array( 'value' => 'one_time' ),
					'WEEKLY'       => array( 'value' => 'weekly' ),
					'MONTHLY'      => array( 'value' => 'monthly' ),
					'QUARTERLY'    => array( 'value' => 'quarterly' ),
					'SEMIANNUALLY' => array( 'value' => 'semiannually' ),
					'ANNUALLY'     => array( 'value' => 'annually' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventNthWeekday',
			array(
				'fields' => array(
					'n'   => array( 'type' => 'Int' ),
					'day' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventAnchor',
			array(
				'fields' => array(
					'month' => array( 'type' => 'Int' ),
					'day'   => array( 'type' => 'Int' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventSchedule',
			array(
				'description' => 'Frequency-specific schedule details (all preferred / optional).',
				'fields'      => array(
					'startDate'    => array( 'type' => 'String' ),
					'byWeekday'    => array( 'type' => array( 'list_of' => 'String' ) ),
					'monthlyMode'  => array( 'type' => 'String' ),
					'byMonthday'   => array( 'type' => 'Int' ),
					'nthWeekday'   => array( 'type' => 'KpfEventNthWeekday' ),
					'byMonth'      => array( 'type' => array( 'list_of' => 'Int' ) ),
					'anchors'      => array( 'type' => array( 'list_of' => 'KpfEventAnchor' ) ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventHostDetails',
			array(
				'fields' => array(
					'termId'  => array( 'type' => 'Int' ),
					'name'    => array( 'type' => 'String' ),
					'slug'    => array( 'type' => 'String' ),
					'logoId'  => array( 'type' => 'Int' ),
					'logoUrl' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventLocation',
			array(
				'description' => 'Flexible event location: area, street address, or directions link.',
				'fields'      => array(
					'mode'        => array( 'type' => 'String' ),
					'label'       => array( 'type' => 'String' ),
					'line1'       => array( 'type' => 'String' ),
					'line2'       => array( 'type' => 'String' ),
					'city'        => array( 'type' => 'String' ),
					'state'       => array( 'type' => 'String' ),
					'postalCode'  => array( 'type' => 'String' ),
					'url'         => array( 'type' => 'String' ),
					'display'     => array( 'type' => 'String' ),
					'mapsUrl'     => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfEventDetails',
			array(
				'description' => 'Card fields for a foundation event.',
				'fields'      => array(
					'logline'       => array( 'type' => 'String' ),
					'description'   => array( 'type' => 'String' ),
					'contactEmail'  => array( 'type' => 'String' ),
					'contactPhone'  => array( 'type' => 'String' ),
					'website'       => array( 'type' => 'String' ),
					'location'      => array( 'type' => 'KpfEventLocation' ),
					'frequency'     => array( 'type' => 'KpfEventFrequencyEnum' ),
					'durationDays'  => array( 'type' => 'Int' ),
					'schedule'      => array( 'type' => 'KpfEventSchedule' ),
					'scheduleLabel' => array( 'type' => 'String' ),
					'hostTermIds'   => array( 'type' => array( 'list_of' => 'Int' ) ),
					'hosts'         => array( 'type' => array( 'list_of' => 'KpfEventHostDetails' ) ),
				),
			)
		);

		register_graphql_field(
			'FoundationEvent',
			'eventDetails',
			array(
				'type'        => 'KpfEventDetails',
				'description' => 'Structured event card details.',
				'resolve'     => static function ( $source ): array {
					$id = is_object( $source ) && isset( $source->ID ) ? (int) $source->ID : 0;
					if ( isset( $source->databaseId ) ) {
						$id = (int) $source->databaseId;
					}
					return self::details( $id );
				},
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function details( int $post_id ): array {
		$meta     = Meta::get( $post_id );
		$schedule = is_array( $meta['schedule'] ?? null ) ? $meta['schedule'] : Meta::default_schedule();

		$hosts = array();
		foreach ( $meta['host_term_ids'] as $term_id ) {
			$term = get_term( (int) $term_id, ContentType::HOST_TAXONOMY );
			if ( ! $term || is_wp_error( $term ) ) {
				continue;
			}
			$logo_id = (int) get_term_meta( (int) $term_id, ContentType::HOST_LOGO_META, true );
			$hosts[] = array(
				'termId'  => (int) $term_id,
				'name'    => $term->name,
				'slug'    => $term->slug,
				'logoId'  => $logo_id,
				'logoUrl' => $logo_id > 0 ? (string) wp_get_attachment_image_url( $logo_id, 'medium' ) : '',
			);
		}

		$nth      = is_array( $schedule['nth_weekday'] ?? null ) ? $schedule['nth_weekday'] : array( 'n' => 1, 'day' => 'MO' );
		$location = is_array( $meta['location'] ?? null ) ? $meta['location'] : Meta::default_location();

		return array(
			'logline'       => $meta['logline'],
			'description'   => $meta['description'],
			'contactEmail'  => $meta['contact_email'],
			'contactPhone'  => $meta['contact_phone'],
			'website'       => $meta['website'],
			'location'      => array(
				'mode'       => (string) ( $location['mode'] ?? 'none' ),
				'label'      => (string) ( $location['label'] ?? '' ),
				'line1'      => (string) ( $location['line1'] ?? '' ),
				'line2'      => (string) ( $location['line2'] ?? '' ),
				'city'       => (string) ( $location['city'] ?? '' ),
				'state'      => (string) ( $location['state'] ?? '' ),
				'postalCode' => (string) ( $location['postal_code'] ?? '' ),
				'url'        => (string) ( $location['url'] ?? '' ),
				'display'    => Meta::format_location_label( $meta ),
				'mapsUrl'    => Meta::location_maps_url( $meta ),
			),
			'frequency'     => $meta['frequency'],
			'durationDays'  => (int) $meta['duration_days'],
			'schedule'      => array(
				'startDate'   => (string) ( $schedule['start_date'] ?? '' ),
				'byWeekday'   => (array) ( $schedule['by_weekday'] ?? array() ),
				'monthlyMode' => (string) ( $schedule['monthly_mode'] ?? 'day_of_month' ),
				'byMonthday'  => (int) ( $schedule['by_monthday'] ?? 0 ),
				'nthWeekday'  => array(
					'n'   => (int) ( $nth['n'] ?? 1 ),
					'day' => (string) ( $nth['day'] ?? 'MO' ),
				),
				'byMonth'     => array_map( 'intval', (array) ( $schedule['by_month'] ?? array() ) ),
				'anchors'     => array_map(
					static function ( array $row ): array {
						return array(
							'month' => (int) $row['month'],
							'day'   => (int) $row['day'],
						);
					},
					(array) ( $schedule['anchors'] ?? array() )
				),
			),
			'scheduleLabel' => Meta::format_schedule_label( $meta ),
			'hostTermIds'   => $meta['host_term_ids'],
			'hosts'         => $hosts,
		);
	}
}

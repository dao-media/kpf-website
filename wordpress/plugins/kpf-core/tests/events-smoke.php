<?php
/**
 * Smoke tests for Events content type (v2 card model).
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/events-smoke.php
 */

use KPF\Core\Events\ContentType as EventsContentType;
use KPF\Core\Events\GraphQL as EventsGraphQL;
use KPF\Core\Events\Meta as EventsMeta;

$GLOBALS['kpf_events_failures'] = 0;

function kpf_events_assert( bool $condition, string $message ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_events_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user( 1 );

kpf_events_assert( post_type_exists( EventsContentType::POST_TYPE ), 'Events post type is registered' );
kpf_events_assert( taxonomy_exists( EventsContentType::HOST_TAXONOMY ), 'Host taxonomy is registered' );

$event_type = get_post_type_object( EventsContentType::POST_TYPE );
kpf_events_assert( (bool) $event_type->show_in_rest, 'Events are available through REST' );
kpf_events_assert( (bool) $event_type->show_in_graphql, 'Events are available through WPGraphQL' );
kpf_events_assert( false === (bool) $event_type->public, 'Events CPT is not public' );
kpf_events_assert( false === (bool) $event_type->publicly_queryable, 'Events CPT is not publicly queryable' );
kpf_events_assert( false === (bool) $event_type->rewrite, 'Events CPT has no rewrite rules' );

$clean = EventsMeta::sanitize(
	array(
		'logline'       => '  A night for veterans  ',
		'description'   => 'Longer description here.',
		'contact_email' => 'events@example.org',
		'contact_phone' => '555-0100',
		'website'        => 'example.org/events',
		'ticketing_link' => 'tickets.example.org/show',
		'frequency'      => 'annually',
		'duration_days' => 2,
		'schedule'      => array(
			'anchors' => array(
				array( 'month' => 8, 'day' => 29 ),
			),
		),
		'host_term_ids' => array( 1, '2', 0 ),
		'food_drinks'   => 'both',
		'evil'          => 'nope',
	)
);

kpf_events_assert( 'A night for veterans' === $clean['logline'], 'Logline is sanitized' );
kpf_events_assert( 'https://example.org/events' === $clean['website'], 'Website gets https://' );
kpf_events_assert(
	'https://tickets.example.org/show' === $clean['ticketing_link'],
	'Ticketing link gets https://'
);
kpf_events_assert( 'annually' === $clean['frequency'], 'Frequency kept' );
kpf_events_assert( 2 === $clean['duration_days'], 'Duration days kept' );
kpf_events_assert( array( 1, 2 ) === $clean['host_term_ids'], 'Host term IDs normalized' );
kpf_events_assert( ! array_key_exists( 'food_drinks', $clean ), 'Legacy food_drinks stripped' );
kpf_events_assert( ! array_key_exists( 'evil', $clean ), 'Unknown keys stripped' );
kpf_events_assert(
	'none' === ( $clean['location']['mode'] ?? '' ),
	'Missing location defaults to none'
);

$area = EventsMeta::sanitize(
	array(
		'location' => array(
			'mode'        => 'area',
			'city'        => 'Troy',
			'state'       => 'mi',
			'postal_code' => '48084',
		),
	)
);
kpf_events_assert( 'area' === $area['location']['mode'], 'Area location mode kept' );
kpf_events_assert( 'MI' === $area['location']['state'], 'State uppercased to 2 letters' );
$area_label = EventsMeta::format_location_label( $area );
kpf_events_assert(
	false !== stripos( $area_label, 'Troy' ) && false !== stripos( $area_label, 'MI' ),
	'Area location formats city/state: ' . $area_label
);
$area_maps = EventsMeta::location_maps_url( $area );
kpf_events_assert(
	false !== strpos( $area_maps, 'google.com/maps/dir' ),
	'Area location builds Google Maps directions URL'
);

$address = EventsMeta::sanitize(
	array(
		'location' => array(
			'mode'  => 'address',
			'label' => 'Community Center',
			'line1' => '123 Main St',
			'city'  => 'Troy',
			'state' => 'MI',
		),
	)
);
$address_label = EventsMeta::format_location_label( $address );
kpf_events_assert(
	false !== stripos( $address_label, 'Community Center' ) && false !== stripos( $address_label, '123 Main St' ),
	'Address location formats label + street: ' . $address_label
);

$directions = EventsMeta::sanitize(
	array(
		'location' => array(
			'mode'  => 'directions',
			'label' => 'Hotel lobby',
			'url'   => 'maps.google.com/?q=hotel',
		),
	)
);
kpf_events_assert( 'directions' === $directions['location']['mode'], 'Directions mode kept' );
kpf_events_assert(
	'https://maps.google.com/?q=hotel' === $directions['location']['url'],
	'Directions URL gets https://'
);
kpf_events_assert(
	'Hotel lobby' === EventsMeta::format_location_label( $directions ),
	'Directions label uses place name'
);
kpf_events_assert(
	'https://maps.google.com/?q=hotel' === EventsMeta::location_maps_url( $directions ),
	'Directions mapsUrl uses custom URL'
);

$label = EventsMeta::format_schedule_label( $clean );
kpf_events_assert(
	false !== stripos( $label, 'August' ) && false !== stripos( $label, '29' ),
	'Annual with anchor formats month/day: ' . $label
);

$flexible = EventsMeta::sanitize(
	array(
		'frequency' => 'annually',
		'schedule'  => array(
			'anchors' => array(
				array(
					'month'    => 8,
					'day'      => 0,
					'day_mode' => 'month',
				),
			),
		),
	)
);
$flexible_label = EventsMeta::format_schedule_label( $flexible );
kpf_events_assert(
	false !== stripos( $flexible_label, 'August' )
		&& false !== stripos( $flexible_label, 'Annually in' )
		&& 1 !== preg_match( '/\b\d{1,2}\b/', $flexible_label ),
	'Annual month-only label has no fixed day: ' . $flexible_label
);

$nth = EventsMeta::sanitize(
	array(
		'frequency' => 'annually',
		'schedule'  => array(
			'anchors' => array(
				array(
					'month'       => 8,
					'day_mode'    => 'nth_weekday',
					'nth_weekday' => array(
						'n'   => 3,
						'day' => 'SA',
					),
				),
			),
		),
	)
);
$nth_label = EventsMeta::format_schedule_label( $nth );
kpf_events_assert(
	false !== stripos( $nth_label, 'August' )
		&& false !== stripos( $nth_label, 'Saturday' )
		&& false !== stripos( $nth_label, 'third' ),
	'Annual nth-weekday label is floating: ' . $nth_label
);

$legacy_anchor = EventsMeta::sanitize(
	array(
		'frequency' => 'annually',
		'schedule'  => array(
			'anchors' => array(
				array( 'month' => 11, 'day' => 11 ),
			),
		),
	)
);
kpf_events_assert(
	'exact' === ( $legacy_anchor['schedule']['anchors'][0]['day_mode'] ?? '' ),
	'Legacy month+day anchors become exact day_mode'
);

$fallback = EventsMeta::format_schedule_label(
	array(
		'frequency' => 'quarterly',
		'schedule'  => array(),
	)
);
kpf_events_assert( 'Quarterly' === $fallback, 'Empty quarterly schedule falls back to frequency name' );

$weekly_fallback = EventsMeta::format_schedule_label(
	array(
		'frequency' => 'weekly',
		'schedule'  => array( 'by_weekday' => array() ),
	)
);
kpf_events_assert( 'Weekly' === $weekly_fallback, 'Empty weekly schedule falls back to Weekly' );

$weekly_detail = EventsMeta::format_schedule_label(
	array(
		'frequency' => 'weekly',
		'schedule'  => array( 'by_weekday' => array( 'MO', 'TH' ) ),
	)
);
kpf_events_assert(
	false !== stripos( $weekly_detail, 'Monday' ) && false !== stripos( $weekly_detail, 'Thursday' ),
	'Weekly with days formats weekday names: ' . $weekly_detail
);

$host = wp_insert_term( 'Smoke Host Org', EventsContentType::HOST_TAXONOMY );
kpf_events_assert( ! is_wp_error( $host ), 'Host term can be created' );

if ( ! is_wp_error( $host ) ) {
	update_term_meta( (int) $host['term_id'], EventsContentType::HOST_LOGO_META, 1 );
	kpf_events_assert(
		1 === (int) get_term_meta( (int) $host['term_id'], EventsContentType::HOST_LOGO_META, true ),
		'Host logo meta persists'
	);
}

$event_id = wp_insert_post(
	array(
		'post_type'   => EventsContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => 'Smoke Test Event',
		'meta_input'  => array(
			EventsMeta::META_KEY => array_merge(
				$clean,
				array(
					'host_term_ids' => ! is_wp_error( $host ) ? array( (int) $host['term_id'] ) : array(),
				)
			),
		),
	),
	true
);

kpf_events_assert( ! is_wp_error( $event_id ) && $event_id > 0, 'Event post can be created' );

if ( ! is_wp_error( $event_id ) && $event_id > 0 ) {
	$details = EventsGraphQL::details( (int) $event_id );
	kpf_events_assert( 'A night for veterans' === $details['logline'], 'GraphQL details include logline' );
	kpf_events_assert( 'annually' === $details['frequency'], 'GraphQL details include frequency' );
	kpf_events_assert( array_key_exists( 'ticketingLink', $details ), 'GraphQL details include ticketingLink' );
	kpf_events_assert( '' !== $details['scheduleLabel'], 'GraphQL details include scheduleLabel' );
	kpf_events_assert( isset( $details['location'] ), 'GraphQL details include location' );
	kpf_events_assert( 'none' === ( $details['location']['mode'] ?? '' ), 'GraphQL location mode defaults to none' );
	if ( ! is_wp_error( $host ) ) {
		kpf_events_assert(
			count( $details['hosts'] ) === 1 && 'Smoke Host Org' === $details['hosts'][0]['name'],
			'GraphQL hosts resolve'
		);
	}
	wp_delete_post( (int) $event_id, true );
}

if ( ! is_wp_error( $host ) ) {
	wp_delete_term( (int) $host['term_id'], EventsContentType::HOST_TAXONOMY );
}

if ( $GLOBALS['kpf_events_failures'] > 0 ) {
	echo "\n{$GLOBALS['kpf_events_failures']} failure(s)\n";
	exit( 1 );
}

echo "\nAll events smoke tests passed.\n";

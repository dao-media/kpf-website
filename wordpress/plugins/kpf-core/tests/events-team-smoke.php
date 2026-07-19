<?php
/**
 * Smoke tests for Events and Team content types.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/events-team-smoke.php
 */

use KPF\Core\Events\ContentType as EventsContentType;
use KPF\Core\Events\Meta as EventsMeta;
use KPF\Core\Team\ContentType as TeamContentType;
use KPF\Core\Team\Meta as TeamMeta;

$GLOBALS['kpf_events_team_failures'] = 0;

function kpf_events_team_assert(bool $condition, string $message): void {
	if ($condition) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_events_team_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user(1);

kpf_events_team_assert(post_type_exists(EventsContentType::POST_TYPE), 'Events post type is registered');
kpf_events_team_assert(taxonomy_exists(EventsContentType::LIVE_TAXONOMY), 'Live events taxonomy is registered');
kpf_events_team_assert(taxonomy_exists(EventsContentType::PARTNER_TAXONOMY), 'Partner taxonomy is registered');
kpf_events_team_assert(post_type_exists(TeamContentType::POST_TYPE), 'Team post type is registered');

$event_type = get_post_type_object(EventsContentType::POST_TYPE);
kpf_events_team_assert((bool) $event_type->show_in_rest, 'Events are available through REST');
kpf_events_team_assert((bool) $event_type->show_in_graphql, 'Events are available through WPGraphQL');
kpf_events_team_assert(
	is_array($event_type->rewrite) && EventsContentType::REWRITE_SLUG === ($event_type->rewrite['slug'] ?? ''),
	'Events rewrite slug is /event/'
);

$team_type = get_post_type_object(TeamContentType::POST_TYPE);
kpf_events_team_assert(
	is_array($team_type->rewrite) && TeamContentType::REWRITE_SLUG === ($team_type->rewrite['slug'] ?? ''),
	'Team rewrite slug is /profile/'
);

$clean = EventsMeta::sanitize(
	array(
		'start_date'    => '2026-08-01',
		'end_date'      => '2026-07-01',
		'start_time'    => '18:30',
		'end_time'      => '99:99',
		'timezone'      => 'Not/AZone',
		'location_type' => 'outdoor',
		'food_drinks'   => 'both',
		'is_recurring'  => true,
		'recurrence'    => array(
			'frequency'  => 'weekly',
			'interval'   => 2,
			'by_weekday' => array( 'FR', 'bogus' ),
			'end_mode'   => 'count',
			'count'      => 5,
		),
		'exceptions'    => array(
			array( 'date' => '2026-08-15', 'reason' => 'Holiday' ),
			array( 'date' => 'bad', 'reason' => 'skip' ),
		),
		'reschedules'   => array(
			array(
				'original_date' => '2026-08-22',
				'new_date'      => '2026-08-23',
				'start_time'    => '19:00',
				'end_time'      => '21:00',
				'note'          => 'Moved indoors',
			),
		),
		'host_ids'      => array( 1, '2', 0 ),
	)
);

kpf_events_team_assert($clean['end_date'] === '2026-08-01', 'End date cannot precede start date');
kpf_events_team_assert($clean['end_time'] === '', 'Invalid end time is cleared');
kpf_events_team_assert($clean['timezone'] === 'America/New_York', 'Invalid timezone falls back');
kpf_events_team_assert($clean['recurrence']['by_weekday'] === array( 'FR' ), 'Weekday list is sanitized');
kpf_events_team_assert(count($clean['exceptions']) === 1, 'Invalid exception dates are dropped');
kpf_events_team_assert(count($clean['reschedules']) === 1, 'Reschedule rows are kept when dates are valid');
kpf_events_team_assert($clean['host_ids'] === array( 1, 2 ), 'Host IDs are normalized');

$team_clean = TeamMeta::sanitize(
	array(
		'job_title'     => 'Board Chair',
		'short_summary' => 'Leads the foundation board.',
		'email'         => 'not-an-email',
		'phone'         => '555-0100',
		'social_links'  => array(
			array( 'type' => 'instagram', 'url' => 'https://instagram.com/example', 'label' => '' ),
			array( 'type' => 'website', 'url' => '', 'label' => '' ),
			array( 'type' => 'other', 'url' => 'https://example.org', 'label' => 'Blog' ),
		),
	)
);
kpf_events_team_assert($team_clean['email'] === '', 'Invalid team email is cleared');
kpf_events_team_assert(count($team_clean['social_links']) === 2, 'Empty social URLs are dropped');

$team_id = wp_insert_post(
	array(
		'post_type'   => TeamContentType::POST_TYPE,
		'post_title'  => 'Jamie Example',
		'post_status' => 'publish',
	),
	true
);
kpf_events_team_assert(! is_wp_error($team_id) && $team_id > 0, 'Team member can be created');
$team_post = get_post((int) $team_id);
kpf_events_team_assert(
	$team_post && 'jamieexample' === $team_post->post_name,
	'Team slug is compacted to firstnamelastname'
);

$partner = wp_insert_term('Community Partners Org', EventsContentType::PARTNER_TAXONOMY);
kpf_events_team_assert(! is_wp_error($partner), 'Partner co-host term can be created');
if (! is_wp_error($partner)) {
	update_term_meta((int) $partner['term_id'], EventsContentType::PARTNER_LOGO_META, 1);
	kpf_events_team_assert(
		1 === (int) get_term_meta((int) $partner['term_id'], EventsContentType::PARTNER_LOGO_META, true),
		'Partner logo term meta can be stored'
	);
}

$event_id = wp_insert_post(
	array(
		'post_type'   => EventsContentType::POST_TYPE,
		'post_title'  => 'Summer Gathering',
		'post_status' => 'publish',
		'post_name'   => 'summer-gathering',
		'meta_input'  => array(
			EventsMeta::META_KEY => EventsMeta::sanitize(
				array(
					'start_date'       => '2026-08-01',
					'is_recurring'     => true,
					'host_ids'         => array( (int) $team_id ),
					'co_host_term_ids' => ! is_wp_error($partner) ? array( (int) $partner['term_id'] ) : array(),
				)
			),
		),
	),
	true
);
kpf_events_team_assert(! is_wp_error($event_id) && $event_id > 0, 'Event can be created with meta');

if (! is_wp_error($event_id)) {
	kpf_events_team_assert(
		'1' === (string) get_post_meta((int) $event_id, EventsMeta::IS_RECURRING_META, true),
		'Recurring shadow meta is synced'
	);
	$occurrence = EventsContentType::occurrence_url((int) $event_id, '2026-08-01');
	kpf_events_team_assert(
		str_contains($occurrence, '/event/summer-gathering_08012026'),
		'Recurring occurrence URL uses /event/slug_MMDDYYYY'
	);
}

if (! is_wp_error($team_id)) {
	wp_delete_post((int) $team_id, true);
}
if (! is_wp_error($event_id)) {
	wp_delete_post((int) $event_id, true);
}
if (! is_wp_error($partner)) {
	wp_delete_term((int) $partner['term_id'], EventsContentType::PARTNER_TAXONOMY);
}

if ($GLOBALS['kpf_events_team_failures'] > 0) {
	echo "\n{$GLOBALS['kpf_events_team_failures']} failure(s).\n";
	exit(1);
}

echo "\nAll Events/Team smoke checks passed.\n";

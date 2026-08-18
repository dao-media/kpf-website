<?php

use KPF\Core\Admin\Dashboard;

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Run with wp eval-file.\n" );
	exit( 1 );
}

function kpf_dashboard_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
	echo "PASS: {$message}\n";
}

wp_set_current_user( 1 );

$data = Dashboard::data();
kpf_dashboard_assert( isset( $data['site']['name'], $data['user']['name'] ), 'Dashboard includes site and user context' );
kpf_dashboard_assert( 4 === count( $data['stats'] ), 'Dashboard includes four summary metrics' );
kpf_dashboard_assert( ! empty( $data['actions'] ), 'Dashboard includes capability-aware quick actions' );
kpf_dashboard_assert(
	count( array_filter( $data['actions'], static fn( array $action ): bool => ! empty( $action['icon'] ) ) ) === count( $data['actions'] ),
	'Every quick action declares a Lucide icon'
);
kpf_dashboard_assert( 4 === count( $data['health'] ), 'Dashboard includes site readiness cards' );
kpf_dashboard_assert( isset( $data['links']['backups'] ), 'Dashboard includes a backups operations link' );
kpf_dashboard_assert(
	count( array_filter( $data['health'], static fn( array $item ): bool => ( $item['id'] ?? '' ) === 'backups' ) ) === 1,
	'Dashboard includes a backups readiness card'
);
kpf_dashboard_assert( isset( $data['dateTime']['timezone'] ), 'Dashboard includes site timezone config' );
kpf_dashboard_assert( isset( $data['calendar']['days'], $data['calendar']['startsOn'], $data['calendar']['scheduled'] ), 'Dashboard includes publishing calendar data' );
kpf_dashboard_assert( is_array( $data['recent'] ), 'Dashboard includes recent editorial activity' );
kpf_dashboard_assert( is_array( $data['attention'] ), 'Dashboard includes an editorial review queue' );

$editorial_types = ( new ReflectionClass( Dashboard::class ) )
	->getMethod( 'editorial_post_types' );
$editorial_types->setAccessible( true );
/** @var list<string> $types */
$types = $editorial_types->invoke( null );
foreach ( array( 'page', 'post', 'kpf_scrapbook', 'kpf_kevin', 'kpf_grant', 'kpf_grantee', 'kpf_event', 'kpf_code', 'kpf_form_entry' ) as $expected ) {
	kpf_dashboard_assert(
		in_array( $expected, $types, true ),
		"Recently updated includes post type {$expected}"
	);
}
kpf_dashboard_assert( ! in_array( 'attachment', $types, true ), 'Recently updated excludes Media attachments' );

require_once ABSPATH . 'wp-admin/includes/dashboard.php';
set_current_screen( 'dashboard' );
Dashboard::setup();
global $wp_meta_boxes;
kpf_dashboard_assert(
	isset( $wp_meta_boxes['dashboard']['normal']['core']['kpf-admin-dashboard'] ),
	'Custom dashboard replaces the default widget grid'
);

echo "Admin dashboard smoke tests passed.\n";

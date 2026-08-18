<?php
/**
 * Smoke tests for Dashboard → Resources.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/resources-smoke.php
 */

use KPF\Core\Admin\Resources;

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Run with wp eval-file.\n" );
	exit( 1 );
}

function kpf_resources_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
	echo "PASS: {$message}\n";
}

wp_set_current_user( 1 );

$data = Resources::data();
kpf_resources_assert( ! empty( $data['title'] ), 'Resources data includes a title' );
kpf_resources_assert( is_array( $data['cards'] ) && count( $data['cards'] ) >= 2, 'Resources includes at least two cards' );

$ids = array_map( static fn( array $card ): string => (string) ( $card['id'] ?? '' ), $data['cards'] );
kpf_resources_assert( in_array( 'kevin-story', $ids, true ), 'Resources includes Kevin’s Story card' );
kpf_resources_assert( in_array( 'grantee', $ids, true ), 'Resources includes Grantee card' );

foreach ( $data['cards'] as $card ) {
	kpf_resources_assert( ! empty( $card['title'] ), 'Each card has a title' );
	kpf_resources_assert( ! empty( $card['sections'] ), 'Each card has instruction sections' );
	kpf_resources_assert( ! empty( $card['actions'] ), 'Each card has actions' );
}

$kevin = null;
foreach ( $data['cards'] as $card ) {
	if ( 'kevin-story' === ( $card['id'] ?? '' ) ) {
		$kevin = $card;
		break;
	}
}
kpf_resources_assert( is_array( $kevin ), 'Kevin card resolved' );
$kevin_blob = wp_json_encode( $kevin );
kpf_resources_assert( false !== strpos( (string) $kevin_blob, '1120' ), 'Kevin card mentions image dimensions' );
kpf_resources_assert( false !== stripos( (string) $kevin_blob, 'transparent' ), 'Kevin card mentions transparency' );
kpf_resources_assert( false !== stripos( (string) $kevin_blob, 'Order' ), 'Kevin card mentions order' );

require_once ABSPATH . 'wp-admin/includes/admin.php';

global $submenu;
$submenu['index.php'] = array(
	array( 'Home', 'read', 'index.php' ),
	array( 'Updates', 'update_core', 'update-core.php' ),
	array( 'Resources', 'edit_posts', Resources::MENU_SLUG ),
	array( 'My Sites', 'read', 'my-sites.php' ),
);
Resources::reorder_dashboard_submenu();

$slugs = array();
foreach ( (array) ( $submenu['index.php'] ?? array() ) as $item ) {
	$slugs[] = (string) ( $item[2] ?? '' );
}

kpf_resources_assert(
	array( 'index.php', Resources::MENU_SLUG, 'update-core.php', 'my-sites.php' ) === $slugs,
	'Dashboard submenu order is Home → Resources → Updates → others'
);

echo "Resources smoke tests passed.\n";

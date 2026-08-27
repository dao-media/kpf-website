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
kpf_resources_assert( is_array( $data['postTypeKey'] ) && count( $data['postTypeKey'] ) >= 6, 'Resources includes a post type key' );
$key_labels = array_map( static fn( array $row ): string => (string) ( $row['label'] ?? '' ), $data['postTypeKey'] );
foreach ( array( 'Pages', 'Scrapbook', 'Events', 'Hosts', 'Grants', 'Grantees' ) as $expected_label ) {
	kpf_resources_assert( in_array( $expected_label, $key_labels, true ), "Post type key includes {$expected_label}" );
}
kpf_resources_assert( is_array( $data['techStack'] ) && count( $data['techStack'] ) >= 10, 'Resources includes a tech stack' );
$stack_labels = array_map( static fn( array $row ): string => (string) ( $row['label'] ?? '' ), $data['techStack'] );
foreach ( array( 'Public site', 'CMS', 'GraphQL', 'kpf-core', 'Motion', 'Source' ) as $expected_label ) {
	kpf_resources_assert( in_array( $expected_label, $stack_labels, true ), "Tech stack includes {$expected_label}" );
}
kpf_resources_assert( is_array( $data['groups'] ) && count( $data['groups'] ) >= 4, 'Resources includes at least four topic groups' );
kpf_resources_assert( is_array( $data['cards'] ) && count( $data['cards'] ) >= 7, 'Resources includes at least seven cards' );

$group_ids = array_map( static fn( array $group ): string => (string) ( $group['id'] ?? '' ), $data['groups'] );
kpf_resources_assert( in_array( 'page-content', $group_ids, true ), 'Resources includes Page content topic' );
kpf_resources_assert( in_array( 'scrapbook', $group_ids, true ), 'Resources includes Scrapbook topic' );
kpf_resources_assert( in_array( 'kevin-stories', $group_ids, true ), 'Resources includes Kevin’s Stories topic' );
kpf_resources_assert( in_array( 'grants-partners', $group_ids, true ), 'Resources includes Grants & partners topic' );

$ids = array_map( static fn( array $card ): string => (string) ( $card['id'] ?? '' ), $data['cards'] );
kpf_resources_assert( in_array( 'page-copy', $ids, true ), 'Resources includes Editing page content card' );
kpf_resources_assert( in_array( 'scrapbook-item', $ids, true ), 'Resources includes Adding a scrapbook item card' );
kpf_resources_assert( in_array( 'scrapbook-item-edit', $ids, true ), 'Resources includes Editing scrapbook items card' );
kpf_resources_assert( in_array( 'kevin-story', $ids, true ), 'Resources includes Kevin’s Story card' );
kpf_resources_assert( in_array( 'kevin-story-edit', $ids, true ), 'Resources includes Editing Kevin’s Stories card' );
kpf_resources_assert( in_array( 'grantee', $ids, true ), 'Resources includes Grantee card' );
kpf_resources_assert( in_array( 'grant', $ids, true ), 'Resources includes Adding a Grant card' );

foreach ( $data['groups'] as $group ) {
	kpf_resources_assert( ! empty( $group['title'] ), 'Each topic group has a title' );
	kpf_resources_assert( ! empty( $group['cards'] ) && is_array( $group['cards'] ), 'Each topic group has cards' );
}

foreach ( $data['cards'] as $card ) {
	kpf_resources_assert( ! empty( $card['title'] ), 'Each card has a title' );
	kpf_resources_assert( ! empty( $card['sections'] ), 'Each card has instruction sections' );
	kpf_resources_assert( ! empty( $card['actions'] ), 'Each card has actions' );
	kpf_resources_assert( ! empty( $card['groupId'] ), 'Each flat card carries a groupId' );
	kpf_resources_assert( is_array( $card['screenshot'] ?? null ), 'Each card has a screenshot' );
	kpf_resources_assert( ! empty( $card['screenshot']['src'] ), 'Each screenshot has a src' );
	kpf_resources_assert( ! empty( $card['screenshot']['alt'] ), 'Each screenshot has alt text' );
	kpf_resources_assert(
		false !== strpos( (string) $card['screenshot']['src'], 'assets/media/resources/' ),
		'Each screenshot is served from plugin resources media'
	);
}

$kevin = null;
$kevin_edit = null;
foreach ( $data['cards'] as $card ) {
	if ( 'kevin-story' === ( $card['id'] ?? '' ) ) {
		$kevin = $card;
	}
	if ( 'kevin-story-edit' === ( $card['id'] ?? '' ) ) {
		$kevin_edit = $card;
	}
}
kpf_resources_assert( is_array( $kevin ), 'Kevin card resolved' );
kpf_resources_assert( is_array( $kevin_edit ), 'Editing Kevin’s Stories card resolved' );
$kevin_blob = wp_json_encode( $kevin );
kpf_resources_assert( false !== strpos( (string) $kevin_blob, '1120' ), 'Kevin card mentions image dimensions' );
kpf_resources_assert( false !== stripos( (string) $kevin_blob, 'transparent' ), 'Kevin card mentions transparency' );
kpf_resources_assert( false !== stripos( (string) $kevin_blob, 'Order' ), 'Kevin card mentions order' );

$edit_blob = wp_json_encode( $kevin_edit );
kpf_resources_assert( false !== stripos( (string) $edit_blob, 'Scrapbook' ), 'Edit card points editors to Scrapbook → Kevin' );
kpf_resources_assert( false !== stripos( (string) $edit_blob, 'Order' ), 'Edit card mentions order' );
kpf_resources_assert( false !== stripos( (string) $edit_blob, 'Draft' ), 'Edit card mentions draft/publish' );

$grant = null;
foreach ( $data['cards'] as $card ) {
	if ( 'grant' === ( $card['id'] ?? '' ) ) {
		$grant = $card;
		break;
	}
}
kpf_resources_assert( is_array( $grant ), 'Adding a Grant card resolved' );
$grant_blob = wp_json_encode( $grant );
kpf_resources_assert( false !== stripos( (string) $grant_blob, 'Recipient' ), 'Grant card mentions recipient' );
kpf_resources_assert( false !== stripos( (string) $grant_blob, 'check' ), 'Grant card mentions check photo' );
kpf_resources_assert( false !== stripos( (string) $grant_blob, 'Grantee' ), 'Grant card requires a Grantee first' );
kpf_resources_assert( is_array( $grant['screenshots'] ?? null ) && count( $grant['screenshots'] ) >= 2, 'Grant card includes two screenshots' );

$page_copy = null;
foreach ( $data['cards'] as $card ) {
	if ( 'page-copy' === ( $card['id'] ?? '' ) ) {
		$page_copy = $card;
		break;
	}
}
kpf_resources_assert( is_array( $page_copy ), 'Editing page content card resolved' );
$page_blob = wp_json_encode( $page_copy );
kpf_resources_assert( false !== stripos( (string) $page_blob, 'Edit code & copy' ), 'Page content card names Edit code & copy' );
kpf_resources_assert( false !== stripos( (string) $page_blob, 'Save design' ), 'Page content card names Save design' );
kpf_resources_assert( false !== stripos( (string) $page_blob, 'Page copy' ), 'Page content card names the Page copy column' );
kpf_resources_assert( false !== stripos( (string) $page_blob, 'built-in' ), 'Page content card warns about built-in layouts' );
kpf_resources_assert( is_array( $page_copy['screenshots'] ?? null ) && count( $page_copy['screenshots'] ) >= 2, 'Page content card includes two screenshots' );

$scrapbook = null;
$scrapbook_edit = null;
foreach ( $data['cards'] as $card ) {
	if ( 'scrapbook-item' === ( $card['id'] ?? '' ) ) {
		$scrapbook = $card;
	}
	if ( 'scrapbook-item-edit' === ( $card['id'] ?? '' ) ) {
		$scrapbook_edit = $card;
	}
}
kpf_resources_assert( is_array( $scrapbook ), 'Adding a scrapbook item card resolved' );
kpf_resources_assert( is_array( $scrapbook_edit ), 'Editing scrapbook items card resolved' );
$scrapbook_blob = wp_json_encode( $scrapbook );
kpf_resources_assert( false !== stripos( (string) $scrapbook_blob, 'Images' ), 'Scrapbook card mentions the Images box' );
kpf_resources_assert( false !== stripos( (string) $scrapbook_blob, 'Add a description' ), 'Scrapbook card mentions Add a description' );
kpf_resources_assert( false !== stripos( (string) $scrapbook_blob, 'cannot publish' ), 'Scrapbook card says you cannot publish without an image' );
kpf_resources_assert( false !== stripos( (string) $scrapbook_blob, 'The work' ), 'Scrapbook card points to About The work mosaic' );
kpf_resources_assert( false !== stripos( (string) $scrapbook_blob, 'Kevin' ), 'Scrapbook card distinguishes Kevin slides' );
kpf_resources_assert( is_array( $scrapbook['screenshots'] ?? null ) && count( $scrapbook['screenshots'] ) >= 2, 'Scrapbook card includes two screenshots' );

$scrapbook_edit_blob = wp_json_encode( $scrapbook_edit );
kpf_resources_assert( false !== stripos( (string) $scrapbook_edit_blob, 'Manage' ), 'Edit scrapbook card points to Manage' );
kpf_resources_assert( false !== stripos( (string) $scrapbook_edit_blob, 'Kevin' ), 'Edit scrapbook card distinguishes Kevin slides' );
kpf_resources_assert( false !== stripos( (string) $scrapbook_edit_blob, 'Images' ), 'Edit scrapbook card mentions the Images box' );

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

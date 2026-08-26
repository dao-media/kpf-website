<?php
/**
 * Smoke tests for Grantees (org) + Grants (awards).
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/grantees-smoke.php
 */

use KPF\Core\Grantees\Admin as GranteeAdmin;
use KPF\Core\Grantees\ContentType as GranteeContentType;
use KPF\Core\Grantees\GraphQL as GranteeGraphQL;
use KPF\Core\Grantees\Meta as GranteeMeta;
use KPF\Core\Grants\Admin as GrantAdmin;
use KPF\Core\Grants\ContentType as GrantContentType;
use KPF\Core\Grants\GraphQL as GrantGraphQL;
use KPF\Core\Grants\Meta as GrantMeta;

$GLOBALS['kpf_grantees_failures'] = 0;

function kpf_grantees_assert( bool $condition, string $message ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}
	++$GLOBALS['kpf_grantees_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user( 1 );

$grant_type = get_post_type_object( GrantContentType::POST_TYPE );
kpf_grantees_assert( (bool) $grant_type, 'Grant post type is registered' );
kpf_grantees_assert( true === (bool) $grant_type->show_ui, 'Grant CPT shows UI' );
kpf_grantees_assert( false === (bool) $grant_type->public, 'Grant CPT is not public' );

$post_type = get_post_type_object( GranteeContentType::POST_TYPE );
kpf_grantees_assert( (bool) $post_type, 'Grantee post type is registered' );
kpf_grantees_assert(
	'edit.php?post_type=kpf_grant' === (string) $post_type->show_in_menu,
	'Grantee CPT is nested under Grants menu'
);
kpf_grantees_assert(
	false === (bool) use_block_editor_for_post_type( GrantContentType::POST_TYPE ),
	'Grant CPT uses classic editor'
);

$sortable = GrantAdmin::sortable_columns( array() );
kpf_grantees_assert( isset( $sortable['kpf_awarded'] ), 'Awarded column is sortable' );
kpf_grantees_assert( isset( $sortable['kpf_amount'] ), 'Amount column is sortable' );
kpf_grantees_assert( isset( $sortable['kpf_recipient'] ), 'Recipient column is sortable' );

require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
require_once ABSPATH . 'wp-admin/includes/screen.php';
set_current_screen( 'edit-' . GrantContentType::POST_TYPE );

$query                   = new WP_Query();
$previous_main           = $GLOBALS['wp_the_query'] ?? null;
$GLOBALS['wp_the_query'] = $query;
$query->set( 'post_type', GrantContentType::POST_TYPE );
GrantAdmin::apply_sorting( $query );
kpf_grantees_assert( GrantMeta::SORT_DATE_KEY === $query->get( 'meta_key' ), 'Default grant sort uses award date meta' );
kpf_grantees_assert( 'DESC' === strtoupper( (string) $query->get( 'order' ) ), 'Default grant sort is descending' );
$GLOBALS['wp_the_query'] = $previous_main;

$org = GranteeMeta::sanitize(
	array(
		'contact_name' => '  Jane Doe  ',
		'website'      => 'example.org/about',
		'blurb'        => "  Serves youth through <script>alert(1)</script> sports.  \n",
		'grant_amount' => 999,
		'evil'         => 'nope',
	)
);
kpf_grantees_assert( 'Jane Doe' === $org['contact_name'], 'Contact name is sanitized' );
kpf_grantees_assert( 'https://example.org/about' === $org['website'], 'Website gets https:// when missing' );
kpf_grantees_assert(
	'Serves youth through  sports.' === $org['blurb'],
	'Blurb is sanitized as textarea (tags stripped)'
);
kpf_grantees_assert( ! array_key_exists( 'grant_amount', $org ), 'Award fields are stripped from grantee meta' );
kpf_grantees_assert( ! array_key_exists( 'evil', $org ), 'Unknown keys are stripped' );

$grantee_id = wp_insert_post(
	array(
		'post_type'   => GranteeContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => 'Smoke Test Org',
		'meta_input'  => array(
			GranteeMeta::META_KEY => $org,
		),
	),
	true
);
kpf_grantees_assert( ! is_wp_error( $grantee_id ) && $grantee_id > 0, 'Grantee post can be created' );

$grant_clean = GrantMeta::sanitize(
	array(
		'grantee_id'     => $grantee_id,
		'grant_amount'   => '$5,000.50',
		'awarded_month'  => 7,
		'awarded_year'   => 2024,
		'check_photo_id' => 999999999,
	)
);
kpf_grantees_assert( (int) $grantee_id === $grant_clean['grantee_id'], 'Grant links to grantee' );
kpf_grantees_assert( 'Smoke Test Org' === $grant_clean['recipient_name'], 'Recipient name denormalized from grantee' );
kpf_grantees_assert( 5000.5 === $grant_clean['grant_amount'], 'Grant amount strips $ and commas' );
kpf_grantees_assert( 0 === $grant_clean['check_photo_id'], 'Invalid check photo clears' );
kpf_grantees_assert(
	'Smoke Test Org · Jul 2024 · $5,000.50' === GrantMeta::compose_title( $grant_clean ),
	'Grant title is composed from recipient, date, amount'
);

$grant_id = wp_insert_post(
	array(
		'post_type'   => GrantContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => GrantMeta::compose_title( $grant_clean ),
	),
	true
);
kpf_grantees_assert( ! is_wp_error( $grant_id ) && $grant_id > 0, 'Grant post can be created' );

if ( ! is_wp_error( $grant_id ) && $grant_id > 0 ) {
	GrantMeta::save( (int) $grant_id, $grant_clean );
	$stored = GrantMeta::get( (int) $grant_id );
	kpf_grantees_assert( 5000.5 === $stored['grant_amount'], 'Grant meta persists amount' );
	kpf_grantees_assert(
		(int) get_post_meta( (int) $grant_id, GrantMeta::SORT_DATE_KEY, true ) === 202407,
		'Sort date key is YYYYMM'
	);

	\KPF\Core\Grants\Totals::bust_cache();
	$by_grantee = \KPF\Core\Grants\Totals::for_grantee( (int) $grantee_id );
	kpf_grantees_assert( 1 === $by_grantee['count'], 'Grantee summary counts the published grant' );
	kpf_grantees_assert( 5000.5 === $by_grantee['amount'], 'Grantee summary sums the published amount' );

	$details = GrantGraphQL::details( (int) $grant_id );
	kpf_grantees_assert( 'Smoke Test Org' === $details['recipientName'], 'GraphQL grant details include recipient' );
	kpf_grantees_assert( 'Jul 2024' === $details['awardedLabel'], 'GraphQL grant details include awarded label' );
	kpf_grantees_assert( '$5,000.50' === $details['grantAmountLabel'], 'GraphQL grant details include amount label' );

	wp_delete_post( (int) $grant_id, true );
}

if ( ! is_wp_error( $grantee_id ) && $grantee_id > 0 ) {
	$g_details = GranteeGraphQL::details( (int) $grantee_id );
	kpf_grantees_assert( 'Smoke Test Org' === $g_details['organization'], 'GraphQL grantee details include organization' );
	kpf_grantees_assert( 'Serves youth through  sports.' === $g_details['blurb'], 'GraphQL grantee details include blurb' );
	kpf_grantees_assert( ! array_key_exists( 'grantAmount', $g_details ), 'Grantee GraphQL no longer exposes grant amount' );
	wp_delete_post( (int) $grantee_id, true );
}

$grantee_sortable = GranteeAdmin::sortable_columns( array() );
kpf_grantees_assert(
	isset( $grantee_sortable['title'][4] ) && 'asc' === $grantee_sortable['title'][4],
	'Organization column is the default ascending sort'
);
kpf_grantees_assert( isset( $grantee_sortable['kpf_grants'] ), 'Grants column is sortable' );
kpf_grantees_assert( isset( $grantee_sortable['kpf_granted'] ), 'Total granted column is sortable' );

$grantee_cols = GranteeAdmin::columns( array( 'cb' => '', 'date' => 'Date' ) );
kpf_grantees_assert( isset( $grantee_cols['kpf_grants'] ), 'Grantees list has a Grants column' );
kpf_grantees_assert( isset( $grantee_cols['kpf_granted'] ), 'Grantees list has a Total granted column' );

if ( $GLOBALS['kpf_grantees_failures'] > 0 ) {
	echo "\n{$GLOBALS['kpf_grantees_failures']} failure(s)\n";
	exit( 1 );
}

echo "\nAll grantee/grant smoke tests passed.\n";

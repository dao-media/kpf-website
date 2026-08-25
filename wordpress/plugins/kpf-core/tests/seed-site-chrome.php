<?php
/**
 * Seed global Site Header + Site Footer Components and assign chrome roles.
 *
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/seed-site-chrome.php
 */

use KPF\Core\Blocks\Globals;
use KPF\Core\Blocks\Groups;
use KPF\Core\Scaffold\ChromeHtml;

wp_set_current_user( 1 );

const KPF_CHROME_SEED_VERSION = '2026-08-25-footer-nav';

$foundation = term_exists( 'foundation-components', Groups::TAXONOMY );
$parent_id  = is_array( $foundation ) ? (int) $foundation['term_id'] : 0;
if ( $parent_id < 1 ) {
	$created   = wp_insert_term( 'Foundation Components', Groups::TAXONOMY, array( 'slug' => 'foundation-components' ) );
	$parent_id = is_array( $created ) ? (int) $created['term_id'] : 0;
}
$chrome = term_exists( 'chrome', Groups::TAXONOMY );
if ( ! is_array( $chrome ) && $parent_id > 0 ) {
	wp_insert_term( 'Chrome', Groups::TAXONOMY, array( 'slug' => 'chrome', 'parent' => $parent_id ) );
	echo "Created component group: chrome\n";
}

/**
 * @param array<string, mixed> $definition
 */
function kpf_seed_chrome_component( array $definition ): int {
	$existing = get_page_by_path( $definition['slug'], OBJECT, 'wp_block' );
	$payload  = array(
		'post_type'    => 'wp_block',
		'post_status'  => 'publish',
		'post_name'    => $definition['slug'],
		'post_title'   => $definition['title'],
		'post_content' => $definition['content'],
	);

	if ( $existing instanceof WP_Post ) {
		$payload['ID'] = (int) $existing->ID;
		$post_id       = wp_update_post( $payload, true );
	} else {
		$post_id = wp_insert_post( $payload, true );
	}

	if ( is_wp_error( $post_id ) || (int) $post_id < 1 ) {
		echo 'FAILED ' . $definition['slug'] . ': ' . ( is_wp_error( $post_id ) ? $post_id->get_error_message() : 'unknown' ) . "\n";
		return 0;
	}

	$post_id = (int) $post_id;
	update_post_meta( $post_id, 'wp_pattern_sync_status', 'unsynced' );
	update_post_meta( $post_id, Globals::ROLE_META, $definition['role'] );
	update_post_meta( $post_id, Globals::BEHAVIOR_META, $definition['behavior'] );
	wp_set_object_terms( $post_id, array( $definition['group'] ), Groups::TAXONOMY, false );

	// Trigger map sync.
	$post = get_post( $post_id );
	if ( $post instanceof WP_Post ) {
		Globals::sync_role_map( $post_id, $post );
	}

	echo "Seeded {$definition['slug']} (ID {$post_id}) as {$definition['role']}.\n";
	return $post_id;
}

$header_behavior = array_merge(
	Globals::default_behavior( Globals::ROLE_HEADER ),
	array(
		'mode'             => 'sticky',
		'overlayHero'      => true,
		'transparentAtTop' => true,
		'zIndex'           => 100,
	)
);

$footer_behavior = Globals::default_behavior( Globals::ROLE_FOOTER );

kpf_seed_chrome_component(
	array(
		'slug'     => 'kpf-site-header',
		'title'    => 'Site Header',
		'group'    => 'chrome',
		'role'     => Globals::ROLE_HEADER,
		'behavior' => $header_behavior,
		'content'  => ChromeHtml::as_html_block( ChromeHtml::header_html() ),
	)
);

kpf_seed_chrome_component(
	array(
		'slug'     => 'kpf-site-footer',
		'title'    => 'Site Footer',
		'group'    => 'chrome',
		'role'     => Globals::ROLE_FOOTER,
		'behavior' => $footer_behavior,
		'content'  => ChromeHtml::as_html_block( ChromeHtml::footer_html() ),
	)
);

$map = Globals::map();
echo 'Global map: ' . wp_json_encode( $map ) . "\n";
update_option( 'kpf_site_chrome_seed_version', KPF_CHROME_SEED_VERSION, false );
echo "Done (version " . KPF_CHROME_SEED_VERSION . ").\n";

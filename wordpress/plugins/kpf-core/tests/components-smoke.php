<?php
/**
 * Smoke tests for the KPF reusable component library.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/components-smoke.php
 */

use KPF\Core\Blocks\Groups;
use KPF\Core\Blocks\Globals;
use KPF\Core\Blocks\Registry;
use KPF\Core\Blocks\Admin;

$GLOBALS['kpf_component_failures'] = 0;

function kpf_component_assert(bool $condition, string $message): void {
	if ($condition) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_component_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user(1);

$block_registry = WP_Block_Type_Registry::get_instance();
foreach (Registry::block_names() as $block_name) {
	kpf_component_assert(
		(bool) $block_registry->get_registered($block_name),
		"Block {$block_name} is registered"
	);
}

$taxonomy = get_taxonomy(Groups::TAXONOMY);
kpf_component_assert((bool) $taxonomy, 'Component Group taxonomy is registered');
kpf_component_assert((bool) $taxonomy->hierarchical, 'Component Groups support parent/child hierarchy');
kpf_component_assert((bool) $taxonomy->show_in_rest, 'Component Groups are available to the editor');

$root = get_term_by('slug', 'foundation-components', Groups::TAXONOMY);
$actions = get_term_by('slug', 'actions', Groups::TAXONOMY);
$content = get_term_by('slug', 'content', Groups::TAXONOMY);
$information = get_term_by('slug', 'information', Groups::TAXONOMY);
kpf_component_assert((bool) $root, 'Foundation Components root group exists');
kpf_component_assert(
	$actions && (int) $actions->parent === (int) $root->term_id,
	'Actions is nested under Foundation Components'
);
kpf_component_assert(
	$content && (int) $content->parent === (int) $root->term_id,
	'Content is nested under Foundation Components'
);
kpf_component_assert(
	$information && (int) $information->parent === (int) $root->term_id,
	'Information is nested under Foundation Components'
);

$child = wp_insert_term(
	'Annual Gala',
	Groups::TAXONOMY,
	array(
		'parent' => (int) $actions->term_id,
		'slug'   => 'component-smoke-annual-gala',
	)
);
kpf_component_assert(! is_wp_error($child), 'Editors can create a nested component group');
if (! is_wp_error($child)) {
	$child_term = get_term((int) $child['term_id'], Groups::TAXONOMY);
	kpf_component_assert(
		(int) $child_term->parent === (int) $actions->term_id,
		'Nested group keeps its selected parent'
	);
	wp_delete_term((int) $child['term_id'], Groups::TAXONOMY);
}

$patterns = get_posts(
	array(
		'post_type'      => 'wp_block',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'post_name__in'  => array(
			'kpf-donation-call-to-action',
			'kpf-frequently-asked-questions',
			'kpf-featured-story-card',
			'kpf-important-notice',
		),
	)
);
kpf_component_assert(count($patterns) === 4, 'Four editable starter components exist');

foreach ($patterns as $pattern) {
	$groups = wp_get_object_terms($pattern->ID, Groups::TAXONOMY, array( 'fields' => 'slugs' ));
	kpf_component_assert(
		! is_wp_error($groups) && count($groups) === 1,
		"Starter component {$pattern->post_name} belongs to one group"
	);
	kpf_component_assert(
		'unsynced' === get_post_meta($pattern->ID, 'wp_pattern_sync_status', true),
		"Starter component {$pattern->post_name} inserts as an independent copy"
	);
}

$disclosure = '<!-- wp:kpf/disclosure {"summary":"Who can participate?","openInitially":true} --><details class="wp-block-kpf-disclosure kpf-disclosure" open><summary class="kpf-disclosure__summary">Who can participate?</summary><div class="kpf-disclosure__content"><!-- wp:paragraph --><p>Everyone is welcome.</p><!-- /wp:paragraph --></div></details><!-- /wp:kpf/disclosure -->';
$parsed_disclosure = parse_blocks($disclosure);
kpf_component_assert(
	'kpf/disclosure' === ($parsed_disclosure[0]['blockName'] ?? ''),
	'Disclosure serialization parses as the custom block'
);
kpf_component_assert(
	! empty($parsed_disclosure[0]['attrs']['openInitially']),
	'Disclosure preserves the open-initially control'
);
$rendered_disclosure = do_blocks($disclosure);
kpf_component_assert(
	str_contains($rendered_disclosure, '<details') &&
	str_contains($rendered_disclosure, '<summary') &&
	str_contains($rendered_disclosure, 'Everyone is welcome.'),
	'Disclosure renders native keyboard-accessible details and summary markup'
);

$external_button = '<!-- wp:kpf/button {"text":"Visit partner","url":"https://example.org","opensInNewTab":true} --><div class="wp-block-kpf-button kpf-button kpf-button--primary kpf-button--medium has-text-align-left"><a class="kpf-button__link" href="https://example.org" target="_blank" rel="noopener noreferrer"><span class="kpf-button__label">Visit partner</span></a></div><!-- /wp:kpf/button -->';
$rendered_button = do_blocks($external_button);
kpf_component_assert(
	str_contains($rendered_button, 'target="_blank"') &&
	str_contains($rendered_button, 'rel="noopener noreferrer"'),
	'External buttons include safe new-tab attributes'
);

$container = '<!-- wp:kpf/container {"tagName":"section","theme":"paper","padding":"large"} --><section class="wp-block-kpf-container kpf-container kpf-container--paper kpf-container--pad-large"><!-- wp:paragraph --><p>Nested content.</p><!-- /wp:paragraph --><!-- wp:kpf/button {"text":"Inside container"} --><div class="wp-block-kpf-button kpf-button kpf-button--primary kpf-button--medium has-text-align-left"><a class="kpf-button__link"><span class="kpf-button__label">Inside container</span></a></div><!-- /wp:kpf/button --></section><!-- /wp:kpf/container -->';
$parsed_container = parse_blocks($container);
kpf_component_assert(
	'kpf/container' === ($parsed_container[0]['blockName'] ?? ''),
	'Container serialization parses as the custom block'
);
kpf_component_assert(
	'section' === ($parsed_container[0]['attrs']['tagName'] ?? ''),
	'Container preserves the chosen HTML element'
);
$rendered_container = do_blocks($container);
kpf_component_assert(
	str_contains($rendered_container, '<section') &&
	str_contains($rendered_container, 'kpf-container--paper') &&
	str_contains($rendered_container, 'Nested content.') &&
	str_contains($rendered_container, 'Inside container'),
	'Container renders as a section wrapper with nested blocks'
);

$rest_request  = new WP_REST_Request('GET', '/wp/v2/' . Groups::TAXONOMY);
$rest_response = rest_do_request($rest_request);
kpf_component_assert(
	200 === $rest_response->get_status(),
	'Component Group hierarchy is readable through REST'
);

$_GET = array();
ob_start();
Admin::render();
$manager_html = (string) ob_get_clean();
kpf_component_assert(
	str_contains($manager_html, 'kpf_import=1') &&
	str_contains($manager_html, 'Create from upload'),
	'Component manager links to the visual file importer'
);
kpf_component_assert(
	str_contains($manager_html, 'name="global"') &&
	str_contains($manager_html, 'Globals: Header'),
	'Component manager exposes a Globals filter'
);

$behavior = Globals::sanitize_behavior(
	array(
		'mode'              => 'sticky-hide-reveal',
		'retractDelayMs'    => 5000,
		'scrollThresholdPx' => -3,
		'overlayHero'       => '1',
		'zIndex'            => 20,
	),
	'header'
);
kpf_component_assert(
	'sticky-hide-reveal' === $behavior['mode'] &&
	2000 === $behavior['retractDelayMs'] &&
	0 === $behavior['scrollThresholdPx'] &&
	true === $behavior['overlayHero'],
	'Header behavior meta is sanitized and clamped'
);

$footer_behavior = Globals::sanitize_behavior(
	array(
		'mode'      => 'sticky-bottom',
		'fullWidth' => false,
	),
	'footer'
);
kpf_component_assert(
	'sticky-bottom' === $footer_behavior['mode'] &&
	false === $footer_behavior['fullWidth'],
	'Footer behavior meta preserves sticky-bottom and contained layout'
);

$header_a = wp_insert_post(
	array(
		'post_type'    => 'wp_block',
		'post_status'  => 'publish',
		'post_title'   => 'Smoke Header A',
		'post_content' => '<!-- wp:paragraph --><p>Header A</p><!-- /wp:paragraph -->',
	),
	true
);
$header_b = wp_insert_post(
	array(
		'post_type'    => 'wp_block',
		'post_status'  => 'publish',
		'post_title'   => 'Smoke Header B',
		'post_content' => '<!-- wp:paragraph --><p>Header B</p><!-- /wp:paragraph -->',
	),
	true
);
$draft_header = wp_insert_post(
	array(
		'post_type'    => 'wp_block',
		'post_status'  => 'draft',
		'post_title'   => 'Smoke Header Draft',
		'post_content' => '<!-- wp:paragraph --><p>Draft header</p><!-- /wp:paragraph -->',
	),
	true
);

kpf_component_assert(
	! is_wp_error( $header_a ) && ! is_wp_error( $header_b ) && ! is_wp_error( $draft_header ),
	'Global role smoke fixtures can be created'
);

if ( ! is_wp_error( $header_a ) && ! is_wp_error( $header_b ) && ! is_wp_error( $draft_header ) ) {
	update_post_meta( (int) $header_a, Globals::ROLE_META, 'header' );
	update_post_meta( (int) $header_a, Globals::BEHAVIOR_META, Globals::default_behavior( 'header' ) );
	Globals::sync_role_map( (int) $header_a, get_post( (int) $header_a ) );

	update_post_meta( (int) $header_b, Globals::ROLE_META, 'header' );
	update_post_meta( (int) $header_b, Globals::BEHAVIOR_META, Globals::default_behavior( 'header' ) );
	Globals::sync_role_map( (int) $header_b, get_post( (int) $header_b ) );

	kpf_component_assert(
		Globals::ROLE_NONE === Globals::get_role( (int) $header_a ) &&
		(int) $header_b === Globals::get_published_id( 'header' ),
		'Assigning a new header clears the previous published assignment'
	);

	update_post_meta( (int) $draft_header, Globals::ROLE_META, 'header' );
	Globals::sync_role_map( (int) $draft_header, get_post( (int) $draft_header ) );
	kpf_component_assert(
		(int) $header_b === Globals::get_published_id( 'header' ),
		'Draft global headers are not resolved for the front end'
	);

	$resolved = Globals::resolve_role( 'header' );
	kpf_component_assert(
		is_array( $resolved ) &&
		str_contains( (string) ( $resolved['html'] ?? '' ), 'Header B' ),
		'Published header HTML is rendered through do_blocks'
	);

	wp_set_current_user( 0 );
	kpf_component_assert(
		! Globals::can_assign_role(),
		'Anonymous users cannot assign global component roles'
	);
	wp_set_current_user( 1 );
	kpf_component_assert(
		Globals::can_assign_role(),
		'Administrators can assign global component roles'
	);

	$_GET = array( 'page' => 'kpf-components', 'global' => 'header' );
	ob_start();
	Admin::render();
	$filtered_html = (string) ob_get_clean();
	kpf_component_assert(
		str_contains( $filtered_html, 'kpf-component-badge--header' ) &&
		str_contains( $filtered_html, 'Smoke Header B' ),
		'Component manager badges published Header roles'
	);

	wp_delete_post( (int) $header_a, true );
	wp_delete_post( (int) $header_b, true );
	wp_delete_post( (int) $draft_header, true );
	delete_option( Globals::MAP_OPTION );
}

if ($GLOBALS['kpf_component_failures'] > 0) {
	echo "Completed with {$GLOBALS['kpf_component_failures']} failure(s).\n";
	exit(1);
}

echo "All reusable component smoke tests passed.\n";

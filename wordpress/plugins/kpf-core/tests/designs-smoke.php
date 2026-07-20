<?php
/**
 * Smoke tests for assignable Page Designs.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/designs-smoke.php
 */

use KPF\Core\Designs\Admin;
use KPF\Core\Designs\ContentType;
use KPF\Core\Designs\GraphQL;
use KPF\Core\Designs\Meta;
use KPF\Core\Designs\Placeholders;

$GLOBALS['kpf_design_failures'] = 0;

function kpf_design_assert( bool $condition, string $message ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_design_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user( 1 );

$original_history_limit = get_option( Meta::HISTORY_OPTION, null );
Meta::set_history_limit( 3 );
kpf_design_assert( 3 === Meta::history_limit(), 'Design history retention is configurable' );

$post_type = get_post_type_object( ContentType::POST_TYPE );
kpf_design_assert( (bool) $post_type, 'Design post type is registered' );
kpf_design_assert( false === $post_type->show_ui, 'Design CPT UI is hidden (managed via Pages → Designs)' );
kpf_design_assert( current_user_can( 'manage_options' ), 'Administrator can manage designs' );
kpf_design_assert( post_type_supports( 'page', 'editor' ), 'Pages keep editor support for GraphQL content fields' );
kpf_design_assert( post_type_supports( 'post', 'editor' ), 'Blog posts keep the written body editor' );
kpf_design_assert( post_type_supports( 'page', 'excerpt' ), 'Pages keep excerpt support for SEO' );

$clean = Meta::sanitize_design(
	array(
		'html_filename' => 'layout.html',
		'html'          => '<main onclick="alert(1)"><h1>{{page.title}}</h1><script>alert(1)</script>{{{page.content}}}</main>',
		'css_filename'  => 'layout.css',
		'css'           => '@import "https://bad.example/x.css"; main { color: red; }',
	)
);
kpf_design_assert( ! str_contains( $clean['html'], '<script' ), 'Scripts are removed from HTML templates' );
kpf_design_assert( ! str_contains( $clean['html'], 'onclick' ), 'Event handlers are removed from HTML templates' );
kpf_design_assert( str_contains( $clean['html'], '{{{page.content}}}' ), 'Page-content placeholder is preserved' );
kpf_design_assert( ! str_contains( $clean['css'], '@import' ), 'CSS imports are removed' );
kpf_design_assert( ! isset( $clean['type'] ), 'Design metadata no longer stores a design type' );

$attribute_template = Meta::sanitize_design(
	array(
		'html' => '<a href="{{page.link}}"><img src="{{page.featuredImage.url}}" alt="{{page.featuredImage.alt}}"></a>',
	)
);
kpf_design_assert(
	str_contains( $attribute_template['html'], '{{page.link}}' ) &&
	str_contains( $attribute_template['html'], '{{page.featuredImage.url}}' ),
	'URL placeholders survive server-side HTML sanitization'
);

$svg_template = Meta::sanitize_design(
	array(
		'html_filename' => 'illustration.html',
		'html'          => '<svg viewBox="0 0 100 100" onload="alert(1)"><defs><linearGradient id="wash"><stop offset="100%" stop-color="#fff"/></linearGradient></defs><path id="line" d="M0 0 L100 100" fill="none" stroke="url(#wash)" stroke-width="4"/><foreignObject><script>alert(1)</script></foreignObject></svg>',
	)
);
kpf_design_assert( 'illustration.html' === $svg_template['html_filename'], 'HTML design filenames are accepted' );
kpf_design_assert( str_contains( $svg_template['html'], '<svg' ), 'Inline SVG markup is preserved inside HTML designs' );
kpf_design_assert( str_contains( $svg_template['html'], '<path' ), 'SVG path markup is preserved' );
kpf_design_assert( str_contains( strtolower( $svg_template['html'] ), '<lineargradient' ), 'SVG definitions are preserved' );
kpf_design_assert( ! str_contains( $svg_template['html'], 'onload' ), 'SVG event handlers are removed' );
kpf_design_assert( ! str_contains( strtolower( $svg_template['html'] ), '<foreignobject' ), 'SVG foreignObject content is removed' );
kpf_design_assert( ! str_contains( strtolower( $svg_template['html'] ), '<script' ), 'SVG scripts are removed' );

$rejected_svg_file = Meta::sanitize_design(
	array(
		'html_filename' => 'illustration.svg',
		'html'          => '<svg viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg>',
	)
);
kpf_design_assert( '' === $rejected_svg_file['html_filename'], 'Standalone SVG files are rejected as page designs' );

$fields = Meta::sanitize_fields(
	array(
		array( 'key' => 'Hero Heading', 'value' => 'Welcome' ),
		array( 'key' => 'hero_heading', 'value' => 'Duplicate' ),
		array( 'key' => 'cta', 'value' => 'Donate' ),
	)
);
kpf_design_assert( 2 === count( $fields ), 'Custom design fields normalize keys and remove duplicates' );
kpf_design_assert( 'hero_heading' === $fields[0]['key'], 'Custom field keys are placeholder-safe' );
kpf_design_assert( count( Placeholders::all() ) >= 20, 'Placeholder registry includes standard page data' );
$placeholder_groups = array_unique( array_column( Placeholders::all(), 'group' ) );
kpf_design_assert( in_array( 'seo_patterns', $placeholder_groups, true ), 'Placeholder library includes SEO %% patterns section' );
$seo_pattern_tokens = array_column( Placeholders::seo_pattern_items(), 'token' );
kpf_design_assert( in_array( '%%focuskw%%', $seo_pattern_tokens, true ), 'SEO patterns include %%focuskw%%' );
kpf_design_assert( in_array( '%%category%%', $seo_pattern_tokens, true ), 'SEO patterns include %%category%%' );

$page_id = wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_title'   => 'Design smoke page',
		'post_content' => '<p>Smoke content</p>',
		'post_status'  => 'publish',
	)
);
kpf_design_assert( is_int( $page_id ) && $page_id > 0, 'Test page can be created' );
kpf_design_assert( ! Meta::page_has_design( $page_id ), 'New pages start without a design' );

$design_id = Meta::ensure_page_design( $page_id );
kpf_design_assert( $design_id > 0, 'ensure_page_design creates a design record' );
kpf_design_assert(
	(int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true ) === $design_id,
	'Page stores the linked design ID'
);

update_post_meta( $design_id, Meta::DESIGN_META, $clean );
update_post_meta( $page_id, Meta::PAGE_FIELDS_META, $fields );
wp_update_post( array( 'ID' => $design_id, 'post_status' => 'publish' ) );

kpf_design_assert( Meta::page_has_design( $page_id ), 'page_has_design is true after HTML is saved' );

$urls = Admin::site_urls();
$matched = array_values(
	array_filter( $urls, static fn( array $row ): bool => (int) $row['id'] === $page_id )
);
kpf_design_assert( 1 === count( $matched ) && true === $matched[0]['ready'], 'Site URL list marks uploaded designs Ready' );

$resolved = GraphQL::resolve_design( $page_id );
kpf_design_assert( is_array( $resolved ) && $resolved['databaseId'] === $design_id, 'Published HTML design resolves' );
kpf_design_assert( str_contains( $resolved['html'], '{{page.title}}' ), 'GraphQL design preserves placeholders' );
kpf_design_assert( ! array_key_exists( 'type', $resolved ), 'GraphQL design payload has no type field' );

$editor_request = new WP_REST_Request( 'GET' );
$editor_request->set_param( 'id', $page_id );
$editor_response = KPF\Core\Designs\Rest::editor( $editor_request );
$editor_data = $editor_response instanceof WP_REST_Response ? $editor_response->get_data() : array();
kpf_design_assert(
	isset( $editor_data['revision'], $editor_data['html'] ) && str_contains( $editor_data['html'], '{{page.title}}' ),
	'Browser editor endpoint returns source and a revision token'
);

$save_request = new WP_REST_Request( 'POST' );
$save_request->set_param( 'id', $page_id );
$save_request->set_param( 'revision', $editor_data['revision'] ?? '' );
$save_request->set_param( 'html', '<main><h1>Updated copy</h1>{{{page.content}}}</main>' );
$save_request->set_param( 'css', 'main { color: green; }' );
$save_response = KPF\Core\Designs\Rest::save( $save_request );
$save_data = $save_response instanceof WP_REST_Response ? $save_response->get_data() : array();
kpf_design_assert(
	! is_wp_error( $save_response ) &&
	isset( $save_data['editor']['html'] ) &&
	str_contains( $save_data['editor']['html'], 'Updated copy' ),
	'Browser editor saves HTML and CSS source'
);

$newest_request = new WP_REST_Request( 'POST' );
$newest_request->set_param( 'id', $page_id );
$newest_request->set_param( 'revision', $save_data['editor']['revision'] ?? '' );
$newest_request->set_param( 'html', '<main><h1>Newest copy</h1>{{{page.content}}}</main>' );
$newest_request->set_param( 'css', 'main { color: blue; }' );
$newest_response = KPF\Core\Designs\Rest::save( $newest_request );
$newest_data = $newest_response instanceof WP_REST_Response ? $newest_response->get_data() : array();

$history_request = new WP_REST_Request( 'GET' );
$history_request->set_param( 'id', $page_id );
$history_response = KPF\Core\Designs\Rest::revisions( $history_request );
$history_data = $history_response instanceof WP_REST_Response ? $history_response->get_data() : array();
$updated_version = current(
	array_filter(
		$history_data['revisions'] ?? array(),
		static fn( array $version ): bool => str_contains( $version['summary'], 'Updated copy' )
	)
);
kpf_design_assert(
	! empty( $history_data['revisions'] ) && 3 === (int) $history_data['limit'],
	'Version history endpoint lists saved versions and the retention limit'
);

if ( is_array( $updated_version ) ) {
	$restore_request = new WP_REST_Request( 'POST' );
	$restore_request->set_param( 'id', $page_id );
	$restore_request->set_param( 'revision_id', $updated_version['id'] );
	$restore_request->set_param( 'revision', $newest_data['editor']['revision'] ?? '' );
	$restore_response = KPF\Core\Designs\Rest::restore_revision( $restore_request );
	$restore_data = $restore_response instanceof WP_REST_Response ? $restore_response->get_data() : array();
	kpf_design_assert(
		isset( $restore_data['editor']['html'] ) &&
		str_contains( $restore_data['editor']['html'], 'Updated copy' ),
		'An earlier design version can be restored'
	);
} else {
	kpf_design_assert( false, 'An earlier design version can be restored' );
}

$current_editor = $restore_data['editor'] ?? $newest_data['editor'] ?? array();
for ( $version_number = 1; $version_number <= 5; $version_number++ ) {
	$retention_request = new WP_REST_Request( 'POST' );
	$retention_request->set_param( 'id', $page_id );
	$retention_request->set_param( 'revision', $current_editor['revision'] ?? '' );
	$retention_request->set_param(
		'html',
		sprintf( '<main><h1>Retention version %d</h1></main>', $version_number )
	);
	$retention_request->set_param( 'css', '' );
	$retention_response = KPF\Core\Designs\Rest::save( $retention_request );
	if ( $retention_response instanceof WP_REST_Response ) {
		$retention_data = $retention_response->get_data();
		$current_editor = $retention_data['editor'] ?? $current_editor;
	}
}
$retained_response = KPF\Core\Designs\Rest::revisions( $history_request );
$retained_data = $retained_response instanceof WP_REST_Response ? $retained_response->get_data() : array();
kpf_design_assert(
	count( $retained_data['revisions'] ?? array() ) <= 3,
	'Old design versions are pruned to the configured retention limit'
);

$conflict_request = new WP_REST_Request( 'POST' );
$conflict_request->set_param( 'id', $page_id );
$conflict_request->set_param( 'revision', $editor_data['revision'] ?? '' );
$conflict_request->set_param( 'html', '<main>Stale edit</main>' );
$conflict_request->set_param( 'css', '' );
$conflict = KPF\Core\Designs\Rest::save( $conflict_request );
kpf_design_assert(
	is_wp_error( $conflict ) && 'kpf_design_edit_conflict' === $conflict->get_error_code(),
	'Browser editor rejects stale saves'
);

wp_update_post( array( 'ID' => $design_id, 'post_status' => 'draft' ) );
kpf_design_assert( null === GraphQL::resolve_design( $page_id ), 'Draft designs are not publicly resolved' );

$missing_html_request = new WP_REST_Request( 'POST' );
$missing_html_request->set_param( 'status', 'publish' );
$missing_html_request->set_param(
	'meta',
	array(
		Meta::DESIGN_META => array( 'html' => '' ),
	)
);
$validation = Meta::validate_rest_request( (object) array( 'ID' => 0 ), $missing_html_request );
kpf_design_assert(
	is_wp_error( $validation ) && 'kpf_design_html_required' === $validation->get_error_code(),
	'Publishing an empty HTML design is rejected'
);

wp_delete_post( $page_id, true );
wp_delete_post( $design_id, true );
if ( null === $original_history_limit ) {
	delete_option( Meta::HISTORY_OPTION );
} else {
	update_option( Meta::HISTORY_OPTION, $original_history_limit, false );
}

if ( $GLOBALS['kpf_design_failures'] > 0 ) {
	echo "Completed with {$GLOBALS['kpf_design_failures']} failure(s).\n";
	exit( 1 );
}

echo "All Page Designs smoke tests passed.\n";

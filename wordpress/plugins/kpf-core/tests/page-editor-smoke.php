<?php
/**
 * Smoke tests for the custom page editor.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/page-editor-smoke.php
 */

use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Pages\FieldDiscovery;
use KPF\Core\Pages\Rest as PagesRest;
use KPF\Core\Seo\MetaRepository;

$GLOBALS['kpf_page_editor_failures'] = 0;

function kpf_page_editor_assert( bool $condition, string $message ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}
	++$GLOBALS['kpf_page_editor_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user( 1 );

$discovered = FieldDiscovery::from_html(
	'<h1>{{fields.hero_heading}}</h1><p>{{{fields.intro_copy}}}</p><p>{{page.title}}</p><span>{{fields.hero_heading}}</span>'
);
kpf_page_editor_assert( 2 === count( $discovered ), 'Field discovery finds unique fields.* keys' );
kpf_page_editor_assert( 'hero_heading' === $discovered[0]['key'], 'First discovered key is hero_heading' );
kpf_page_editor_assert( 'Hero Heading' === $discovered[0]['label'], 'Labels are humanized from keys' );
kpf_page_editor_assert( 'intro_copy' === $discovered[1]['key'], 'Triple-brace field tokens are discovered' );

$page_id = wp_insert_post(
	array(
		'post_title'  => 'Page Editor Smoke',
		'post_status' => 'draft',
		'post_type'   => 'page',
	),
	true
);
kpf_page_editor_assert( ! is_wp_error( $page_id ) && $page_id > 0, 'Creates smoke page' );

$design_id = wp_insert_post(
	array(
		'post_title'  => 'Smoke Design',
		'post_status' => 'publish',
		'post_type'   => DesignsContentType::POST_TYPE,
	),
	true
);
kpf_page_editor_assert( ! is_wp_error( $design_id ) && $design_id > 0, 'Creates smoke design' );

update_post_meta(
	(int) $design_id,
	DesignsMeta::DESIGN_META,
	DesignsMeta::sanitize_design(
		array(
			'html_filename' => 'smoke.html',
			'html'          => '<main><h1>{{fields.hero_heading}}</h1><p>{{fields.subhead}}</p></main>',
			'css_filename'  => 'smoke.css',
			'css'           => 'main { color: #111; }',
		)
	)
);
update_post_meta( (int) $page_id, DesignsMeta::PAGE_DESIGN_META, (int) $design_id );

$get_request = new WP_REST_Request( 'GET', '/kpf-pages/v1/editor/' . $page_id );
$get_request->set_url_params( array( 'id' => (int) $page_id ) );
$get_response = PagesRest::get_editor( $get_request );
$get_data     = $get_response instanceof WP_REST_Response ? $get_response->get_data() : array();

kpf_page_editor_assert( (int) ( $get_data['id'] ?? 0 ) === (int) $page_id, 'Editor GET returns page payload' );
kpf_page_editor_assert( ! empty( $get_data['hasDesign'] ), 'Editor payload reports attached design' );
kpf_page_editor_assert(
	isset( $get_data['fieldSchema'][0]['key'] ) && 'hero_heading' === $get_data['fieldSchema'][0]['key'],
	'Editor payload includes discovered field schema'
);

$save_request = new WP_REST_Request( 'POST', '/kpf-pages/v1/editor/' . $page_id );
$save_request->set_url_params( array( 'id' => (int) $page_id ) );
$save_request->set_body_params(
	array(
		'title'           => 'Page Editor Smoke Updated',
		'slug'            => 'page-editor-smoke-updated',
		'status'          => 'publish',
		'excerpt'         => 'Short summary',
		'featuredImageId' => 0,
		'designId'        => (int) $design_id,
		'seo'             => array(
			'title_template'       => '%%title%% %%sep%% Custom',
			'description_template' => 'Custom description',
		),
		'fieldValues'     => array(
			'hero_heading' => 'Hello hero',
			'subhead'      => 'Hello subhead',
		),
	)
);
$save_response = PagesRest::save_editor( $save_request );
$save_data     = $save_response instanceof WP_REST_Response ? $save_response->get_data() : array();

kpf_page_editor_assert(
	'Page Editor Smoke Updated' === ( $save_data['title'] ?? '' ),
	'Editor SAVE updates title'
);
kpf_page_editor_assert(
	'page-editor-smoke-updated' === ( $save_data['slug'] ?? '' ),
	'Editor SAVE updates slug'
);
kpf_page_editor_assert(
	'Hello hero' === ( $save_data['fieldValues']['hero_heading'] ?? '' ),
	'Editor SAVE stores design field values'
);

$seo = MetaRepository::get( (int) $page_id );
kpf_page_editor_assert(
	'%%title%% %%sep%% Custom' === ( $seo['title_template'] ?? null ),
	'Editor SAVE stores SEO meta'
);

$replaced = false;
$post     = get_post( (int) $page_id );
if ( $post instanceof WP_Post ) {
	// Probe before load-post.php should claim replacement without printing HTML.
	$probe = (bool) apply_filters( 'replace_editor', false, $post );
	kpf_page_editor_assert( $probe, 'replace_editor is true for pages (early probe)' );

	// Real edit-screen pass prints the shell after admin chrome would load.
	do_action( 'load-post.php' );
	ob_start();
	$replaced = (bool) apply_filters( 'replace_editor', false, $post );
	$output   = ob_get_clean();
	kpf_page_editor_assert( $replaced, 'replace_editor is true for pages (edit screen)' );
	kpf_page_editor_assert(
		str_contains( $output, 'kpf-page-editor-root' ),
		'Custom page editor root is rendered'
	);
}

kpf_page_editor_assert( post_type_supports( 'page', 'editor' ), 'Pages keep editor support for GraphQL content fields' );
kpf_page_editor_assert( post_type_supports( 'post', 'editor' ), 'Blog posts keep the written body editor' );
kpf_page_editor_assert(
	(bool) apply_filters( 'replace_editor', false, $post ),
	'Pages open the custom page editor instead of Gutenberg'
);

if ( $page_id ) {
	wp_delete_post( (int) $page_id, true );
}
if ( $design_id ) {
	wp_delete_post( (int) $design_id, true );
}

if ( $GLOBALS['kpf_page_editor_failures'] > 0 ) {
	echo "Completed with {$GLOBALS['kpf_page_editor_failures']} failure(s).\n";
	exit( 1 );
}

echo "All page editor smoke tests passed.\n";

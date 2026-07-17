<?php
/**
 * Smoke tests for the KPF Scrapbook collection.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/scrapbook-smoke.php
 */

use KPF\Core\Scrapbook\ContentType;
use KPF\Core\Scrapbook\GraphQL;
use KPF\Core\Scrapbook\Meta;
use KPF\Core\Seo\Settings;

$GLOBALS['kpf_scrapbook_failures'] = 0;

function kpf_scrapbook_assert(bool $condition, string $message): void {
	if ($condition) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_scrapbook_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user(1);

kpf_scrapbook_assert(post_type_exists(ContentType::POST_TYPE), 'Scrapbook post type is registered');
kpf_scrapbook_assert(taxonomy_exists(ContentType::TAXONOMY), 'Decade taxonomy is registered');
kpf_scrapbook_assert(
	(bool) get_post_type_object(ContentType::POST_TYPE)->show_in_rest,
	'Scrapbook is available through REST'
);
kpf_scrapbook_assert(
	(bool) get_post_type_object(ContentType::POST_TYPE)->show_in_graphql,
	'Scrapbook is available through WPGraphQL'
);

$missing_image_request = new WP_REST_Request('POST', '/wp/v2/' . ContentType::POST_TYPE);
$missing_image_request->set_body_params(
	array(
		'title'  => 'Must not publish without an image',
		'status' => 'publish',
	)
);
$missing_image_response = rest_do_request($missing_image_request);
kpf_scrapbook_assert(
	$missing_image_response->get_status() === 400,
	'REST prevents publishing an item without an image'
);

$photo_clean = Meta::sanitize(
	array(
		'entry_type'     => 'photo',
		'date_precision' => 'year',
		'event_date'     => '2005',
		'images'         => array(
			array( 'attachment_id' => 101 ),
			array( 'attachment_id' => 102 ),
		),
	)
);
kpf_scrapbook_assert(count($photo_clean['images']) === 1, 'Single-photo entries keep exactly one image');
kpf_scrapbook_assert($photo_clean['event_date'] === '2005', 'Year-only historical date is accepted');

$invalid_date = Meta::sanitize(
	array(
		'entry_type'     => 'story',
		'date_precision' => 'exact',
		'event_date'     => '2005-99-99',
	)
);
kpf_scrapbook_assert($invalid_date['event_date'] === '', 'Invalid exact date is removed');

$png = base64_decode(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
);
$upload = wp_upload_bits('kpf-scrapbook-smoke.png', null, $png);
kpf_scrapbook_assert(empty($upload['error']), 'Test image is uploaded');

$attachment_id = 0;
if (empty($upload['error'])) {
	$attachment_id = wp_insert_attachment(
		array(
			'post_title'     => 'Scrapbook smoke image',
			'post_status'    => 'inherit',
			'post_mime_type' => 'image/png',
		),
		$upload['file']
	);
	if ($attachment_id && ! is_wp_error($attachment_id)) {
		update_post_meta($attachment_id, '_wp_attachment_image_alt', 'A tiny scrapbook test image');
	}
}
kpf_scrapbook_assert($attachment_id > 0 && wp_attachment_is_image($attachment_id), 'Image attachment is valid');

$invalid_date_request = new WP_REST_Request('POST', '/wp/v2/' . ContentType::POST_TYPE);
$invalid_date_request->set_body_params(
	array(
		'title'  => 'Must not save an invalid historical date',
		'status' => 'draft',
		'meta'   => array(
			Meta::META_KEY => array(
				'entry_type'     => 'photo',
				'date_precision' => 'exact',
				'event_date'     => '2005-99-99',
				'images'         => array(
					array( 'attachment_id' => $attachment_id ),
				),
			),
		),
	)
);
$invalid_date_response = rest_do_request($invalid_date_request);
kpf_scrapbook_assert(
	$invalid_date_response->get_status() === 400,
	'REST reports an invalid historical date instead of discarding it'
);

$details = Meta::sanitize(
	array(
		'entry_type'       => 'story',
		'date_precision'   => 'year',
		'event_date'       => '1998',
		'location'         => 'Troy, Michigan',
		'photographer'     => 'Test Photographer',
		'source'           => 'Test family album',
		'historical_notes' => 'Internal context for the photo.',
		'featured'         => true,
		'display_order'    => 3,
		'images'           => array(
			array(
				'attachment_id' => $attachment_id,
				'alt_text'      => '',
				'caption'       => 'Per-story caption',
			),
		),
	)
);

$create_request = new WP_REST_Request('POST', '/wp/v2/' . ContentType::POST_TYPE);
$create_request->set_body_params(
	array(
		'title'   => 'Scrapbook smoke story',
		'content' => 'A short test story.',
		'status'  => 'publish',
		'meta'    => array(
			Meta::META_KEY => $details,
		),
	)
);
$create_response = rest_do_request($create_request);
$create_data     = $create_response->get_data();
$post_id         = (int) ($create_data['id'] ?? 0);
kpf_scrapbook_assert(
	$create_response->get_status() === 201 && $post_id > 0,
	'Scrapbook item is created and published through REST'
);

kpf_scrapbook_assert(
	get_post_meta($post_id, Meta::ENTRY_TYPE_META, true) === 'story',
	'Entry type shadow metadata is synchronized'
);
kpf_scrapbook_assert(
	get_post_meta($post_id, Meta::FEATURED_META, true) === '1',
	'Featured shadow metadata is synchronized'
);
kpf_scrapbook_assert(
	(int) get_post_meta($post_id, Meta::DISPLAY_ORDER_META, true) === 3,
	'Display order shadow metadata is synchronized'
);

$resolved = GraphQL::details($post_id);
kpf_scrapbook_assert($resolved['entryType'] === 'story', 'GraphQL details expose entry type');
kpf_scrapbook_assert($resolved['location'] === 'Troy, Michigan', 'GraphQL details expose location');
kpf_scrapbook_assert(count($resolved['images']) === 1, 'GraphQL details expose ordered images');
kpf_scrapbook_assert(
	$resolved['images'][0]['altText'] === 'A tiny scrapbook test image',
	'Image alt text falls back to the Media Library'
);
kpf_scrapbook_assert(
	$resolved['images'][0]['caption'] === 'Per-story caption',
	'Per-story image caption overrides the Media Library'
);

$request  = new WP_REST_Request('GET', '/wp/v2/' . ContentType::POST_TYPE . '/' . $post_id);
$response = rest_do_request($request);
$rest_data= $response->get_data();
kpf_scrapbook_assert($response->get_status() === 200, 'REST item request succeeds');
kpf_scrapbook_assert(
	isset($rest_data['meta'][ Meta::META_KEY ]),
	'REST response contains structured Scrapbook metadata'
);
kpf_scrapbook_assert(
	isset($rest_data['scrapbookDetails']) &&
	$rest_data['scrapbookDetails']['location'] === 'Troy, Michigan',
	'REST response contains resolved typed Scrapbook details'
);

$assigned_terms = wp_get_object_terms($post_id, ContentType::TAXONOMY);
$decade_slug    = ! is_wp_error($assigned_terms) && $assigned_terms
	? (string) $assigned_terms[0]->slug
	: '';
kpf_scrapbook_assert($decade_slug === '1990', 'Historical year automatically assigns the 1990s decade');
$collection_request = new WP_REST_Request('GET', '/wp/v2/' . ContentType::POST_TYPE);
$collection_request->set_query_params(
	array(
		'entry_type' => 'story',
		'featured'   => 'true',
		'decade'     => $decade_slug,
		'orderby'    => 'display_order',
	)
);
$collection_response = rest_do_request($collection_request);
$collection_data     = $collection_response->get_data();
kpf_scrapbook_assert(
	$collection_response->get_status() === 200 &&
	is_array($collection_data) &&
	count($collection_data) === 1 &&
	(int) $collection_data[0]['id'] === $post_id,
	'REST collection filters and display ordering return the matching item'
);

$seo_settings = Settings::get();
kpf_scrapbook_assert(
	isset($seo_settings['post_types'][ ContentType::POST_TYPE ]),
	'SEO automatically discovers the Scrapbook content type'
);

if ($post_id && ! is_wp_error($post_id)) {
	wp_delete_post($post_id, true);
}
if ($attachment_id && ! is_wp_error($attachment_id)) {
	wp_delete_attachment($attachment_id, true);
}

if ($GLOBALS['kpf_scrapbook_failures'] > 0) {
	echo "Completed with {$GLOBALS['kpf_scrapbook_failures']} failure(s).\n";
	exit(1);
}

echo "All Scrapbook smoke tests passed.\n";

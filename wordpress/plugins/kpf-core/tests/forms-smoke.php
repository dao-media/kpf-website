<?php
/**
 * Smoke tests for the Forms builder CPT, meta, and REST.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/forms-smoke.php
 */

use KPF\Core\Forms\Catalog;
use KPF\Core\Forms\ContentType;
use KPF\Core\Forms\Definition;
use KPF\Core\Forms\Meta;
use KPF\Core\Forms\Rest;

$GLOBALS['kpf_forms_failures'] = 0;

function kpf_forms_assert( bool $condition, string $message ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}
	++$GLOBALS['kpf_forms_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user( 1 );

$post_type = get_post_type_object( ContentType::POST_TYPE );
kpf_forms_assert( (bool) $post_type, 'Form post type is registered' );
kpf_forms_assert( false === $post_type->show_ui, 'Form CPT UI is hidden (managed via Communications → Forms)' );

$clean = Meta::sanitize(
	array(
		'status'   => 'active',
		'settings' => array(
			'submitLabel'        => 'Send',
			'successMessage'     => 'Thanks!',
			'redirectUrl'        => 'https://example.org/thanks',
			'inboxFormName'     => 'Contact',
			'notificationEmails' => array( 'team@example.org', 'bad' ),
			'webhooks'           => array( 'https://hooks.example.org/form' ),
			'captchaMode'        => 'honeypot',
			'analytics'          => array(
				'eventName' => 'form_submit',
				'formTag'   => 'contact',
			),
			'evil'               => 'nope',
		),
		'rows'     => array(
			array(
				'id'      => 'row_1',
				'columns' => 2,
				'fields'  => array( 'field_a', 'field_b' ),
			),
		),
		'fields'   => array(
			'field_a' => array(
				'id'         => 'field_a',
				'type'       => 'email',
				'label'      => 'Email',
				'name'       => 'email',
				'required'   => true,
				'width'      => 'half',
				'conditions' => array(
					array(
						'id'     => 'cond_1',
						'action' => 'show',
						'match'  => 'all',
						'rules'  => array(
							array(
								'source'   => 'utm',
								'operator' => 'equals',
								'key'      => 'utm_source',
								'value'    => 'newsletter',
							),
						),
					),
				),
			),
			'field_b' => array(
				'id'    => 'field_b',
				'type'  => 'evil_type',
				'label' => 'Nope',
				'name'  => 'nope',
			),
		),
		'evil'     => 'strip-me',
	)
);

kpf_forms_assert( ! isset( $clean['evil'] ), 'Unknown definition keys are stripped' );
kpf_forms_assert( ! isset( $clean['settings']['evil'] ), 'Unknown settings keys are stripped' );
kpf_forms_assert( 'active' === $clean['status'], 'Status is retained' );
kpf_forms_assert( 'Contact' === $clean['settings']['inboxFormName'], 'Inbox form name is retained' );
kpf_forms_assert( array( 'team@example.org' ) === $clean['settings']['notificationEmails'], 'Invalid notification emails are dropped' );
kpf_forms_assert( ! empty( $clean['settings']['notifications']['enabled'] ), 'Notifications default to enabled when sanitized' );
kpf_forms_assert( array( 'team@example.org' ) === ( $clean['settings']['notifications']['emails'] ?? null ), 'Notification emails sync into nested settings' );
kpf_forms_assert( 'inline' === ( $clean['settings']['successDisplay'] ?? '' ), 'Success display defaults to inline' );

$with_receipt = Meta::sanitize(
	array(
		'settings' => array(
			'successDisplay' => 'toast',
			'notifications'  => array(
				'enabled' => true,
				'emails'  => array( 'ops@example.org' ),
				'subject' => 'Form ping',
			),
			'receipt'        => array(
				'enabled' => true,
				'subject' => 'Thanks',
				'message' => 'Hi {name} from {site}',
			),
		),
	)
);
kpf_forms_assert( 'toast' === ( $with_receipt['settings']['successDisplay'] ?? '' ), 'Toast success display is retained' );
kpf_forms_assert( true === ( $with_receipt['settings']['receipt']['enabled'] ?? false ), 'Receipt can be enabled' );
kpf_forms_assert( 'Hi {name} from {site}' === ( $with_receipt['settings']['receipt']['message'] ?? '' ), 'Receipt message is retained' );
kpf_forms_assert( isset( $clean['fields']['field_a'] ), 'Valid fields are retained' );
kpf_forms_assert( 'short_text' === ( $clean['fields']['field_b']['type'] ?? '' ), 'Unknown field types fall back to short_text' );
kpf_forms_assert( 'utm' === ( $clean['fields']['field_a']['conditions'][0]['rules'][0]['source'] ?? '' ), 'Condition sources are allowlisted' );
kpf_forms_assert( in_array( 'short_text', Catalog::field_type_ids(), true ), 'Field catalog includes short_text' );
kpf_forms_assert( isset( $clean['rows'][0]['slots'] ), 'Rows expose column slots' );
kpf_forms_assert(
	array( 'field_a' ) === ( $clean['rows'][0]['slots'][0] ?? null ),
	'Legacy two-column rows map first field into slot 0'
);
kpf_forms_assert(
	array( 'field_b' ) === ( $clean['rows'][0]['slots'][1] ?? null ),
	'Legacy two-column rows map second field into slot 1'
);

$stacked = Meta::sanitize(
	array(
		'rows'   => array(
			array(
				'id'      => 'row_stack',
				'columns' => 2,
				'slots'   => array(
					array( 'field_a', 'field_c' ),
					array( 'field_b' ),
				),
			),
		),
		'fields' => array(
			'field_a' => array( 'id' => 'field_a', 'type' => 'short_text', 'label' => 'A', 'name' => 'a' ),
			'field_b' => array( 'id' => 'field_b', 'type' => 'email', 'label' => 'B', 'name' => 'b' ),
			'field_c' => array( 'id' => 'field_c', 'type' => 'tel', 'label' => 'C', 'name' => 'c' ),
		),
	)
);
kpf_forms_assert(
	array( 'field_a', 'field_c' ) === ( $stacked['rows'][0]['slots'][0] ?? null ),
	'Column slots can hold multiple stacked fields'
);
kpf_forms_assert(
	array( 'field_a', 'field_c', 'field_b' ) === ( $stacked['rows'][0]['fields'] ?? null ),
	'Flattened fields list preserves slot order'
);

$form_id = wp_insert_post(
	array(
		'post_type'   => ContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => 'Contact form',
		'post_name'   => 'contact-smoke',
	),
	true
);
kpf_forms_assert( ! is_wp_error( $form_id ), 'Form CPT can be created' );
Meta::update( (int) $form_id, $clean );

$stored = Meta::get( (int) $form_id );
kpf_forms_assert( 'Contact' === ( $stored['settings']['inboxFormName'] ?? '' ), 'Form meta round-trips through storage' );

$payload = Definition::public_payload( (int) $form_id );
kpf_forms_assert( is_array( $payload ), 'Public payload resolves for active forms' );
kpf_forms_assert( 'contact-smoke' === ( $payload['slug'] ?? '' ), 'Public payload includes slug' );

$slugs = Definition::slugs_in_html( '<div>{{form:contact-smoke}} and {{form:missing}}</div>' );
kpf_forms_assert( array( 'contact-smoke' ) === array_values( array_intersect( $slugs, array( 'contact-smoke' ) ) ), 'Embed slugs are discovered in HTML' );
kpf_forms_assert( in_array( 'contact-smoke', $slugs, true ), 'Known form slug is discovered' );

do_action( 'rest_api_init', rest_get_server() );
$routes = rest_get_server()->get_routes();
kpf_forms_assert( isset( $routes[ '/' . Rest::NAMESPACE . '/forms' ] ), 'Forms REST index is registered' );
kpf_forms_assert( isset( $routes[ '/' . Rest::NAMESPACE . '/options' ] ), 'Forms REST options route is registered' );
kpf_forms_assert( isset( $routes[ '/' . Rest::NAMESPACE . '/cities' ] ), 'Public cities suggest route is registered' );

$captcha_defaults = \KPF\Core\Forms\Settings::defaults();
kpf_forms_assert( isset( $captcha_defaults['turnstile']['secret_key'] ), 'Forms settings include Turnstile secret key' );
kpf_forms_assert( isset( $captcha_defaults['recaptcha']['site_key'] ), 'Forms settings include reCAPTCHA site key' );
kpf_forms_assert( 'v2' === $captcha_defaults['recaptcha']['version'], 'reCAPTCHA defaults to v2' );

$available_before = \KPF\Core\Forms\Settings::available_captcha_modes();
kpf_forms_assert( in_array( 'honeypot', $available_before, true ), 'Honeypot is always available' );
kpf_forms_assert( ! in_array( 'recaptcha', $available_before, true ), 'reCAPTCHA is unavailable without keys' );

$sanitized_keys = \KPF\Core\Forms\Settings::sanitize(
	array(
		'turnstile' => array(
			'site_key'   => '1x00000000000000000000AA',
			'secret_key' => '1x0000000000000000000000000000000AA',
		),
		'recaptcha' => array(
			'site_key'   => 'bad key!',
			'secret_key' => '6LeTestSecretKeyValue0123456789',
			'version'    => 'v3',
			'min_score'  => 0.7,
		),
	)
);
kpf_forms_assert(
	'1x00000000000000000000AA' === $sanitized_keys['turnstile']['site_key'],
	'Turnstile site keys are retained when allowlisted'
);
kpf_forms_assert(
	'badkey' === $sanitized_keys['recaptcha']['site_key'],
	'Unsafe characters are stripped from captcha keys'
);
kpf_forms_assert( 'v3' === $sanitized_keys['recaptcha']['version'], 'reCAPTCHA version is retained' );

update_option( \KPF\Core\Forms\Settings::OPTION_KEY, $sanitized_keys, false );
$available_after = \KPF\Core\Forms\Settings::available_captcha_modes();
kpf_forms_assert( in_array( 'turnstile', $available_after, true ), 'Turnstile unlocks when keys are present' );
kpf_forms_assert( in_array( 'recaptcha', $available_after, true ), 'reCAPTCHA unlocks when keys are present' );
kpf_forms_assert(
	'honeypot' === \KPF\Core\Forms\Settings::coerce_captcha_mode( 'missing-provider' ),
	'Unavailable captcha modes coerce to honeypot'
);
delete_option( \KPF\Core\Forms\Settings::OPTION_KEY );

$create = new WP_REST_Request( 'POST', '/' . Rest::NAMESPACE . '/forms' );
$create->set_header( 'content-type', 'application/json' );
$create->set_body(
	(string) wp_json_encode(
		array(
			'title'      => 'Volunteer form',
			'slug'       => 'volunteer-smoke',
			'definition' => Meta::defaults(),
		)
	)
);
$created = rest_do_request( $create );
kpf_forms_assert( in_array( $created->get_status(), array( 200, 201 ), true ), 'Authenticated REST create succeeds' );
$created_body = $created->get_data();
$created_id   = (int) ( $created_body['id'] ?? 0 );
kpf_forms_assert( $created_id > 0, 'REST create returns a form id' );
kpf_forms_assert( '{{form:volunteer-smoke}}' === ( $created_body['embed'] ?? '' ), 'REST row includes embed token' );

if ( $form_id ) {
	wp_delete_post( (int) $form_id, true );
}
if ( $created_id ) {
	wp_delete_post( $created_id, true );
}

if ( $GLOBALS['kpf_forms_failures'] > 0 ) {
	echo "Completed with {$GLOBALS['kpf_forms_failures']} failure(s).\n";
	exit( 1 );
}

echo "All Forms smoke tests passed.\n";

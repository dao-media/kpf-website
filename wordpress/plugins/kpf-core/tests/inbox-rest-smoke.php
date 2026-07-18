<?php
/**
 * Smoke tests for the public headless form endpoint.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/inbox-rest-smoke.php
 */

use KPF\Core\Inbox\Forms;
use KPF\Core\Inbox\Rest;
use KPF\Core\Inbox\Settings;
use KPF\Core\Performance\Headers;

$GLOBALS['kpf_inbox_rest_failures'] = 0;

function kpf_inbox_rest_assert(bool $condition, string $message): void {
	if ($condition) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_inbox_rest_failures'];
	echo "FAIL: {$message}\n";
}

function kpf_inbox_rest_request(array $body): WP_REST_Response {
	$payload   = (string) wp_json_encode($body);
	$timestamp = time();
	$ip        = '192.0.2.45';
	$settings  = get_option('faustwp_settings', array());
	$secret    = is_array($settings) ? (string) ( $settings['secret_key'] ?? '' ) : '';
	$signature = hash_hmac(
		'sha256',
		$timestamp . '.' . $ip . '.' . hash('sha256', $payload),
		$secret
	);

	$request = new WP_REST_Request(
		'POST',
		'/' . Rest::NAMESPACE . Rest::ROUTE
	);
	$request->set_header('content-type', 'application/json');
	$request->set_header('user-agent', 'KPF Inbox smoke test');
	$request->set_header('x-kpf-client-ip', $ip);
	$request->set_header('x-kpf-form-timestamp', (string) $timestamp);
	$request->set_header('x-kpf-form-signature', $signature);
	$request->set_body($payload);
	return rest_do_request($request);
}

wp_set_current_user(0);
$_SERVER['REMOTE_ADDR'] = '192.0.2.45';

$original_settings = get_option(Settings::OPTION_KEY, array());
$test_settings     = Settings::all();
$test_settings['notifications']['notify_forms'] = false;
$test_settings['forms']['store_ip'] = true;
$test_settings['forms']['rate_limit_count'] = 100;
$test_settings['forms']['rate_limit_window_minutes'] = 1;
update_option(Settings::OPTION_KEY, Settings::sanitize($test_settings), false);

do_action('rest_api_init', rest_get_server());

$route = '/' . Rest::NAMESPACE . Rest::ROUTE;
kpf_inbox_rest_assert(
	isset(rest_get_server()->get_routes()[ $route ]),
	'Public form submission route is registered'
);

$unsigned = new WP_REST_Request('POST', $route);
$unsigned->set_header('content-type', 'application/json');
$unsigned->set_body((string) wp_json_encode(array( 'email' => 'visitor@example.org', 'message' => 'Hello' )));
kpf_inbox_rest_assert(
	403 === rest_do_request($unsigned)->get_status(),
	'Direct unsigned submissions are rejected'
);

$before = (int) wp_count_posts(Forms::POST_TYPE)->publish;
$valid  = kpf_inbox_rest_request(
	array(
		'form_name' => 'Website contact',
		'name'      => 'Test <b>Visitor</b>',
		'email'     => 'visitor@example.org',
		'phone'     => '(555) 555-0100',
		'subject'   => 'REST smoke test',
		'message'   => "Hello from the website.\n<script>alert('no')</script>",
		'fields'    => array(
			'Interest' => 'Volunteer',
		),
		'website'   => '',
	)
);

kpf_inbox_rest_assert(201 === $valid->get_status(), 'Valid form data returns HTTP 201');
kpf_inbox_rest_assert(
	'no-store' === $valid->get_headers()['Cache-Control'],
	'Submission responses are never cached'
);
kpf_inbox_rest_assert(
	$before + 1 === (int) wp_count_posts(Forms::POST_TYPE)->publish,
	'Valid form data creates one Inbox submission'
);

$created = get_posts(
	array(
		'post_type'      => Forms::POST_TYPE,
		'post_status'    => 'publish',
		'posts_per_page' => 1,
		'orderby'        => 'ID',
		'order'          => 'DESC',
	)
);
$created_id = (int) ( $created[0]->ID ?? 0 );
if ($created_id) {
	$meta = Forms::get_meta($created_id);
	$post = get_post($created_id);
	kpf_inbox_rest_assert('Test Visitor' === $meta['name'], 'Submitter name is sanitized');
	kpf_inbox_rest_assert('Volunteer' === $meta['fields']['Interest'], 'Additional fields are stored');
	kpf_inbox_rest_assert('192.0.2.45' === $meta['ip'], 'IP storage follows Inbox settings');
	kpf_inbox_rest_assert(
		$post && ! str_contains($post->post_content, '<script'),
		'Executable markup is removed from messages'
	);
}

$invalid_before = (int) wp_count_posts(Forms::POST_TYPE)->publish;
$invalid        = kpf_inbox_rest_request(
	array(
		'email'   => 'not-an-email',
		'message' => 'This should fail.',
	)
);
kpf_inbox_rest_assert(400 === $invalid->get_status(), 'Invalid email is rejected');
kpf_inbox_rest_assert(
	$invalid_before === (int) wp_count_posts(Forms::POST_TYPE)->publish,
	'Invalid form data is not stored'
);

$honeypot = kpf_inbox_rest_request(
	array(
		'website' => 'https://spam.example',
	)
);
kpf_inbox_rest_assert(202 === $honeypot->get_status(), 'Honeypot submissions receive an opaque success');
kpf_inbox_rest_assert(
	$invalid_before === (int) wp_count_posts(Forms::POST_TYPE)->publish,
	'Honeypot submissions do not create Inbox entries'
);

$unsupported = kpf_inbox_rest_request(
	array(
		'email'      => 'visitor@example.org',
		'message'    => 'Hello',
		'admin_only' => true,
	)
);
kpf_inbox_rest_assert(400 === $unsupported->get_status(), 'Unknown payload fields are rejected');

$write_request  = new WP_REST_Request('POST', '/test/write');
$write_response = Headers::rest_headers(new WP_REST_Response(array(), 200), rest_get_server(), $write_request);
kpf_inbox_rest_assert(
	'no-store' === $write_response->get_headers()['Cache-Control'],
	'Global performance headers never cache REST writes'
);

if ($created_id) {
	wp_delete_post($created_id, true);
}

if (is_array($original_settings)) {
	update_option(Settings::OPTION_KEY, $original_settings, false);
} else {
	delete_option(Settings::OPTION_KEY);
}

if ($GLOBALS['kpf_inbox_rest_failures'] > 0) {
	echo "Completed with {$GLOBALS['kpf_inbox_rest_failures']} failure(s).\n";
	exit(1);
}

echo "All Inbox REST smoke tests passed.\n";

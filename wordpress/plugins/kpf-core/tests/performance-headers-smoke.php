<?php
/**
 * REST Cache-Control: never public for auth, 4xx, or kpf-* admin routes.
 *
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/performance-headers-smoke.php
 */

use KPF\Core\Performance\Headers;

$failures = 0;

function kpf_headers_assert( bool $condition, string $message ): void {
	global $failures;
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}
	++$failures;
	echo "FAIL: {$message}\n";
}

function kpf_headers_cc( \WP_REST_Response $result ): string {
	$headers = $result->get_headers();
	foreach ( $headers as $name => $value ) {
		if ( 0 === strcasecmp( (string) $name, 'Cache-Control' ) ) {
			if ( is_array( $value ) ) {
				$value = reset( $value );
			}
			return (string) $value;
		}
	}
	return '';
}

function kpf_headers_apply( string $method, string $route, int $status, array $headers = array() ): \WP_REST_Response {
	$request = new WP_REST_Request( $method, $route );
	foreach ( $headers as $name => $value ) {
		$request->set_header( $name, $value );
	}
	$result = new WP_REST_Response( array( 'ok' => true ), $status );
	return Headers::rest_headers( $result, rest_get_server(), $request );
}

wp_set_current_user( 0 );

$public = kpf_headers_apply( 'GET', '/kpf-stylesheet/v1/public', 200 );
$public_cc = kpf_headers_cc( $public );
kpf_headers_assert(
	str_contains( $public_cc, 'public' ) || '' === $public_cc,
	'Anonymous GET of public stylesheet may stay public (or unset when TTL is 0)'
);
kpf_headers_assert(
	! str_contains( $public_cc, 'no-store' ),
	'Anonymous public stylesheet is not forced no-store'
);

$editor = kpf_headers_apply( 'GET', '/kpf-pages/v1/editor/1', 200 );
kpf_headers_assert(
	'no-store' === kpf_headers_cc( $editor ),
	'Anonymous 200 on kpf-pages editor is no-store'
);

$forms = kpf_headers_apply( 'GET', '/kpf-forms/v1/forms', 200 );
kpf_headers_assert(
	'no-store' === kpf_headers_cc( $forms ),
	'kpf-forms GET is no-store even at 200'
);

$denied = kpf_headers_apply( 'GET', '/kpf-stylesheet/v1/public', 401 );
kpf_headers_assert(
	'no-store' === kpf_headers_cc( $denied ),
	'401 responses are no-store'
);

$nonce = kpf_headers_apply(
	'GET',
	'/kpf-stylesheet/v1/public',
	200,
	array( 'X-WP-Nonce' => 'not-a-real-nonce' )
);
kpf_headers_assert(
	'no-store' === kpf_headers_cc( $nonce ),
	'X-WP-Nonce on REST GET is no-store'
);

$authz = kpf_headers_apply(
	'GET',
	'/kpf-stylesheet/v1/public',
	200,
	array( 'Authorization' => 'Bearer test' )
);
kpf_headers_assert(
	'no-store' === kpf_headers_cc( $authz ),
	'Authorization header on REST GET is no-store'
);

wp_set_current_user( 1 );
$logged_in = kpf_headers_apply( 'GET', '/kpf-stylesheet/v1/public', 200 );
kpf_headers_assert(
	'no-store' === kpf_headers_cc( $logged_in ),
	'Logged-in REST GET is no-store'
);
wp_set_current_user( 0 );

kpf_headers_assert(
	Headers::is_kpf_admin_route( '/kpf-pages/v1/editor/12' ),
	'Page editor route is classified as kpf admin'
);
kpf_headers_assert(
	! Headers::is_kpf_admin_route( '/kpf-stylesheet/v1/public' ),
	'Public stylesheet route is not kpf admin'
);
kpf_headers_assert(
	! Headers::is_kpf_admin_route( '/kpf-performance/v1/public/stats' ),
	'Public performance suffix is not kpf admin'
);

kpf_headers_assert(
	Headers::is_excluded_rest_path(
		'/kpf-stylesheet/v1/public',
		array( 'pages' => array( 'exclude_paths' => "/wp-json/\n" ) )
	),
	'exclude_paths /wp-json/ matches REST routes'
);
kpf_headers_assert(
	! Headers::is_excluded_rest_path(
		'/kpf-stylesheet/v1/public',
		array( 'pages' => array( 'exclude_paths' => "/wp-admin/\n/wp-login.php\n" ) )
	),
	'aggressive /wp-admin/ exclude does not blanket REST'
);

if ( $failures > 0 ) {
	echo "Completed with {$failures} failure(s).\n";
	exit( 1 );
}

echo "performance-headers-smoke: OK\n";

<?php
/**
 * Smoke tests for the Code snippets manager.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/code-smoke.php
 */

use KPF\Core\Code\ContentType;
use KPF\Core\Code\GraphQL;
use KPF\Core\Code\Matching;
use KPF\Core\Code\Meta;

$failures = 0;
$assert   = static function ( bool $condition, string $message ) use ( &$failures ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}
	++$failures;
	echo "FAIL: {$message}\n";
};

wp_set_current_user( 1 );

$assert( (bool) get_post_type_object( ContentType::POST_TYPE ), 'Code post type is registered' );

$clean = Meta::sanitize(
	array(
		'location' => 'footer',
		'type'     => 'js',
		'code'     => "console.log('kpf');",
		'scope'    => 'urls',
		'urls'     => array( '/about', '/blog/*', 'https://example.com/donate/' ),
	)
);
$assert( 'footer' === $clean['location'], 'Location is sanitized' );
$assert( 'js' === $clean['type'], 'Type is sanitized' );
$assert( 'urls' === $clean['scope'], 'Scope is sanitized' );
$assert( 3 === count( $clean['urls'] ), 'URL patterns are preserved' );
$assert(
	"console.log('kpf');" === $clean['code'],
	'Trusted code body is preserved'
);

$assert( '/about' === Matching::normalize_path( 'https://example.com/about/' ), 'Paths normalize from full URLs' );
$assert( Matching::path_matches( '/blog/hello', array( '/blog/*' ) ), 'Wildcard path matching works' );
$assert( ! Matching::path_matches( '/events', array( '/blog/*' ) ), 'Unrelated paths do not match' );
$assert(
	Matching::snippet_applies( array( 'scope' => 'global', 'urls' => array() ), '/x' ),
	'Global snippets apply everywhere'
);
$assert(
	! Matching::snippet_applies(
		array(
			'scope' => 'urls',
			'urls'  => array( '/donate' ),
		),
		'/about'
	),
	'URL-scoped snippets respect patterns'
);

$post_id = wp_insert_post(
	array(
		'post_type'   => ContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => 'Code smoke snippet',
	),
	true
);
$assert( ! is_wp_error( $post_id ) && $post_id > 0, 'Code snippet post can be created' );

if ( ! is_wp_error( $post_id ) && $post_id > 0 ) {
	Meta::update(
		(int) $post_id,
		array(
			'location' => 'header',
			'type'     => 'css',
			'code'     => '.kpf-code-smoke{color:red;}',
			'scope'    => 'urls',
			'urls'     => array( '/smoke-path' ),
		)
	);

	$active_all = GraphQL::active_snippets( '' );
	$assert(
		1 === count(
			array_filter(
				$active_all,
				static fn( array $item ): bool => (int) $item['databaseId'] === (int) $post_id
			)
		),
		'Published snippet is available without path filter'
	);

	$active_match = GraphQL::active_snippets( '/smoke-path' );
	$assert(
		1 === count(
			array_filter(
				$active_match,
				static fn( array $item ): bool => (int) $item['databaseId'] === (int) $post_id
			)
		),
		'Published snippet matches its URL path'
	);

	$active_miss = GraphQL::active_snippets( '/other' );
	$assert(
		0 === count(
			array_filter(
				$active_miss,
				static fn( array $item ): bool => (int) $item['databaseId'] === (int) $post_id
			)
		),
		'Published snippet is excluded for non-matching paths'
	);

	wp_update_post(
		array(
			'ID'          => (int) $post_id,
			'post_status' => 'draft',
		)
	);
	$assert(
		0 === count(
			array_filter(
				GraphQL::active_snippets( '/smoke-path' ),
				static fn( array $item ): bool => (int) $item['databaseId'] === (int) $post_id
			)
		),
		'Draft (inactive) snippets are excluded from the frontend'
	);

	wp_delete_post( (int) $post_id, true );
}

if ( $failures > 0 ) {
	echo "Completed with {$failures} failure(s).\n";
	exit( 1 );
}

echo "All Code snippet smoke tests passed.\n";

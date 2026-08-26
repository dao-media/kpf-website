<?php
/**
 * Smoke tests for the Stylesheet admin.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/stylesheet-smoke.php
 */

use KPF\Core\Stylesheet\ContentType;
use KPF\Core\Stylesheet\Defaults;
use KPF\Core\Stylesheet\GraphQL;
use KPF\Core\Stylesheet\Meta;
use KPF\Core\Stylesheet\Rest;

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

$post_id           = Meta::ensure_stylesheet();
$original_css      = Meta::get_css( $post_id );
$original_limit    = get_option( Meta::HISTORY_OPTION, Meta::HISTORY_DEFAULT );
$original_revisions = array_map( 'intval', array_keys( wp_get_post_revisions( $post_id ) ) );

$assert( $post_id > 0, 'Global stylesheet singleton exists' );
$assert( ContentType::POST_TYPE === get_post_type( $post_id ), 'Stylesheet uses the hidden content type' );

$foundation = Defaults::foundation_css();
$assert( str_contains( $foundation, '--kpf-parchment: #f4efea' ), 'Foundation CSS ships Option 3 parchment' );
$assert( str_contains( $foundation, '--kpf-ember: #bb0d0d' ), 'Foundation CSS ships Option 3 ember' );
$assert( str_contains( $foundation, '.kpf-h0' ), 'Foundation CSS defines H0 display style' );
$assert( str_contains( $foundation, '.kpf-btn--primary' ), 'Foundation CSS defines primary button states' );
$assert( str_contains( $foundation, 'rem' ), 'Foundation CSS uses rem units' );

$pages = Defaults::pages_css();
$assert( str_contains( $pages, Defaults::PAGES_MARKER ), 'Pages CSS includes layer marker' );
$assert( str_contains( $pages, '.kpf-header' ), 'Pages CSS defines site header contract' );
$assert( str_contains( $pages, '.kpf-mobile-nav' ), 'Pages CSS defines mobile nav contract' );
$assert( str_contains( $pages, '.kpf-hero' ), 'Pages CSS defines hero section contract' );
$assert( str_contains( $pages, '.kpf-u-container' ), 'Pages CSS defines layout utilities' );

$shipped = Defaults::css();
$assert( str_contains( $shipped, '.kpf-btn--primary' ), 'Shipped CSS includes foundation components' );
$assert( str_contains( $shipped, Defaults::PAGES_MARKER ), 'Shipped CSS includes pages layer' );

$sanitized = Meta::sanitize_css(
	'@import "https://bad.example/x.css"; .hero { color: red; behavior: url(test.htc); }'
);
$assert( ! str_contains( $sanitized, '@import' ), 'CSS imports are removed' );
$assert( ! str_contains( $sanitized, 'behavior' ), 'Executable CSS behavior is removed' );

Meta::set_history_limit( 3 );
$assert( 3 === Meta::history_limit(), 'Stylesheet history retention is configurable' );

$show      = Rest::show();
$show_data = $show instanceof WP_REST_Response ? $show->get_data() : array();
$assert( isset( $show_data['revision'] ), 'Editor payload includes an optimistic revision token' );

$first = new WP_REST_Request( 'POST' );
$first->set_param( 'css', '.kpf-smoke { color: #123456; }' );
$first->set_param( 'revision', $show_data['revision'] ?? '' );
$first_response = Rest::save( $first );
$first_data     = $first_response instanceof WP_REST_Response ? $first_response->get_data() : array();
$assert( str_contains( (string) ( $first_data['css'] ?? '' ), '#123456' ), 'Stylesheet can be saved' );

$second = new WP_REST_Request( 'POST' );
$second->set_param( 'css', '.kpf-smoke { color: #654321; }' );
$second->set_param( 'revision', $first_data['revision'] ?? '' );
$second_response = Rest::save( $second );
$second_data     = $second_response instanceof WP_REST_Response ? $second_response->get_data() : array();
$assert( str_contains( (string) ( $second_data['css'] ?? '' ), '#654321' ), 'A later stylesheet version can be saved' );
$assert( str_contains( GraphQL::resolve_css(), '#654321' ), 'GraphQL exposes the current stylesheet' );

$info = GraphQL::resolve_info();
$assert( is_array( $info ), 'GraphQL stylesheet info resolves to an array' );
$assert( isset( $info['css'], $info['foundation'], $info['pages'], $info['revision'], $info['hasPagesLayer'], $info['byteLength'], $info['href'] ), 'GraphQL stylesheet info includes layer fields' );
$assert( is_string( $info['href'] ) && str_contains( (string) $info['href'], '/kpf-stylesheet/v1/public' ), 'GraphQL stylesheet info exposes a public CSS href' );
$assert( Defaults::strip_pages_layer( (string) $info['css'] ) === Defaults::strip_pages_layer( GraphQL::resolve_css() ), 'Pages layer can be stripped for Faust delivery' );

$dup_pages = ".kpf-btn{color:red}\n\n/**\n * KPF Pages stylesheet — layout utilities, chrome, and page section contracts\n */\n.kpf-header{}\n\n/**\n * KPF Pages stylesheet — layout utilities, chrome, and page section contracts\n */\n.kpf-header{}";
$assert( '.kpf-btn{color:red}' === Defaults::strip_pages_layer( $dup_pages ), 'Duplicate pages headers strip from the first copy' );
$assert( str_contains( (string) $info['foundation'], '.kpf-btn--primary' ), 'GraphQL foundation layer ships component classes' );
$assert( str_contains( (string) $info['pages'], Defaults::PAGES_MARKER ), 'GraphQL pages layer includes pages marker' );
$assert( str_contains( (string) $info['pages'], '.kpf-header' ), 'GraphQL pages layer includes header contract' );
$assert( str_contains( (string) $info['css'], Defaults::PAGES_MARKER ), 'GraphQL combined css includes pages layer' );
$assert( true === (bool) $info['hasPagesLayer'], 'GraphQL reports hasPagesLayer' );
$assert( is_string( $info['revision'] ) && 64 === strlen( $info['revision'] ), 'GraphQL stylesheet revision is a SHA-256 hash' );

$without_pages = GraphQL::with_pages_layer( '.kpf-custom { color: red; }', Defaults::pages_css() );
$assert( str_contains( $without_pages, '.kpf-custom' ), 'with_pages_layer preserves custom CSS' );
$assert( str_contains( $without_pages, Defaults::PAGES_MARKER ), 'with_pages_layer appends pages marker' );

$history      = Rest::revisions()->get_data();
$revision_ids = array_map(
	static fn( array $item ): int => (int) $item['id'],
	(array) ( $history['revisions'] ?? array() )
);
$first_revision_id = 0;
foreach ( $revision_ids as $revision_id ) {
	if ( str_contains( Meta::get_css( $revision_id ), '#123456' ) ) {
		$first_revision_id = $revision_id;
		break;
	}
}
$assert( $first_revision_id > 0, 'Version history contains the earlier stylesheet' );

if ( $first_revision_id > 0 ) {
	$restore = new WP_REST_Request( 'POST' );
	$restore->set_param( 'revision_id', $first_revision_id );
	$restore->set_param( 'revision', $second_data['revision'] ?? '' );
	$restored      = Rest::restore( $restore );
	$restored_data = $restored instanceof WP_REST_Response ? $restored->get_data() : array();
	$assert(
		str_contains( (string) ( $restored_data['stylesheet']['css'] ?? '' ), '#123456' ),
		'An earlier stylesheet version can be restored'
	);
}

$stale = new WP_REST_Request( 'POST' );
$stale->set_param( 'css', '.stale { color: red; }' );
$stale->set_param( 'revision', 'stale-token' );
$stale_response = Rest::save( $stale );
$assert(
	is_wp_error( $stale_response ) && 'kpf_stylesheet_edit_conflict' === $stale_response->get_error_code(),
	'Stale stylesheet saves are rejected'
);

update_post_meta( $post_id, Meta::CSS_META, $original_css );
update_option( Meta::HISTORY_OPTION, $original_limit, false );
foreach ( array_keys( wp_get_post_revisions( $post_id ) ) as $revision_id ) {
	if ( ! in_array( (int) $revision_id, $original_revisions, true ) ) {
		wp_delete_post( (int) $revision_id, true );
	}
}

if ( $failures > 0 ) {
	echo "Completed with {$failures} failure(s).\n";
	exit( 1 );
}

echo "All global stylesheet smoke tests passed.\n";

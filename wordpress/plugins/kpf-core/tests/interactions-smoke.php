<?php
/**
 * Smoke tests for the GSAP interaction builder.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/interactions-smoke.php
 */

use KPF\Core\Interactions\ContentType;
use KPF\Core\Interactions\GraphQL;
use KPF\Core\Interactions\Meta;
use KPF\Core\Interactions\Rest;

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

$assert( (bool) get_post_type_object( ContentType::POST_TYPE ), 'Animation post type is registered' );

$clean = Meta::sanitize(
	array(
		'active'       => true,
		'selector'     => '.hero-title',
		'trigger'      => 'in-view',
		'method'       => 'keyframes',
		'ease'         => 'custom',
		'customBezier' => '0.17,0.67,0.83,0.67',
		'keyframes'    => array(
			array( 'duration' => 0.3, 'props' => array( 'y' => 30, 'opacity' => 0 ) ),
			array( 'duration' => 0.6, 'props' => array( 'y' => 0, 'opacity' => 1 ) ),
		),
		'svg'          => array(
			'effect'          => 'draw',
			'drawFrom'        => '0% 0%',
			'drawTo'          => '0% 100%',
			'transformOrigin' => '50% 50%',
		),
	)
);
$assert( '.hero-title' === $clean['selector'], 'CSS selector is preserved' );
$assert( 2 === count( $clean['keyframes'] ), 'Keyframes are sanitized and preserved' );
$assert( '0.17,0.67,0.83,0.67' === $clean['customBezier'], 'Custom bezier is preserved' );
$assert( 'draw' === $clean['svg']['effect'], 'SVG effect configuration is preserved' );
$assert(
	'' === Meta::sanitize( array( 'selector' => '.bad { color:red; }' ) )['selector'],
	'Unsafe selector syntax is rejected'
);

$child = Meta::sanitize(
	array(
		'selector'     => '.kpf-header__nav .kpf-nav-link',
		'animateChild' => '.kpf-nav-link__line',
		'trigger'      => 'hover',
		'method'       => 'fromTo',
		'from'         => array( 'scaleX' => 0, 'transformOrigin' => '50% 50%' ),
		'to'           => array( 'scaleX' => 1, 'transformOrigin' => '50% 50%' ),
	)
);
$assert( '.kpf-nav-link__line' === $child['animateChild'], 'animateChild selector is preserved' );
$assert( 0.0 === (float) $child['from']['scaleX'], 'scaleX from property is preserved' );
$assert( 1.0 === (float) $child['to']['scaleX'], 'scaleX to property is preserved' );
$assert(
	'' === Meta::sanitize( array( 'animateChild' => '.bad { color:red; }' ) )['animateChild'],
	'Unsafe animateChild selector is rejected'
);

$create = new WP_REST_Request( 'POST' );
$create->set_param( 'name', 'Hero entrance' );
$create->set_param( 'config', $clean );
$created = Rest::create( $create );
$data    = $created instanceof WP_REST_Response ? $created->get_data() : array();
$id      = (int) ( $data['id'] ?? 0 );
$assert( $id > 0, 'Animation can be created through REST' );

$active = GraphQL::active_animations();
$assert(
	1 === count( array_filter( $active, static fn( array $item ): bool => $item['databaseId'] === $id ) ),
	'Active animation is available to the frontend'
);

$clean['active'] = false;
$update = new WP_REST_Request( 'POST' );
$update->set_param( 'id', $id );
$update->set_param( 'name', 'Hero entrance' );
$update->set_param( 'config', $clean );
Rest::update( $update );
$assert(
	0 === count( array_filter( GraphQL::active_animations(), static fn( array $item ): bool => $item['databaseId'] === $id ) ),
	'Inactive animation is excluded from the frontend'
);

$delete = new WP_REST_Request( 'DELETE' );
$delete->set_param( 'id', $id );
Rest::delete( $delete );
$assert( null === get_post( $id ), 'Animation can be deleted' );

if ( $failures > 0 ) {
	echo "Completed with {$failures} failure(s).\n";
	exit( 1 );
}

echo "All GSAP interaction smoke tests passed.\n";

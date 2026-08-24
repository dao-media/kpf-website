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

$export_one = new WP_REST_Request( 'GET' );
$export_one->set_param( 'ids', (string) $id );
$one_doc = Rest::export( $export_one )->get_data();
$assert( Rest::EXPORT_KIND === ( $one_doc['kind'] ?? '' ), 'Export document uses the GSAP kind' );
$assert( 1 === Rest::EXPORT_VERSION, 'Export version constant is 1' );
$assert( 1 === count( $one_doc['animations'] ?? array() ), 'Export by id returns one animation' );
$assert( 'Hero entrance' === ( $one_doc['animations'][0]['name'] ?? '' ), 'Exported animation keeps its name' );

$export_all = Rest::export( new WP_REST_Request( 'GET' ) )->get_data();
$assert( is_array( $export_all['animations'] ?? null ), 'Export all returns an animations list' );
$assert(
	1 === count(
		array_filter(
			$export_all['animations'],
			static fn( array $item ): bool => ( $item['name'] ?? '' ) === 'Hero entrance'
		)
	),
	'Export all includes the created animation'
);

$import_name = 'Imported fade ' . wp_generate_uuid4();
$import_body = array(
	'kind'       => Rest::EXPORT_KIND,
	'version'    => Rest::EXPORT_VERSION,
	'animations' => array(
		array(
			'name'   => $import_name,
			'config' => array(
				'active'   => true,
				'selector' => '.kpf-import-smoke',
				'trigger'  => 'in-view',
				'method'   => 'to',
				'to'       => array( 'opacity' => 1 ),
			),
		),
	),
);
$import_create = new WP_REST_Request( 'POST' );
$import_create->set_param( 'kind', $import_body['kind'] );
$import_create->set_param( 'version', $import_body['version'] );
$import_create->set_param( 'animations', $import_body['animations'] );
$created_import = Rest::import( $import_create )->get_data();
$imported_id    = (int) ( $created_import['animations'][0]['id'] ?? 0 );
$assert( 1 === (int) ( $created_import['created'] ?? 0 ), 'Import creates a new animation' );
$assert( 0 === (int) ( $created_import['updated'] ?? 0 ), 'First import does not update' );
$assert( $imported_id > 0, 'Imported animation has an id' );

$import_update = new WP_REST_Request( 'POST' );
$import_update->set_param( 'kind', $import_body['kind'] );
$import_update->set_param( 'version', $import_body['version'] );
$import_update->set_param( 'animations', $import_body['animations'] );
$updated_import = Rest::import( $import_update )->get_data();
$assert( 0 === (int) ( $updated_import['created'] ?? -1 ), 'Re-import does not create a duplicate' );
$assert( 1 === (int) ( $updated_import['updated'] ?? 0 ), 'Re-import updates the matching animation' );
$assert(
	$imported_id === (int) ( $updated_import['animations'][0]['id'] ?? 0 ),
	'Re-import targets the same animation'
);

$delete = new WP_REST_Request( 'DELETE' );
$delete->set_param( 'id', $id );
Rest::delete( $delete );
$assert( null === get_post( $id ), 'Animation can be deleted' );

$delete_import = new WP_REST_Request( 'DELETE' );
$delete_import->set_param( 'id', $imported_id );
Rest::delete( $delete_import );
$assert( null === get_post( $imported_id ), 'Imported animation can be deleted' );

if ( $failures > 0 ) {
	echo "Completed with {$failures} failure(s).\n";
	exit( 1 );
}

echo "All GSAP interaction smoke tests passed.\n";

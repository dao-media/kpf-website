<?php
/**
 * Homepage hero cutouts are owned by Faust `HomeHeroCutoutsRuntime`
 * (left-to-right parallax). Keep this CMS row inactive so GsapRuntime
 * does not fight that entrance.
 *
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/seed-home-hero-cutouts-animation.php
 */

use KPF\Core\Interactions\ContentType;
use KPF\Core\Interactions\Meta;

wp_set_current_user( 1 );

const KPF_HOME_CUTOUTS_SLUG  = 'home-hero-cutouts-entrance';
const KPF_HOME_CUTOUTS_TITLE = 'Home hero photos';

$config = Meta::sanitize(
	array(
		'active'       => false,
		'selector'     => '.kpf-hero--home .kpf-hero__cutout',
		'trigger'      => 'load',
		'method'       => 'from',
		'duration'     => 1.55,
		'delay'        => 0.4,
		'ease'         => 'expo.out',
		'stagger'      => 0,
		'from'         => array(
			'xPercent'  => -78,
			'autoAlpha' => 0,
		),
	)
);

$existing = get_posts(
	array(
		'post_type'      => ContentType::POST_TYPE,
		'post_status'    => 'any',
		'name'           => KPF_HOME_CUTOUTS_SLUG,
		'posts_per_page' => 1,
		'fields'         => 'ids',
	)
);

$payload = array(
	'post_type'   => ContentType::POST_TYPE,
	'post_status' => 'draft',
	'post_title'  => KPF_HOME_CUTOUTS_TITLE,
	'post_name'   => KPF_HOME_CUTOUTS_SLUG,
	'menu_order'  => 4,
);

if ( ! empty( $existing ) ) {
	$payload['ID'] = (int) $existing[0];
	$post_id       = wp_update_post( $payload, true );
} else {
	$post_id = wp_insert_post( $payload, true );
}

if ( is_wp_error( $post_id ) || (int) $post_id < 1 ) {
	echo 'FAILED: ' . ( is_wp_error( $post_id ) ? $post_id->get_error_message() : 'could not seed animation' ) . "\n";
	exit( 1 );
}

$post_id = (int) $post_id;
update_post_meta( $post_id, Meta::META_KEY, $config );

echo 'Seeded ' . KPF_HOME_CUTOUTS_SLUG . " (ID {$post_id}) as inactive — Faust owns the entrance.\n";

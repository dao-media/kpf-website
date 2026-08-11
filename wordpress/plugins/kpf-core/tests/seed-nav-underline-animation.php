<?php
/**
 * Seed desktop nav link underline hover animation (Interactions → GSAP).
 *
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/seed-nav-underline-animation.php
 */

use KPF\Core\Interactions\ContentType;
use KPF\Core\Interactions\Meta;

wp_set_current_user( 1 );

const KPF_NAV_UNDERLINE_SLUG  = 'desktop-nav-link-underline';
const KPF_NAV_UNDERLINE_TITLE = 'Desktop nav link underline';

$config = Meta::sanitize(
	array(
		'active'       => true,
		'selector'     => '.kpf-header__nav .kpf-nav-link',
		'animateChild' => '.kpf-nav-link__line',
		'trigger'      => 'hover',
		'method'       => 'fromTo',
		'duration'     => 0.35,
		'delay'        => 0,
		'ease'         => 'power2.out',
		'stagger'      => 0,
		'repeat'       => 0,
		'yoyo'         => false,
		'from'         => array(
			'scaleX'          => 0,
			'transformOrigin' => '50% 50%',
		),
		'to'           => array(
			'scaleX'          => 1,
			'transformOrigin' => '50% 50%',
		),
	)
);

$existing = get_posts(
	array(
		'post_type'      => ContentType::POST_TYPE,
		'post_status'    => 'any',
		'name'           => KPF_NAV_UNDERLINE_SLUG,
		'posts_per_page' => 1,
		'fields'         => 'ids',
	)
);

$payload = array(
	'post_type'   => ContentType::POST_TYPE,
	'post_status' => 'publish',
	'post_title'  => KPF_NAV_UNDERLINE_TITLE,
	'post_name'   => KPF_NAV_UNDERLINE_SLUG,
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

echo "Seeded " . KPF_NAV_UNDERLINE_SLUG . " (ID {$post_id}).\n";
echo 'Selector: ' . $config['selector'] . " → child " . $config['animateChild'] . "\n";
echo 'Trigger: ' . $config['trigger'] . ' / method: ' . $config['method'] . "\n";

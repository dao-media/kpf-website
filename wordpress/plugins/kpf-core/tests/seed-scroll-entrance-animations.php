<?php
/**
 * Seed sitewide scroll entrances tuned to scfo.de body-copy motion (no pin/scrub).
 *
 * Faust GsapRuntime upgrades these `from { autoAlpha: 0 }` tweens to fromTo
 * (0→1) with lazy:false so ScrollTrigger cannot skip the fade.
 *
 * Reference (https://scfo.de/ — Framer Motion variants, Y inverted to fade in/down):
 *   hidden: { opacity: 0, y: -42 }
 *   show:   { opacity: 1, y: 0, transition: { duration: 0.9, delay: i*0.08, ease: [0.22, 1, 0.36, 1] } }
 *   viewport: { once: true, amount: ~0.2 }
 *
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/seed-scroll-entrance-animations.php
 */

use KPF\Core\Interactions\ContentType;
use KPF\Core\Interactions\Meta;

wp_set_current_user( 1 );

/**
 * @param string               $slug
 * @param string               $title
 * @param array<string, mixed> $config
 * @param int                  $menu_order
 */
function kpf_seed_gsap_animation( string $slug, string $title, array $config, int $menu_order = 0 ): void {
	$config = Meta::sanitize( $config );

	$existing = get_posts(
		array(
			'post_type'      => ContentType::POST_TYPE,
			'post_status'    => 'any',
			'name'           => $slug,
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);

	$payload = array(
		'post_type'   => ContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => $title,
		'post_name'   => $slug,
		'menu_order'  => $menu_order,
	);

	if ( ! empty( $existing ) ) {
		$payload['ID'] = (int) $existing[0];
		$post_id       = wp_update_post( $payload, true );
	} else {
		$post_id = wp_insert_post( $payload, true );
	}

	if ( is_wp_error( $post_id ) || (int) $post_id < 1 ) {
		echo 'FAILED ' . $slug . ': ' . ( is_wp_error( $post_id ) ? $post_id->get_error_message() : 'insert' ) . "\n";
		return;
	}

	$post_id = (int) $post_id;
	update_post_meta( $post_id, Meta::META_KEY, $config );
	$child_len = strlen( (string) ( $config['animateChild'] ?? '' ) );
	echo "Seeded {$slug} (ID {$post_id}) — {$config['trigger']} / {$config['method']} / ease={$config['ease']} / animateChild={$child_len}c\n";
}

// Hosts: every section + every hero (including home).
// Closing CTA owns its title drop + follow stagger in CtaClosingBand.
$reveal_hosts = '.kpf-section:not(.kpf-cta-closing), .kpf-hero';

/*
 * Direct content targets (avoid nesting title-group + title, body-group + body).
 * Prefer leaf / card nodes so stagger reads like scfo body-copy reveals.
 */
$content_children = implode(
	', ',
	array(
		'.kpf-content-block__eyebrow',
		'.kpf-content-block__title',
		'.kpf-content-block__body',
		'.kpf-content-block__actions',
		'.kpf-content-block__notation',
		'.kpf-card',
		'.kpf-grantee-card',
		'.kpf-mission__criteria > *',
		'.kpf-accordion',
		'.kpf-programs__list > *',
		'.kpf-values__cards > *',
		'.kpf-archive__card',
		'.kpf-blog-featured',
		'.kpf-blog-filters',
		'.kpf-blog-grid > *',
		'.kpf-blog-archive__empty',
		'.kpf-post-toc',
		'.kpf-post-activity',
		'.kpf-post-featured',
		'.kpf-article',
		'.kpf-comments__header',
		'.kpf-comments__list',
		'.kpf-comments__form',
		'.kpf-related__header',
		'.kpf-related__grid > *',
		'.kpf-event-card',
		'.kpf-event-library__grid > *',
		'.kpf-featured-event__chips',
		'.kpf-partners__viewport',
		'.kpf-contact__form',
		'.kpf-contact__aside',
		'.kpf-story__copy',
		'.kpf-donate__inner > *',
		'.kpf-hero__eyebrow',
		'.kpf-hero__title',
		'.kpf-hero__description',
		'.kpf-hero__actions',
	)
);

/*
 * Photographs keep the pre-flip fade in/up (positive y). Do not include
 * homepage hero cutouts — HomeHeroCutoutsRuntime owns those.
 */
$media_children = implode(
	', ',
	array(
		'.kpf-story__media',
		'.kpf-programs__media',
		'.kpf-hero__media',
		'.kpf-gallery__mosaic > *',
		'.kpf-gallery__grid > *',
		'.kpf-gallery__featured',
		'.kpf-featured-event__collage',
	)
);

// Soften/disable old shell so it doesn't double-stack with the butter stagger.
kpf_seed_gsap_animation(
	'section-shell-entrance',
	'Section shell entrance',
	array(
		'active'   => false,
		'selector' => '.kpf-section',
		'trigger'  => 'in-view',
		'method'   => 'from',
		'duration' => 0.9,
		'delay'    => 0,
		'ease'     => 'custom',
		'customBezier' => '0.22,1,0.36,1',
		'stagger'  => 0,
		'from'     => array(
			'y'         => -42,
			'autoAlpha' => 0,
		),
		'scroll'   => array(
			'start' => 'top 80%',
			'end'   => 'bottom 20%',
			'scrub' => 0,
			'once'  => true,
		),
	),
	10
);

// Primary sitewide content reveal — fade in/down.
kpf_seed_gsap_animation(
	'section-content-stagger',
	'Section content stagger',
	array(
		'active'       => true,
		'selector'     => $reveal_hosts,
		'animateChild' => $content_children,
		'trigger'      => 'in-view',
		'method'       => 'from',
		'duration'     => 0.9,
		'delay'        => 0.05,
		'ease'         => 'custom',
		'customBezier' => '0.22,1,0.36,1',
		'stagger'      => 0.08,
		'from'         => array(
			'y'         => -42,
			'autoAlpha' => 0,
		),
		'scroll'       => array(
			'start' => 'top 80%',
			'end'   => 'bottom 20%',
			'scrub' => 0,
			'once'  => true,
		),
	),
	20
);

// Photographs — fade in/up (do not follow the copy fade in/down).
kpf_seed_gsap_animation(
	'section-media-stagger',
	'Section media stagger',
	array(
		'active'       => true,
		'selector'     => $reveal_hosts,
		'animateChild' => $media_children,
		'trigger'      => 'in-view',
		'method'       => 'from',
		'duration'     => 0.95,
		'delay'        => 0.05,
		'ease'         => 'custom',
		'customBezier' => '0.22,1,0.36,1',
		'stagger'      => 0.08,
		'from'         => array(
			'y'         => 42,
			'autoAlpha' => 0,
		),
		'scroll'       => array(
			'start' => 'top 80%',
			'end'   => 'bottom 20%',
			'scrub' => 0,
			'once'  => true,
		),
	),
	21
);

// About framed photo — same butter ease, still load (not sticky).
kpf_seed_gsap_animation(
	'about-hero-frame-entrance',
	'About hero frame entrance',
	array(
		'active'       => true,
		'selector'     => '.kpf-hero--about .kpf-hero__frame-motion',
		'trigger'      => 'load',
		'method'       => 'from',
		'duration'     => 0.95,
		'delay'        => 1,
		'ease'         => 'custom',
		'customBezier' => '0.22,1,0.36,1',
		'stagger'      => 0,
		'from'         => array(
			'x'         => -72,
			'autoAlpha' => 0,
		),
	),
	5
);

echo "Done.\n";

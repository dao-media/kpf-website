<?php

use KPF\Core\Media\AdminSrcset;

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Run with wp eval-file.\n" );
	exit( 1 );
}

function kpf_admin_srcset_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$site     = untrailingslashit( site_url() );
$frontend = 'http://localhost:3000';

$sources = array(
	150 => array(
		'url'        => $frontend . '/wp-content/uploads/2026/07/example-150x150.png',
		'descriptor' => 'w',
		'value'      => 150,
	),
	300 => array(
		'url'        => $site . '/wp-content/uploads/2026/07/example-300x300.png',
		'descriptor' => 'w',
		'value'      => 300,
	),
);

$restored = AdminSrcset::rewrite_frontend_urls( $sources );

kpf_admin_srcset_assert(
	$site . '/wp-content/uploads/2026/07/example-150x150.png' === $restored[150]['url'],
	'Admin srcset rewrites Faust frontend URI back to the WordPress site URL'
);
kpf_admin_srcset_assert(
	$site . '/wp-content/uploads/2026/07/example-300x300.png' === $restored[300]['url'],
	'Admin srcset leaves WordPress media URLs unchanged'
);

AdminSrcset::ensure_faust_media_domain();
if ( function_exists( 'WPE\\FaustWP\\Settings\\use_wp_domain_for_media' ) ) {
	kpf_admin_srcset_assert(
		\WPE\FaustWP\Settings\use_wp_domain_for_media(),
		'Faust enable_image_source keeps media on the WordPress domain'
	);
}

$ids = get_posts(
	array(
		'post_type'      => 'attachment',
		'post_status'    => 'inherit',
		'posts_per_page' => 1,
		'fields'         => 'ids',
		'post_mime_type' => 'image',
	)
);
kpf_admin_srcset_assert( ! empty( $ids ), 'At least one image attachment exists for srcset check' );

$html = wp_get_attachment_image( (int) $ids[0], array( 48, 48 ) );
kpf_admin_srcset_assert( is_string( $html ) && $html !== '', 'Attachment renders image HTML' );
kpf_admin_srcset_assert(
	! str_contains( (string) $html, 'localhost:3000' ),
	'Attachment srcset does not point at the Next frontend URI'
);

echo "media-admin-srcset-smoke: OK\n";

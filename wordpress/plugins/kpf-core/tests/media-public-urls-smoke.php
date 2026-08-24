<?php

use KPF\Core\Media\PublicUrls;
use KPF\Core\Support\FrontendUrl;

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Run with wp eval-file.\n" );
	exit( 1 );
}

function kpf_public_urls_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$site = untrailingslashit( site_url() );
kpf_public_urls_assert( '' !== $site, 'WordPress site URL is set' );

$passthrough = $site . '/wp-content/uploads/2026/08/example.jpg';
kpf_public_urls_assert(
	$passthrough === PublicUrls::to_wp_host( $passthrough ),
	'WordPress-hosted media URLs are left unchanged'
);

$frontend = FrontendUrl::faust_uri();
if ( '' !== $frontend && $frontend !== $site ) {
	$rewritten = PublicUrls::to_wp_host( $frontend . '/wp-content/uploads/2026/08/example.jpg' );
	kpf_public_urls_assert(
		$site . '/wp-content/uploads/2026/08/example.jpg' === $rewritten,
		'Faust frontend media URLs rewrite onto the WordPress host'
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
if ( $ids ) {
	$url = PublicUrls::image_url( (int) $ids[0], 'full' );
	kpf_public_urls_assert( '' !== $url, 'image_url returns a URL for a real attachment' );
	kpf_public_urls_assert(
		! str_contains( $url, 'localhost:3010' ) && ! str_contains( $url, 'localhost:3000' ),
		'Public image URLs do not point at the local Faust frontend'
	);
}

echo "media-public-urls-smoke: OK\n";

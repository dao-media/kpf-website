<?php

use KPF\Core\Media\SvgUploads;

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Run with wp eval-file.\n" );
	exit( 1 );
}

function kpf_svg_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$mimes = SvgUploads::allow_mime( array( 'jpg|jpeg|jpe' => 'image/jpeg' ) );
kpf_svg_assert( 'image/svg+xml' === $mimes['svg'], 'SVG MIME type is enabled for backend uploads' );

$clean = SvgUploads::sanitize(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" onload="alert(1)">'
	. '<defs><linearGradient id="wash"><stop offset="100%" stop-color="#fff"/></linearGradient></defs>'
	. '<path id="line" d="M0 0 L100 80" stroke="url(#wash)" style="filter:url(https://example.test/filter)"/>'
	. '<use href="https://example.test/external.svg#shape"/>'
	. '<foreignObject><script>alert(1)</script></foreignObject>'
	. '</svg>'
);
kpf_svg_assert( is_string( $clean ), 'Valid SVG is accepted' );
kpf_svg_assert( str_contains( $clean, '<path' ), 'Safe SVG geometry is preserved' );
kpf_svg_assert( str_contains( $clean, 'url(#wash)' ), 'Local SVG paint references are preserved' );
kpf_svg_assert( ! str_contains( $clean, 'onload' ), 'SVG event handlers are removed' );
kpf_svg_assert( ! str_contains( $clean, 'style=' ), 'Inline SVG styles are removed' );
kpf_svg_assert( ! str_contains( $clean, 'example.test' ), 'External SVG references are removed' );
kpf_svg_assert( ! str_contains( strtolower( $clean ), 'foreignobject' ), 'Foreign HTML content is removed' );
kpf_svg_assert( ! str_contains( strtolower( $clean ), '<script' ), 'SVG scripts are removed' );

$doctype = SvgUploads::sanitize( '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg>&xxe;</svg>' );
kpf_svg_assert( is_wp_error( $doctype ), 'SVG entity declarations are rejected' );

$not_svg = SvgUploads::sanitize( '<html><body>Not SVG</body></html>' );
kpf_svg_assert( is_wp_error( $not_svg ), 'Non-SVG XML is rejected' );

$temporary = wp_tempnam( 'kpf-upload.svg' );
kpf_svg_assert( is_string( $temporary ), 'A temporary upload file can be created' );
file_put_contents( $temporary, '<svg viewBox="0 0 10 10"><path d="M0 0 L10 10" onclick="alert(1)"/></svg>' );
$upload = SvgUploads::sanitize_upload(
	array(
		'name'     => 'artwork.svg',
		'tmp_name' => $temporary,
		'error'    => 0,
		'size'     => filesize( $temporary ),
		'type'     => 'image/svg+xml',
	)
);
kpf_svg_assert( empty( $upload['error'] ), 'A safe backend SVG upload is accepted' );
$uploaded_source = file_get_contents( $temporary );
kpf_svg_assert( is_string( $uploaded_source ) && ! str_contains( $uploaded_source, 'onclick' ), 'Uploaded SVG is sanitized before storage' );
wp_delete_file( $temporary );

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$sideload_temp = wp_tempnam( 'kpf-media-library.svg' );
kpf_svg_assert( is_string( $sideload_temp ), 'A Media Library upload file can be created' );
file_put_contents(
	$sideload_temp,
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24" onload="alert(1)"><rect width="32" height="24"/></svg>'
);
$attachment_id = media_handle_sideload(
	array(
		'name'     => 'kpf-media-library.svg',
		'tmp_name' => $sideload_temp,
		'error'    => 0,
		'size'     => filesize( $sideload_temp ),
		'type'     => 'image/svg+xml',
	),
	0,
	'KPF SVG upload smoke test'
);
kpf_svg_assert( ! is_wp_error( $attachment_id ), 'WordPress accepts sanitized SVGs through its Media Library pipeline' );
kpf_svg_assert( 'image/svg+xml' === get_post_mime_type( $attachment_id ), 'Media Library stores the SVG MIME type' );
$attachment_source = file_get_contents( get_attached_file( $attachment_id ) );
kpf_svg_assert( is_string( $attachment_source ) && ! str_contains( $attachment_source, 'onload' ), 'Media Library stores sanitized SVG source' );
wp_delete_attachment( $attachment_id, true );

echo "Media SVG smoke tests passed.\n";

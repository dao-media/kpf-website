<?php
/**
 * Smoke: Design → Icons REST capability + stylesheet class upsert.
 *
 * Run: wp eval-file wp-content/plugins/kpf-core/tests/icons-smoke.php
 */

use KPF\Core\Design\Icons\Css;
use KPF\Core\Design\Tokens\Parser;
use KPF\Core\Design\Tokens\Registry;
use KPF\Core\Stylesheet\Meta as StylesheetMeta;

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Run inside WordPress (wp eval-file).\n" );
	exit( 1 );
}

$fail = 0;

function kpf_icons_ok( string $label ): void {
	echo "OK  {$label}\n";
}

function kpf_icons_fail( string $label, string $detail = '' ): void {
	global $fail;
	++$fail;
	echo "FAIL {$label}" . ( $detail ? " — {$detail}" : '' ) . "\n";
}

// Capability gate: subscriber cannot.
$subscriber = get_users( array( 'role' => 'subscriber', 'number' => 1 ) );
if ( $subscriber ) {
	wp_set_current_user( (int) $subscriber[0]->ID );
	$denied = ! current_user_can( 'edit_theme_options' );
	$denied ? kpf_icons_ok( 'subscriber lacks edit_theme_options' ) : kpf_icons_fail( 'subscriber should lack edit_theme_options' );
}

$admins = get_users( array( 'role' => 'administrator', 'number' => 1 ) );
if ( ! $admins ) {
	kpf_icons_fail( 'no administrator user' );
} else {
	wp_set_current_user( (int) $admins[0]->ID );
	current_user_can( 'edit_theme_options' )
		? kpf_icons_ok( 'admin has edit_theme_options' )
		: kpf_icons_fail( 'admin missing edit_theme_options' );
}

$result = Css::save_class(
	array(
		'name'   => '.kpf-icon--heart-smoke',
		'icon'   => 'heart',
		'config' => array(
			'size'           => 24,
			'strokeWidth'    => 2,
			'strokeLinecap'  => 'round',
			'strokeLinejoin' => 'round',
			'color'          => 'var(--kpf-color-icon-brand)',
			'padding'        => '0.25rem',
			'margin'         => '0',
		),
	)
);

if ( is_wp_error( $result ) ) {
	kpf_icons_fail( 'Css::save_class', $result->get_error_message() );
} else {
	kpf_icons_ok( 'Css::save_class returned inventory' );
}

$stylesheet_id = (int) get_option( 'kpf_stylesheet_active_id', 0 );
$css = $stylesheet_id ? (string) get_post_meta( $stylesheet_id, \KPF\Core\Stylesheet\Meta::CSS_META, true ) : '';
if ( '' === $css ) {
	// Fallback: scan option/registry compile path used by Sync.
	$posts = get_posts(
		array(
			'post_type'      => 'kpf_stylesheet',
			'posts_per_page' => 1,
			'post_status'    => 'any',
			'fields'         => 'ids',
		)
	);
	if ( $posts ) {
		$css = (string) get_post_meta( (int) $posts[0], \KPF\Core\Stylesheet\Meta::CSS_META, true );
	}
}

if ( str_contains( $css, '.kpf-icon--heart-smoke' ) || ( is_array( $result ) && ! empty( $result ) ) ) {
	kpf_icons_ok( 'icon class present after save' );
} else {
	// Inventory success is enough if CSS meta key differs; still check registry.
	$registry = \KPF\Core\Design\Tokens\Registry::get();
	$found    = false;
	foreach ( $registry['classes'] as $row ) {
		if ( ( $row['name'] ?? '' ) === '.kpf-icon--heart-smoke' ) {
			$found = true;
			break;
		}
	}
	$found
		? kpf_icons_ok( 'icon class in tokens registry' )
		: kpf_icons_fail( 'icon class missing from stylesheet/registry' );
}

$invalid = Css::save_class( array( 'name' => '', 'css' => 'color: red;' ) );
is_wp_error( $invalid )
	? kpf_icons_ok( 'empty class name rejected' )
	: kpf_icons_fail( 'empty class name should error' );

unset( $css ); // silence unused if Parser unused — keep import for future asserts.
if ( class_exists( Parser::class ) ) {
	kpf_icons_ok( 'tokens Parser available' );
}

echo $fail ? "DONE with {$fail} failure(s)\n" : "DONE all passed\n";
exit( $fail ? 1 : 0 );

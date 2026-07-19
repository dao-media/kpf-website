<?php
/**
 * Smoke tests for Utilities → Accessibility.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/accessibility-smoke.php
 */

use KPF\Core\Accessibility\Admin;
use KPF\Core\Accessibility\Presets;
use KPF\Core\Accessibility\Rest;
use KPF\Core\Accessibility\Sanitizer;
use KPF\Core\Accessibility\Settings;

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

Settings::ensure_defaults();
$defaults = Settings::get();
$assert( 'recommended' === $defaults['preset'], 'Default preset is recommended' );
$assert( ! empty( $defaults['navigation']['skip_link'] ), 'Recommended enables skip link' );
$assert( ! empty( $defaults['motion']['honor_prefers_reduced_motion'] ), 'Recommended honors reduced motion' );

$assert( 'kpf-accessibility' === Admin::menu_slug_for_tab( 'overview' ), 'Overview uses parent menu slug' );
$assert( 'kpf-accessibility-navigation' === Admin::menu_slug_for_tab( 'navigation' ), 'Navigation submenu slug is namespaced' );
$assert( 'forms' === Admin::tab_from_page( 'kpf-accessibility-forms' ), 'Tab resolves from page slug' );

$dirty = Sanitizer::sanitize_settings(
	array(
		'preset'     => 'custom',
		'navigation' => array(
			'skip_link'        => true,
			'skip_target'      => 'javascript:alert(1)',
			'focus_ring'       => true,
			'focus_ring_color' => 'not-a-color',
			'focus_ring_width' => 99,
		),
		'content'    => array(
			'language' => '!!!',
		),
		'advanced'   => array(
			'custom_css' => '@import "x.css"; .x { color: red; }',
		),
	)
);
$assert( '#main' === $dirty['navigation']['skip_target'], 'Invalid skip targets fall back to #main' );
$assert( '#2271b1' === $dirty['navigation']['focus_ring_color'], 'Invalid colors fall back to default' );
$assert( 8 === $dirty['navigation']['focus_ring_width'], 'Focus ring width is capped' );
$assert( 'en' === $dirty['content']['language'], 'Invalid language falls back to en' );
$assert( ! str_contains( $dirty['advanced']['custom_css'], '@import' ), 'CSS imports are stripped' );

$applied = Presets::apply( 'essential', Settings::get() );
$assert( 'essential' === $applied['preset'], 'Essential preset can be applied' );
$assert( ! empty( $applied['navigation']['skip_link'] ), 'Essential enables skip link' );
$assert( empty( $applied['content']['route_announcer'] ), 'Essential leaves route announcer off' );

Settings::update( $applied );
$public = Settings::public_config();
$assert( true === $public['navigation']['skipLink'], 'Public config exposes camelCase skipLink' );
$assert( isset( $public['motion']['honorPrefersReducedMotion'] ), 'Public config includes motion flags' );

$request = new WP_REST_Request( 'POST' );
$request->set_param( 'preset', 'recommended' );
$response = Rest::apply_preset( $request );
$data     = $response instanceof WP_REST_Response ? $response->get_data() : array();
$assert( 'recommended' === ( $data['preset'] ?? '' ), 'REST apply-preset restores recommended' );

$bad = new WP_REST_Request( 'POST' );
$bad->set_param( 'preset', 'nope' );
$error = Rest::apply_preset( $bad );
$assert( is_wp_error( $error ), 'Unknown presets are rejected' );

if ( $failures > 0 ) {
	echo "Completed with {$failures} failure(s).\n";
	exit( 1 );
}

echo "Accessibility smoke tests passed.\n";

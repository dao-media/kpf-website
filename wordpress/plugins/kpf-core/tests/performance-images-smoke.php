<?php
/**
 * Smoke tests for Performance image optimization settings.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/performance-images-smoke.php
 */

use KPF\Core\Performance\Images;
use KPF\Core\Performance\Sanitizer;
use KPF\Core\Performance\Settings;

$GLOBALS['kpf_perf_image_failures'] = 0;

function kpf_perf_image_assert(bool $condition, string $message): void {
	if ($condition) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_perf_image_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user(1);

kpf_perf_image_assert(Images::clamp_quality(85) === 85, 'Recommended quality 85 is accepted');
kpf_perf_image_assert(Images::clamp_quality(-10) === 0, 'Quality below 0 clamps to 0');
kpf_perf_image_assert(Images::clamp_quality(150) === 100, 'Quality above 100 clamps to 100');

$clean = Sanitizer::sanitize_settings(
	array(
		'preset' => 'custom',
		'media'  => array(
			'enabled'             => true,
			'quality'             => 92,
			'editor_engine'       => 'imagick',
			'generate_webp'       => true,
			'generate_avif'       => true,
			'optimize_on_upload'  => true,
			'max_width'           => 2048,
			'max_height'          => 0,
			'big_image_threshold' => 2560,
			'prefer_webp'         => true,
			'prefer_avif'         => false,
			'strip_exif'          => true,
			'lazy_load'           => true,
			'lazy_load_native'    => true,
			'responsive_images'   => true,
			'browser_ttl'         => 604800,
			'cdn_url'             => 'https://cdn.example.com',
		),
	)
);

kpf_perf_image_assert(($clean['media']['quality'] ?? null) === 92, 'Sanitizer keeps custom quality');
kpf_perf_image_assert(($clean['media']['editor_engine'] ?? null) === 'imagick', 'Sanitizer keeps ImageMagick engine');
kpf_perf_image_assert(! empty($clean['media']['generate_webp']), 'Sanitizer keeps generate_webp');
kpf_perf_image_assert(! empty($clean['media']['generate_avif']), 'Sanitizer keeps generate_avif');
kpf_perf_image_assert(($clean['media']['max_width'] ?? null) === 2048, 'Sanitizer keeps max_width');

$bad_engine = Sanitizer::sanitize_settings(
	array(
		'media' => array(
			'editor_engine' => 'foobar',
			'quality'       => 999,
		),
	)
);
kpf_perf_image_assert(($bad_engine['media']['editor_engine'] ?? null) === 'auto', 'Invalid engine falls back to auto');
kpf_perf_image_assert(($bad_engine['media']['quality'] ?? null) === 100, 'Out-of-range quality clamps via sanitizer');

$caps = Images::capabilities();
kpf_perf_image_assert(isset($caps['imagick'], $caps['gd'], $caps['webp'], $caps['avif']), 'Capabilities report engines and formats');
kpf_perf_image_assert(($caps['recommended_quality'] ?? 0) === 85, 'Capabilities advertise recommended quality 85');

$merged = Settings::get();
kpf_perf_image_assert(array_key_exists('quality', $merged['media'] ?? array()), 'Settings merge includes quality');
kpf_perf_image_assert(array_key_exists('editor_engine', $merged['media'] ?? array()), 'Settings merge includes editor_engine');
kpf_perf_image_assert(array_key_exists('generate_webp', $merged['media'] ?? array()), 'Settings merge includes generate_webp');

$routes = rest_get_server()->get_routes();
kpf_perf_image_assert(isset($routes['/kpf-performance/v1/images/capabilities']), 'Image capabilities REST route registered');
kpf_perf_image_assert(isset($routes['/kpf-performance/v1/images/regenerate']), 'Image regenerate REST route registered');

if ($GLOBALS['kpf_perf_image_failures'] > 0) {
	echo "\n{$GLOBALS['kpf_perf_image_failures']} failure(s)\n";
	exit(1);
}

echo "\nAll performance image smoke checks passed.\n";

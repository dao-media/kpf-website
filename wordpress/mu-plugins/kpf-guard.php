<?php
/**
 * Plugin Name: KPF Plugin Guard
 * Description: Stop Dashboard auto-updates (and one-click updates) of FaustWP, WPGraphQL, and SCF. Versions live in wordpress/pinned-plugins.json.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @return list<array{slug: string, file: string, version?: string|null}>
 */
function kpf_guard_pins(): array {
	static $pins = null;
	if ( is_array( $pins ) ) {
		return $pins;
	}

	$paths = array(
		WP_CONTENT_DIR . '/kpf-pinned-plugins.json',
		WP_CONTENT_DIR . '/mu-plugins/kpf-pinned-plugins.json',
	);

	foreach ( $paths as $path ) {
		if ( ! is_readable( $path ) ) {
			continue;
		}
		$raw  = file_get_contents( $path );
		$data = is_string( $raw ) ? json_decode( $raw, true ) : null;
		if ( is_array( $data['plugins'] ?? null ) ) {
			$pins = array_values(
				array_filter(
					$data['plugins'],
					static function ( $row ) {
						return is_array( $row ) && ! empty( $row['file'] );
					}
				)
			);
			return $pins;
		}
	}

	$pins = array(
		array(
			'slug' => 'faustwp',
			'file' => 'faustwp/faustwp.php',
		),
		array(
			'slug' => 'wp-graphql',
			'file' => 'wp-graphql/wp-graphql.php',
		),
		array(
			'slug' => 'secure-custom-fields',
			'file' => 'secure-custom-fields/secure-custom-fields.php',
		),
	);
	return $pins;
}

/**
 * @return list<string>
 */
function kpf_guard_plugin_files(): array {
	return array_values(
		array_unique(
			array_map(
				static function ( array $pin ): string {
					return (string) $pin['file'];
				},
				kpf_guard_pins()
			)
		)
	);
}

function kpf_guard_is_pinned_file( string $plugin_file ): bool {
	$plugin_file = ltrim( str_replace( '\\', '/', $plugin_file ), '/' );
	foreach ( kpf_guard_plugin_files() as $file ) {
		if ( $plugin_file === $file || str_starts_with( $plugin_file, dirname( $file ) . '/' ) ) {
			return true;
		}
	}
	return false;
}

add_filter(
	'auto_update_plugin',
	static function ( $update, $item ) {
		$plugin = '';
		if ( is_object( $item ) ) {
			$plugin = (string) ( $item->plugin ?? $item->file ?? '' );
		} elseif ( is_string( $item ) ) {
			$plugin = $item;
		}
		if ( $plugin !== '' && kpf_guard_is_pinned_file( $plugin ) ) {
			return false;
		}
		return $update;
	},
	0,
	2
);

add_filter(
	'site_transient_update_plugins',
	static function ( $transient ) {
		if ( ! is_object( $transient ) ) {
			return $transient;
		}
		foreach ( kpf_guard_plugin_files() as $file ) {
			if ( isset( $transient->response[ $file ] ) ) {
				unset( $transient->response[ $file ] );
			}
		}
		return $transient;
	}
);

add_filter(
	'upgrader_pre_install',
	static function ( $response, $hook_extra ) {
		$plugin = (string) ( $hook_extra['plugin'] ?? '' );
		if ( $plugin !== '' && kpf_guard_is_pinned_file( $plugin ) ) {
			return new WP_Error(
				'kpf_guard_pinned',
				__( 'This plugin is pinned by KPF. Bump wordpress/pinned-plugins.json and .wp-env.json, then update from git — not the Dashboard.', 'kpf-core' )
			);
		}
		return $response;
	},
	10,
	2
);

add_filter(
	'plugin_auto_update_setting_html',
	static function ( $html, $plugin_file ) {
		if ( kpf_guard_is_pinned_file( (string) $plugin_file ) ) {
			return '<em>' . esc_html__( 'Pinned — Dashboard updates blocked', 'kpf-core' ) . '</em>';
		}
		return $html;
	},
	10,
	2
);

<?php

declare(strict_types=1);

namespace KPF\Core\Seo\Redirects;

use KPF\Core\Support\FrontendUrl;

/**
 * Paths from the previous WordPress site that should 301 onto current pages.
 */
final class Legacy {
	public const OPTION_KEY = 'kpf_seo_legacy_paths_v1';

	/**
	 * @return array<string, string> source path => public target URL
	 */
	public static function map(): array {
		$origin = FrontendUrl::PRODUCTION_ORIGIN;
		return array(
			'/about-us'   => $origin . '/about',
			'/contact-us' => $origin . '/contact',
		);
	}

	public static function ensure(): void {
		if ( get_option( self::OPTION_KEY ) === '1' ) {
			return;
		}

		$have = array();
		foreach ( Repository::all() as $row ) {
			$have[ Repository::normalize_path( (string) $row['source_path'] ) ] = true;
		}

		foreach ( self::map() as $source => $target ) {
			$key = Repository::normalize_path( $source );
			if ( isset( $have[ $key ] ) ) {
				continue;
			}
			$created = Repository::create(
				array(
					'source_path' => $source,
					'target_url'  => $target,
					'status_code' => 301,
					'is_enabled'  => true,
					'notes'       => 'Legacy path from the previous WordPress site.',
				)
			);
			if ( is_wp_error( $created ) ) {
				return;
			}
		}

		update_option( self::OPTION_KEY, '1', true );
	}
}

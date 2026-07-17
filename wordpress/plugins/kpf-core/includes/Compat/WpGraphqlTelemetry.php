<?php

declare(strict_types=1);

namespace KPF\Core\Compat;

/**
 * Permanently suppress WPGraphQL's Appsero "help make WPGraphQL awesome" admin toast.
 */
final class WpGraphqlTelemetry {
	/**
	 * Option keys Appsero uses to store dismiss state for common install paths.
	 *
	 * @var string[]
	 */
	private const TRACKING_NOTICE_OPTIONS = array(
		'wp-graphql_tracking_notice',
		'wp-graphql.latest-stable_tracking_notice',
	);

	public static function register(): void {
		add_action('admin_init', array( self::class, 'dismiss_notice' ), 1);
		add_action('admin_notices', array( self::class, 'remove_appsero_notice' ), 0);
	}

	/**
	 * Match Appsero's own dismiss path so the toast never returns after updates.
	 */
	public static function dismiss_notice(): void {
		foreach (self::TRACKING_NOTICE_OPTIONS as $option) {
			if ('hide' !== get_option($option, null)) {
				update_option($option, 'hide', false);
			}
		}
	}

	/**
	 * Also strip any live Appsero Insights admin_notice callbacks for this request.
	 */
	public static function remove_appsero_notice(): void {
		if (! class_exists('\\Appsero\\Insights')) {
			return;
		}

		global $wp_filter;
		if (empty($wp_filter['admin_notices']) || ! isset($wp_filter['admin_notices']->callbacks)) {
			return;
		}

		foreach ($wp_filter['admin_notices']->callbacks as $priority => $callbacks) {
			foreach ($callbacks as $callback) {
				$function = $callback['function'] ?? null;
				if (
					! is_array($function) ||
					! isset($function[0], $function[1]) ||
					! is_object($function[0]) ||
					! ( $function[0] instanceof \Appsero\Insights ) ||
					'admin_notice' !== $function[1]
				) {
					continue;
				}

				remove_action('admin_notices', $function, (int) $priority);
			}
		}
	}
}

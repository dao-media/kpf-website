<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

/**
 * Comment-related Inbox behavior driven by Inbox settings.
 */
final class Comments {
	public static function register(): void {
		add_filter('close_comments_for_old_posts', array( self::class, 'maybe_close_old' ), 10, 2);
		add_filter('close_comments_days_old', array( self::class, 'days_old' ));
	}

	/**
	 * @param bool     $close Whether to close comments.
	 * @param \WP_Post $post  Post being checked.
	 */
	public static function maybe_close_old(bool $close, $post): bool {
		unset($post);
		$days = (int) ( Settings::all()['comments']['auto_close_days'] ?? 0 );
		return $days > 0 ? true : $close;
	}

	public static function days_old(int $days): int {
		$configured = (int) ( Settings::all()['comments']['auto_close_days'] ?? 0 );
		return $configured > 0 ? $configured : $days;
	}
}

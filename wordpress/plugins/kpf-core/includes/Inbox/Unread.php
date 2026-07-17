<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

final class Unread {
	/**
	 * Combined unread count for the Inbox parent menu badge.
	 */
	public static function total_for_current_user(): int {
		$total = 0;

		if (current_user_can('moderate_comments')) {
			$total += self::comments();
		}

		if (current_user_can('edit_posts')) {
			$total += self::forms();
		}

		return $total;
	}

	/**
	 * Pending (awaiting moderation) comments count as unread inbox items.
	 */
	public static function comments(): int {
		$counts = wp_count_comments();
		return (int) ( $counts->moderated ?? 0 );
	}

	/**
	 * Unpublished/unread form submissions awaiting review.
	 */
	public static function forms(): int {
		$query = new \WP_Query(
			array(
				'post_type'              => Forms::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => false,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				'meta_query'             => array(
					'relation' => 'OR',
					array(
						'key'     => Forms::META_READ,
						'compare' => 'NOT EXISTS',
					),
					array(
						'key'   => Forms::META_READ,
						'value' => '0',
					),
				),
			)
		);

		return (int) $query->found_posts;
	}

	public static function badge_html(int $count): string {
		if ($count < 1) {
			return '';
		}

		$label = sprintf(
			/* translators: %s: number of unread inbox items */
			_n('%s unread inbox item', '%s unread inbox items', $count, 'kpf-core'),
			number_format_i18n($count)
		);

		return sprintf(
			' <span class="awaiting-mod count-%1$d"><span class="pending-count" aria-hidden="true">%2$s</span><span class="screen-reader-text">%3$s</span></span>',
			$count,
			esc_html(number_format_i18n($count)),
			esc_html($label)
		);
	}
}

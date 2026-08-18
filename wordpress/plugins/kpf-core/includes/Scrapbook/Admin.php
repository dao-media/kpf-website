<?php

declare(strict_types=1);

namespace KPF\Core\Scrapbook;

use WP_Post;
use WP_Query;

final class Admin {
	public static function register(): void {
		add_filter(
			'manage_' . ContentType::POST_TYPE . '_posts_columns',
			array( self::class, 'columns' )
		);
		add_action(
			'manage_' . ContentType::POST_TYPE . '_posts_custom_column',
			array( self::class, 'render_column' ),
			10,
			2
		);
		add_filter(
			'manage_edit-' . ContentType::POST_TYPE . '_sortable_columns',
			array( self::class, 'sortable_columns' )
		);
		add_action('pre_get_posts', array( self::class, 'apply_sorting' ));
		add_action('restrict_manage_posts', array( self::class, 'filters' ));
		add_action('parse_query', array( self::class, 'apply_filters' ));
		add_filter(
			'enter_title_here',
			static function (string $title, WP_Post $post): string {
				return ContentType::POST_TYPE === $post->post_type
					? __('Add a description', 'kpf-core')
					: $title;
			},
			10,
			2
		);
		add_action('edit_form_after_title', array( self::class, 'editor_intro' ));
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns(array $columns): array {
		return array(
			'cb'             => $columns['cb'] ?? '<input type="checkbox" />',
			'kpf_cover'      => __('Image', 'kpf-core'),
			'title'          => __('Description', 'kpf-core'),
			'kpf_image_count' => __('Images', 'kpf-core'),
			'kpf_event_date' => __('When', 'kpf-core'),
			'kpf_location'   => __('Where', 'kpf-core'),
			'kpf_featured'   => __('Featured', 'kpf-core'),
		);
	}

	public static function render_column(string $column, int $post_id): void {
		$meta = Meta::get($post_id);

		switch ($column) {
			case 'kpf_cover':
				$image_id = (int) ($meta['images'][0]['attachment_id'] ?? get_post_thumbnail_id($post_id));
				if ($image_id > 0) {
					echo wp_get_attachment_image(
						$image_id,
						array( 72, 72 ),
						false,
						array(
							'style' => 'width:72px;height:72px;object-fit:cover;border-radius:4px;',
						)
					);
				} else {
					echo '<span aria-hidden="true">—</span>';
				}
				break;
			case 'kpf_image_count':
				$count = self::image_count($meta);
				echo esc_html( (string) $count );
				break;
			case 'kpf_event_date':
				echo esc_html(self::friendly_date($meta));
				break;
			case 'kpf_location':
				echo esc_html((string) ($meta['location'] ?: '—'));
				break;
			case 'kpf_featured':
				echo ! empty($meta['featured'])
					? '<span class="dashicons dashicons-star-filled" aria-label="' .
						esc_attr__('Featured', 'kpf-core') . '"></span>'
					: '<span aria-hidden="true">—</span>';
				break;
		}
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function sortable_columns(array $columns): array {
		$columns['kpf_featured'] = 'kpf_featured';
		return $columns;
	}

	public static function apply_sorting(WP_Query $query): void {
		if (! is_admin() || ! $query->is_main_query() || ContentType::POST_TYPE !== $query->get('post_type')) {
			return;
		}

		if ('kpf_featured' === $query->get('orderby')) {
			$query->set('meta_key', Meta::FEATURED_META);
			$query->set('orderby', 'meta_value');
		}
	}

	public static function filters(string $post_type): void {
		if (ContentType::POST_TYPE !== $post_type) {
			return;
		}

		$selected_featured = isset($_GET['kpf_featured']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key(wp_unslash($_GET['kpf_featured'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		echo '<label class="screen-reader-text" for="kpf-featured-filter">' .
			esc_html__('Filter by featured status', 'kpf-core') . '</label>';
		echo '<select name="kpf_featured" id="kpf-featured-filter">';
		echo '<option value="">' . esc_html__('All featured statuses', 'kpf-core') . '</option>';
		echo '<option value="1"' . selected($selected_featured, '1', false) . '>' .
			esc_html__('Featured only', 'kpf-core') . '</option>';
		echo '<option value="0"' . selected($selected_featured, '0', false) . '>' .
			esc_html__('Not featured', 'kpf-core') . '</option>';
		echo '</select>';
	}

	public static function apply_filters(WP_Query $query): void {
		global $pagenow;

		if (
			! is_admin() ||
			'edit.php' !== $pagenow ||
			ContentType::POST_TYPE !== $query->get('post_type')
		) {
			return;
		}

		$meta_query = is_array($query->get('meta_query')) ? $query->get('meta_query') : array();

		if (isset($_GET['kpf_featured']) && '' !== $_GET['kpf_featured']) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$featured = '1' === sanitize_key(wp_unslash($_GET['kpf_featured'])) ? '1' : '0'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$meta_query[] = array(
				'key'   => Meta::FEATURED_META,
				'value' => $featured,
			);
		}

		if ($meta_query) {
			$query->set('meta_query', $meta_query);
		}
	}

	public static function editor_intro(WP_Post $post): void {
		if (ContentType::POST_TYPE !== $post->post_type) {
			return;
		}

		echo '<div class="notice notice-info inline" style="margin:12px 0 16px;">';
		echo '<p><strong>' . esc_html__('How to build this scrapbook item', 'kpf-core') . '</strong><br />';
		echo esc_html__(
			'Set the description above, then add images in the Images box. Open Scrapbook details in the sidebar for when, where, and other notes.',
			'kpf-core'
		);
		echo '</p></div>';
	}

	/**
	 * @param array<string, mixed> $meta
	 */
	private static function image_count(array $meta): int {
		$images = $meta['images'] ?? array();
		if (! is_array($images)) {
			return 0;
		}

		$count = 0;
		foreach ($images as $placement) {
			if (! is_array($placement)) {
				continue;
			}
			if ((int) ($placement['attachment_id'] ?? 0) > 0) {
				++$count;
			}
		}

		return $count;
	}

	/**
	 * @param array<string, mixed> $meta
	 */
	private static function friendly_date(array $meta): string {
		$date      = (string) ($meta['event_date'] ?? '');
		$precision = (string) ($meta['date_precision'] ?? 'unknown');
		if ('' === $date || 'unknown' === $precision) {
			return __('Unknown', 'kpf-core');
		}
		if ('decade' === $precision) {
			$year = (int) substr($date, 0, 4);
			if ($year > 0) {
				return (string) $year;
			}
			return substr($date, 0, 3) . '0s';
		}
		if ('month' === $precision && preg_match('/^(\d{4})-(\d{2})$/', $date, $m)) {
			$months = array(
				'01' => 'January',
				'02' => 'February',
				'03' => 'March',
				'04' => 'April',
				'05' => 'May',
				'06' => 'June',
				'07' => 'July',
				'08' => 'August',
				'09' => 'September',
				'10' => 'October',
				'11' => 'November',
				'12' => 'December',
			);
			$label = $months[ $m[2] ] ?? $m[2];
			return $label . ' ' . $m[1];
		}
		if ('exact' === $precision && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m)) {
			$months = array(
				'01' => 'January',
				'02' => 'February',
				'03' => 'March',
				'04' => 'April',
				'05' => 'May',
				'06' => 'June',
				'07' => 'July',
				'08' => 'August',
				'09' => 'September',
				'10' => 'October',
				'11' => 'November',
				'12' => 'December',
			);
			$label = $months[ $m[2] ] ?? $m[2];
			return $label . ' ' . (int) $m[3] . ', ' . $m[1];
		}
		return $date;
	}
}

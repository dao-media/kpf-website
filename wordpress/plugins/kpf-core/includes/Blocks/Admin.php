<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

use WP_Post;
use WP_Term;

final class Admin {
	public static function register(): void {
		add_action('admin_menu', array( self::class, 'menu' ));
	}

	public static function menu(): void {
		add_menu_page(
			__('Reusable Component Library', 'kpf-core'),
			__('Components', 'kpf-core'),
			'edit_posts',
			'kpf-components',
			array( self::class, 'render' ),
			'dashicons-layout',
			22
		);
	}

	public static function render(): void {
		if (! current_user_can('edit_posts')) {
			wp_die(esc_html__('You do not have permission to manage components.', 'kpf-core'));
		}

		$search   = isset($_GET['s']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_text_field(wp_unslash($_GET['s'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';
		$selected = isset($_GET['group']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? absint($_GET['group']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: 0;
		$terms    = get_terms(
			array(
				'taxonomy'   => Groups::TAXONOMY,
				'hide_empty' => false,
				'orderby'    => 'name',
			)
		);
		$terms    = is_wp_error($terms) ? array() : $terms;
		$posts    = self::components($search, $selected);
		$grouped  = self::group_posts($posts);

		echo '<div class="wrap kpf-components-admin">';
		echo '<h1 class="wp-heading-inline">' . esc_html__('Reusable Component Library', 'kpf-core') . '</h1>';
		echo ' <a class="page-title-action" href="' .
			esc_url(admin_url('post-new.php?post_type=wp_block')) . '">' .
			esc_html__('Build a component', 'kpf-core') . '</a>';
		echo ' <a class="page-title-action" href="' .
			esc_url(admin_url('post-new.php?post_type=wp_block&kpf_import=1')) . '">' .
			esc_html__('Create from upload', 'kpf-core') . '</a>';
		echo '<hr class="wp-header-end" />';

		echo '<div class="notice notice-info inline"><p>';
		echo esc_html__(
			'Build visually with Foundation blocks or import an HTML, Gutenberg markup, or pattern JSON file. Review the result in the editor canvas, then choose Synced when every use should update together or Not synced when each inserted copy should be editable on its own.',
			'kpf-core'
		);
		echo '</p></div>';

		echo '<p><a class="button" href="' .
			esc_url(admin_url('edit.php?post_type=wp_block')) . '">' .
			esc_html__('Manage all saved components', 'kpf-core') . '</a> ';
		echo '<a class="button" href="' .
			esc_url(admin_url('edit-tags.php?taxonomy=' . Groups::TAXONOMY . '&post_type=wp_block')) . '">' .
			esc_html__('Manage group hierarchy', 'kpf-core') . '</a></p>';

		echo '<form method="get" style="display:flex;gap:8px;align-items:flex-end;margin:20px 0;">';
		echo '<input type="hidden" name="page" value="kpf-components" />';
		echo '<label><span class="screen-reader-text">' .
			esc_html__('Search components', 'kpf-core') .
			'</span><input type="search" name="s" value="' .
			esc_attr($search) . '" placeholder="' .
			esc_attr__('Search components', 'kpf-core') . '" /></label>';
		self::group_select($terms, $selected);
		submit_button(__('Filter', 'kpf-core'), 'secondary', 'filter_action', false);
		echo '</form>';

		if (! $posts) {
			echo '<div class="notice notice-warning inline"><p>' .
				esc_html__('No saved components match these filters.', 'kpf-core') .
				'</p></div>';
			echo '</div>';
			return;
		}

		echo '<div class="kpf-component-tree" style="max-width:920px;">';
		self::render_tree($terms, $grouped, 0, 0);
		if (! empty($grouped[0])) {
			self::render_group(__('Ungrouped', 'kpf-core'), $grouped[0], 0);
		}
		echo '</div></div>';
	}

	/**
	 * @return array<int, WP_Post>
	 */
	private static function components(string $search, int $group): array {
		$args = array(
			'post_type'      => 'wp_block',
			'post_status'    => array( 'publish', 'draft' ),
			'posts_per_page' => 200,
			'orderby'        => 'title',
			'order'          => 'ASC',
			's'              => $search,
		);

		if ($group > 0) {
			$args['tax_query'] = array(
				array(
					'taxonomy'         => Groups::TAXONOMY,
					'field'            => 'term_id',
					'terms'            => $group,
					'include_children' => true,
				),
			);
		}

		return get_posts($args);
	}

	/**
	 * @param array<int, WP_Post> $posts
	 * @return array<int, array<int, WP_Post>>
	 */
	private static function group_posts(array $posts): array {
		$grouped = array();
		foreach ($posts as $post) {
			$terms = wp_get_object_terms($post->ID, Groups::TAXONOMY, array( 'fields' => 'ids' ));
			if (is_wp_error($terms) || ! $terms) {
				$grouped[0][] = $post;
				continue;
			}

			foreach ($terms as $term_id) {
				$grouped[ (int) $term_id ][] = $post;
			}
		}
		return $grouped;
	}

	/**
	 * @param array<int, WP_Term>               $terms
	 * @param array<int, array<int, WP_Post>>   $grouped
	 */
	private static function render_tree(array $terms, array $grouped, int $parent, int $depth): void {
		foreach ($terms as $term) {
			if ((int) $term->parent !== $parent) {
				continue;
			}

			$children = array_filter(
				$terms,
				static fn (WP_Term $candidate): bool => (int) $candidate->parent === (int) $term->term_id
			);
			$items    = $grouped[ (int) $term->term_id ] ?? array();
			$total    = self::group_count($terms, $grouped, (int) $term->term_id);

			echo '<details open style="margin-left:' . esc_attr((string) ($depth * 18)) .
				'px;border-left:2px solid #dcdcde;padding-left:12px;margin-bottom:10px;">';
			echo '<summary style="cursor:pointer;padding:8px 0;"><strong>' .
				esc_html($term->name) . '</strong> <span style="color:#646970;">(' .
				esc_html((string) $total) . ')</span></summary>';
			if ($items) {
				self::render_group($term->name, $items, $depth);
			}
			if ($children) {
				self::render_tree($terms, $grouped, (int) $term->term_id, $depth + 1);
			}
			echo '</details>';
		}
	}

	/**
	 * @param array<int, WP_Term>             $terms
	 * @param array<int, array<int, WP_Post>> $grouped
	 */
	private static function group_count(array $terms, array $grouped, int $term_id): int {
		$count = count($grouped[ $term_id ] ?? array());
		foreach ($terms as $term) {
			if ((int) $term->parent === $term_id) {
				$count += self::group_count($terms, $grouped, (int) $term->term_id);
			}
		}
		return $count;
	}

	/**
	 * @param array<int, WP_Post> $posts
	 */
	private static function render_group(string $label, array $posts, int $depth): void {
		unset($label, $depth);
		echo '<ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:8px 0 14px;">';
		foreach ($posts as $post) {
			$sync_status = (string) get_post_meta($post->ID, 'wp_pattern_sync_status', true);
			$mode        = 'unsynced' === $sync_status
				? __('Independent copies', 'kpf-core')
				: __('Synced everywhere', 'kpf-core');
			echo '<li style="background:#fff;border:1px solid #dcdcde;border-radius:4px;padding:12px;margin:0;">';
			echo '<a href="' . esc_url(get_edit_post_link($post->ID, 'raw') ?: '#') .
				'"><strong>' . esc_html(get_the_title($post) ?: __('Untitled component', 'kpf-core')) .
				'</strong></a>';
			echo '<p style="margin:5px 0 0;color:#646970;">' . esc_html($mode) . '</p>';
			echo '</li>';
		}
		echo '</ul>';
	}

	/**
	 * @param array<int, WP_Term> $terms
	 */
	private static function group_select(array $terms, int $selected): void {
		echo '<label><span class="screen-reader-text">' .
			esc_html__('Filter by component group', 'kpf-core') .
			'</span><select name="group">';
		echo '<option value="0">' . esc_html__('All groups', 'kpf-core') . '</option>';
		self::group_options($terms, 0, 0, $selected);
		echo '</select></label>';
	}

	/**
	 * @param array<int, WP_Term> $terms
	 */
	private static function group_options(
		array $terms,
		int $parent,
		int $depth,
		int $selected
	): void {
		foreach ($terms as $term) {
			if ((int) $term->parent !== $parent) {
				continue;
			}
			echo '<option value="' . esc_attr((string) $term->term_id) . '"' .
				selected($selected, (int) $term->term_id, false) . '>' .
				esc_html(str_repeat('— ', $depth) . $term->name) . '</option>';
			self::group_options($terms, (int) $term->term_id, $depth + 1, $selected);
		}
	}
}

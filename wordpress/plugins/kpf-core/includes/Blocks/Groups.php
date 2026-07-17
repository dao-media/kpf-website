<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

use WP_Query;

final class Groups {
	public const TAXONOMY = 'kpf_component_group';

	public static function register(): void {
		add_action('init', array( self::class, 'register_taxonomy' ), 6);
		add_action('init', array( self::class, 'seed_groups' ), 30);
		add_action('restrict_manage_posts', array( self::class, 'render_filter' ));
		add_action('pre_get_posts', array( self::class, 'apply_filter' ));
	}

	public static function register_taxonomy(): void {
		register_taxonomy(
			self::TAXONOMY,
			array( 'wp_block' ),
			array(
				'labels'            => array(
					'name'              => __('Component Groups', 'kpf-core'),
					'singular_name'     => __('Component Group', 'kpf-core'),
					'search_items'      => __('Search component groups', 'kpf-core'),
					'all_items'         => __('All component groups', 'kpf-core'),
					'parent_item'       => __('Parent component group', 'kpf-core'),
					'parent_item_colon' => __('Parent component group:', 'kpf-core'),
					'edit_item'         => __('Edit component group', 'kpf-core'),
					'update_item'       => __('Update component group', 'kpf-core'),
					'add_new_item'      => __('Add component group', 'kpf-core'),
					'new_item_name'     => __('New component group name', 'kpf-core'),
					'menu_name'         => __('Component Groups', 'kpf-core'),
				),
				'description'       => __(
					'Nested folders used to organize saved components and patterns.',
					'kpf-core'
				),
				'public'            => false,
				'publicly_queryable' => false,
				'hierarchical'      => true,
				'show_ui'           => true,
				'show_admin_column' => true,
				'show_in_rest'      => true,
				'show_in_nav_menus' => false,
				'show_tagcloud'     => false,
				'rewrite'           => false,
				'query_var'         => true,
				'capabilities'      => array(
					'manage_terms' => 'edit_theme_options',
					'edit_terms'   => 'edit_theme_options',
					'delete_terms' => 'edit_theme_options',
					'assign_terms' => 'edit_posts',
				),
			)
		);
	}

	public static function seed_groups(): void {
		if ('1' === get_option('kpf_component_groups_seeded')) {
			return;
		}

		$root = self::ensure_term(__('Foundation Components', 'kpf-core'), 0, 'foundation-components');
		if ($root > 0) {
			self::ensure_term(__('Actions', 'kpf-core'), $root, 'actions');
			self::ensure_term(__('Content', 'kpf-core'), $root, 'content');
			self::ensure_term(__('Information', 'kpf-core'), $root, 'information');
		}

		update_option('kpf_component_groups_seeded', '1', false);
	}

	public static function render_filter(string $post_type): void {
		if ('wp_block' !== $post_type) {
			return;
		}

		$selected = isset($_GET[ self::TAXONOMY ]) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_title(wp_unslash($_GET[ self::TAXONOMY ])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		wp_dropdown_categories(
			array(
				'taxonomy'          => self::TAXONOMY,
				'name'              => self::TAXONOMY,
				'id'                => 'kpf-component-group-filter',
				'show_option_all'   => __('All component groups', 'kpf-core'),
				'hide_empty'        => false,
				'hierarchical'      => true,
				'show_count'        => true,
				'orderby'           => 'name',
				'selected'          => $selected,
				'value_field'       => 'slug',
				'option_none_value' => '',
			)
		);
	}

	public static function apply_filter(WP_Query $query): void {
		global $pagenow;

		if (
			! is_admin() ||
			'edit.php' !== $pagenow ||
			'wp_block' !== $query->get('post_type') ||
			empty($_GET[ self::TAXONOMY ]) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		) {
			return;
		}

		$query->set(
			'tax_query',
			array(
				array(
					'taxonomy'         => self::TAXONOMY,
					'field'            => 'slug',
					'terms'            => sanitize_title(
						wp_unslash($_GET[ self::TAXONOMY ]) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
					),
					'include_children' => true,
				),
			)
		);
	}

	private static function ensure_term(string $name, int $parent, string $slug): int {
		$existing = term_exists($slug, self::TAXONOMY);
		if ($existing) {
			return is_array($existing) ? (int) $existing['term_id'] : (int) $existing;
		}

		$created = wp_insert_term(
			$name,
			self::TAXONOMY,
			array(
				'parent' => $parent,
				'slug'   => $slug,
			)
		);

		return is_wp_error($created) ? 0 : (int) $created['term_id'];
	}
}

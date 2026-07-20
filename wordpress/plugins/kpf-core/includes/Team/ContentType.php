<?php

declare(strict_types=1);

namespace KPF\Core\Team;

final class ContentType {
	public const POST_TYPE    = 'kpf_team';
	public const REWRITE_SLUG = 'profile';

	public static function register(): void {
		add_action('init', array( self::class, 'register_content' ), 5);
		add_filter('wp_insert_post_data', array( self::class, 'normalize_slug' ), 10, 2);
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'                  => __('Team', 'kpf-core'),
					'singular_name'         => __('Team member', 'kpf-core'),
					'add_new'               => __('Add New', 'kpf-core'),
					'add_new_item'          => __('Add Team Member', 'kpf-core'),
					'edit_item'             => __('Edit Team Member', 'kpf-core'),
					'new_item'              => __('New Team Member', 'kpf-core'),
					'view_item'             => __('View Team Member', 'kpf-core'),
					'search_items'          => __('Search team', 'kpf-core'),
					'not_found'             => __('No team members found.', 'kpf-core'),
					'not_found_in_trash'    => __('No team members found in Trash.', 'kpf-core'),
					'all_items'             => __('Manage', 'kpf-core'),
					'item_published'        => __('Team member published.', 'kpf-core'),
					'item_updated'          => __('Team member updated.', 'kpf-core'),
					'featured_image'        => __('Profile image', 'kpf-core'),
					'set_featured_image'    => __('Set profile image', 'kpf-core'),
					'remove_featured_image' => __('Remove profile image', 'kpf-core'),
					'menu_name'             => __('Team', 'kpf-core'),
				),
				'description'         => __('Foundation team member profiles.', 'kpf-core'),
				'public'              => true,
				'publicly_queryable'  => true,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'teamMember',
				'graphql_plural_name' => 'teamMembers',
				// Icon is provided by Lucide in admin-shell (`UsersRound`).
				'menu_icon'           => 'none',
				'menu_position'       => null,
				'supports'            => array(
					'title',
					'editor',
					'thumbnail',
					'revisions',
					'custom-fields',
				),
				'has_archive'         => false,
				'rewrite'             => array(
					'slug'       => self::REWRITE_SLUG,
					'with_front' => false,
				),
				'query_var'           => true,
				'delete_with_user'    => false,
				'map_meta_cap'        => true,
				'capability_type'     => array( 'kpf_team_member', 'kpf_team_members' ),
				'capabilities'        => self::capabilities(),
			)
		);
	}

	/**
	 * Prefer /profile/firstnamelastname (no hyphens/spaces).
	 *
	 * @param array<string, mixed> $data
	 * @param array<string, mixed> $postarr
	 * @return array<string, mixed>
	 */
	public static function normalize_slug(array $data, array $postarr): array {
		if (( $data['post_type'] ?? '' ) !== self::POST_TYPE) {
			return $data;
		}

		$title = (string) ( $data['post_title'] ?? '' );
		$slug  = (string) ( $data['post_name'] ?? '' );

		// Keep an explicitly chosen slug when the editor already set one that looks compacted.
		if ('' !== $slug && ! str_contains($slug, '-') && ! str_contains($slug, ' ')) {
			$data['post_name'] = sanitize_title($slug);
			return $data;
		}

		$source = '' !== $slug ? $slug : $title;
		$compact = preg_replace('/[^a-z0-9]+/', '', strtolower($source)) ?? '';
		if ('' !== $compact) {
			$data['post_name'] = $compact;
		}

		return $data;
	}

	/**
	 * @return array<string, string>
	 */
	private static function capabilities(): array {
		return array(
			'edit_post'              => 'edit_post',
			'read_post'              => 'read_post',
			'delete_post'            => 'delete_post',
			'edit_posts'             => 'edit_posts',
			'edit_others_posts'      => 'edit_others_posts',
			'publish_posts'          => 'publish_posts',
			'read_private_posts'     => 'read_private_posts',
			'delete_posts'           => 'delete_posts',
			'delete_private_posts'   => 'delete_private_posts',
			'delete_published_posts' => 'delete_published_posts',
			'delete_others_posts'    => 'delete_others_posts',
			'edit_private_posts'     => 'edit_private_posts',
			'edit_published_posts'   => 'edit_published_posts',
			'create_posts'           => 'edit_posts',
		);
	}
}

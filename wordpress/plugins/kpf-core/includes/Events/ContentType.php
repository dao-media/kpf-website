<?php

declare(strict_types=1);

namespace KPF\Core\Events;

final class ContentType {
	public const POST_TYPE         = 'kpf_event';
	public const LIVE_TAXONOMY     = 'kpf_live_event';
	public const PARTNER_TAXONOMY  = 'kpf_event_partner';
	public const REWRITE_SLUG      = 'event';
	public const OCCURRENCE_QUERY  = 'kpf_event_date';
	public const PARTNER_LOGO_META = '_kpf_partner_logo';

	public static function register(): void {
		add_action('init', array( self::class, 'register_content' ), 5);
		add_action('init', array( self::class, 'register_rewrites' ), 20);
		add_action('init', array( self::class, 'maybe_seed_live_events' ), 30);
		add_filter('query_vars', array( self::class, 'query_vars' ));
		add_filter('post_type_link', array( self::class, 'filter_permalink' ), 10, 2);
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'                  => __('Events', 'kpf-core'),
					'singular_name'         => __('Event', 'kpf-core'),
					'add_new'               => __('Add Event', 'kpf-core'),
					'add_new_item'          => __('Add Event', 'kpf-core'),
					'edit_item'             => __('Edit Event', 'kpf-core'),
					'new_item'              => __('New Event', 'kpf-core'),
					'view_item'             => __('View Event', 'kpf-core'),
					'search_items'          => __('Search Events', 'kpf-core'),
					'not_found'             => __('No events found.', 'kpf-core'),
					'not_found_in_trash'    => __('No events found in Trash.', 'kpf-core'),
					'all_items'             => __('All Events', 'kpf-core'),
					'item_published'        => __('Event published.', 'kpf-core'),
					'item_updated'          => __('Event updated.', 'kpf-core'),
					'featured_image'        => __('Event image', 'kpf-core'),
					'set_featured_image'    => __('Set event image', 'kpf-core'),
					'remove_featured_image' => __('Remove event image', 'kpf-core'),
					'menu_name'             => __('Events', 'kpf-core'),
				),
				'description'         => __('Foundation events with scheduling, hosts, and partner details.', 'kpf-core'),
				'public'              => true,
				'publicly_queryable'  => true,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'foundationEvent',
				'graphql_plural_name' => 'foundationEvents',
				// Icon is provided by Lucide in admin-shell (`CalendarDays`).
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
				'capability_type'     => array( 'kpf_event', 'kpf_events' ),
				'capabilities'        => self::capabilities(),
			)
		);

		register_taxonomy(
			self::LIVE_TAXONOMY,
			array( self::POST_TYPE ),
			array(
				'labels'              => array(
					'name'                       => __('Live Events', 'kpf-core'),
					'singular_name'              => __('Live Event', 'kpf-core'),
					'search_items'               => __('Search live events', 'kpf-core'),
					'all_items'                  => __('All live events', 'kpf-core'),
					'edit_item'                  => __('Edit live event', 'kpf-core'),
					'update_item'                => __('Update live event', 'kpf-core'),
					'add_new_item'               => __('Add live event type', 'kpf-core'),
					'new_item_name'              => __('New live event type', 'kpf-core'),
					'separate_items_with_commas' => __('Separate live event types with commas', 'kpf-core'),
					'add_or_remove_items'        => __('Add or remove live event types', 'kpf-core'),
					'choose_from_most_used'      => __('Choose from the most used live event types', 'kpf-core'),
					'menu_name'                  => __('Live Events', 'kpf-core'),
				),
				'description'         => __('Kinds of live entertainment or programming at an event.', 'kpf-core'),
				'public'              => false,
				'show_ui'             => true,
				'show_admin_column'   => true,
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'liveEventType',
				'graphql_plural_name' => 'liveEventTypes',
				'hierarchical'        => false,
				'rewrite'             => false,
			)
		);

		register_taxonomy(
			self::PARTNER_TAXONOMY,
			array( self::POST_TYPE ),
			array(
				'labels'              => array(
					'name'                       => __('Co-Hosts', 'kpf-core'),
					'singular_name'              => __('Co-Host', 'kpf-core'),
					'search_items'               => __('Search co-hosts', 'kpf-core'),
					'all_items'                  => __('All co-hosts', 'kpf-core'),
					'edit_item'                  => __('Edit co-host', 'kpf-core'),
					'update_item'                => __('Update co-host', 'kpf-core'),
					'add_new_item'               => __('Add co-host / partner', 'kpf-core'),
					'new_item_name'              => __('New co-host name', 'kpf-core'),
					'separate_items_with_commas' => __('Separate co-hosts with commas', 'kpf-core'),
					'add_or_remove_items'        => __('Add or remove co-hosts', 'kpf-core'),
					'choose_from_most_used'      => __('Choose from the most used co-hosts', 'kpf-core'),
					'menu_name'                  => __('Co-Hosts', 'kpf-core'),
				),
				'description'         => __('Partner organizations that co-host events. Each may include a logo.', 'kpf-core'),
				'public'              => false,
				'show_ui'             => true,
				'show_admin_column'   => true,
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'eventPartner',
				'graphql_plural_name' => 'eventPartners',
				'hierarchical'        => false,
				'rewrite'             => false,
			)
		);

		register_term_meta(
			self::PARTNER_TAXONOMY,
				self::PARTNER_LOGO_META,
			array(
				'type'              => 'integer',
				'single'            => true,
				'default'           => 0,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => static function (): bool {
					return current_user_can('edit_posts');
				},
			)
		);
	}

	public static function register_rewrites(): void {
		add_rewrite_rule(
			'^' . self::REWRITE_SLUG . '/([^/]+)_([0-9]{8})/?$',
			'index.php?post_type=' . self::POST_TYPE . '&name=$matches[1]&' . self::OCCURRENCE_QUERY . '=$matches[2]',
			'top'
		);
	}

	/**
	 * @param array<int, string> $vars
	 * @return array<int, string>
	 */
	public static function query_vars(array $vars): array {
		$vars[] = self::OCCURRENCE_QUERY;
		return $vars;
	}

	public static function filter_permalink(string $permalink, \WP_Post $post): string {
		if (self::POST_TYPE !== $post->post_type) {
			return $permalink;
		}

		$occurrence = get_query_var(self::OCCURRENCE_QUERY);
		if (! is_string($occurrence) || ! preg_match('/^\d{8}$/', $occurrence)) {
			return $permalink;
		}

		$base = untrailingslashit(get_permalink($post));
		if (! is_string($base) || '' === $base) {
			return $permalink;
		}

		return $base . '_' . $occurrence . '/';
	}

	/**
	 * Build a public occurrence URL for a recurring event date (MMDDYYYY).
	 */
	public static function occurrence_url(int $post_id, string $ymd): string {
		$post = get_post($post_id);
		if (! $post || self::POST_TYPE !== $post->post_type) {
			return '';
		}

		// Prefer MMDDYYYY in the public URL. Accept YYYY-MM-DD input from editors.
		if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $ymd, $m)) {
			$date = $m[2] . $m[3] . $m[1];
		} elseif (preg_match('/^\d{8}$/', $ymd)) {
			$date = $ymd;
		} else {
			return (string) get_permalink($post_id);
		}

		$slug = $post->post_name;
		if ('' === $slug) {
			return (string) get_permalink($post_id);
		}

		return home_url(user_trailingslashit(self::REWRITE_SLUG . '/' . $slug . '_' . $date));
	}

	public static function maybe_seed_live_events(): void {
		if (get_option('kpf_live_events_seeded')) {
			return;
		}

		$defaults = array(
			'Activities',
			'Music',
			'Dance/Theater',
			'Acrobatics',
			'Magic Show',
			'Comedy',
			'Speakers',
			'Sports',
			'Workshops',
			'Family Fun',
		);

		foreach ($defaults as $name) {
			if (! term_exists($name, self::LIVE_TAXONOMY)) {
				wp_insert_term($name, self::LIVE_TAXONOMY);
			}
		}

		update_option('kpf_live_events_seeded', '1', false);
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

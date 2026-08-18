<?php

declare(strict_types=1);

namespace KPF\Core\Events;

final class ContentType {
	public const POST_TYPE      = 'kpf_event';
	public const HOST_TAXONOMY  = 'kpf_event_host';
	public const HOST_LOGO_META = '_kpf_host_logo';

	/** @deprecated Old co-host taxonomy slug; migrated to HOST_TAXONOMY. */
	public const LEGACY_PARTNER_TAXONOMY = 'kpf_event_partner';

	/** @deprecated Old logo meta key. */
	public const LEGACY_PARTNER_LOGO_META = '_kpf_partner_logo';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
		add_action( 'init', array( self::class, 'maybe_migrate_hosts' ), 6 );
		add_action( 'after_setup_theme', array( self::class, 'ensure_thumbnails' ), 20 );
	}

	/** Featured-image UI needs theme support; stub themes often omit it. */
	public static function ensure_thumbnails(): void {
		if ( ! current_theme_supports( 'post-thumbnails' ) ) {
			add_theme_support( 'post-thumbnails' );
		}
		add_post_type_support( self::POST_TYPE, 'thumbnail' );
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'                  => __( 'Events', 'kpf-core' ),
					'singular_name'         => __( 'Event', 'kpf-core' ),
					'add_new'               => __( 'Add New', 'kpf-core' ),
					'add_new_item'          => __( 'Add Event', 'kpf-core' ),
					'edit_item'             => __( 'Edit Event', 'kpf-core' ),
					'new_item'              => __( 'New Event', 'kpf-core' ),
					'view_item'             => __( 'View Event', 'kpf-core' ),
					'search_items'          => __( 'Search Events', 'kpf-core' ),
					'not_found'             => __( 'No events found.', 'kpf-core' ),
					'not_found_in_trash'    => __( 'No events found in Trash.', 'kpf-core' ),
					'all_items'             => __( 'Events', 'kpf-core' ),
					'item_published'        => __( 'Event published.', 'kpf-core' ),
					'item_updated'          => __( 'Event updated.', 'kpf-core' ),
					'featured_image'        => __( 'Event image', 'kpf-core' ),
					'set_featured_image'    => __( 'Set event image', 'kpf-core' ),
					'remove_featured_image' => __( 'Remove event image', 'kpf-core' ),
					'menu_name'             => __( 'Events', 'kpf-core' ),
				),
				'description'         => __(
					'Events shown as cards on the Events page — hosts, schedule frequency, and contact details.',
					'kpf-core'
				),
				/* Public like Kevin/Scrapbook so Faust GraphQL can read cards; not front-routable. */
				'public'              => true,
				'publicly_queryable'  => false,
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
					// Required so the block editor boots and Event details
					// (PluginDocumentSettingPanel) can enqueue/render.
					'editor',
					'thumbnail',
					'revisions',
					'custom-fields',
				),
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'delete_with_user'    => false,
				'map_meta_cap'        => true,
				'capability_type'     => 'post',
			)
		);

		register_taxonomy(
			self::HOST_TAXONOMY,
			array( self::POST_TYPE ),
			array(
				'labels'              => array(
					'name'                       => __( 'Hosts', 'kpf-core' ),
					'singular_name'              => __( 'Host', 'kpf-core' ),
					'search_items'               => __( 'Search hosts', 'kpf-core' ),
					'all_items'                  => __( 'All hosts', 'kpf-core' ),
					'edit_item'                  => __( 'Edit host', 'kpf-core' ),
					'update_item'                => __( 'Update host', 'kpf-core' ),
					'add_new_item'               => __( 'Add host', 'kpf-core' ),
					'new_item_name'              => __( 'New host name', 'kpf-core' ),
					'separate_items_with_commas' => __( 'Separate hosts with commas', 'kpf-core' ),
					'add_or_remove_items'        => __( 'Add or remove hosts', 'kpf-core' ),
					'choose_from_most_used'      => __( 'Choose from the most used hosts', 'kpf-core' ),
					'menu_name'                  => __( 'Hosts', 'kpf-core' ),
				),
				'description'         => __(
					'Organizations or people that host events. Each may include a logo. Used for filtering in Queries.',
					'kpf-core'
				),
				'public'              => false,
				'show_ui'             => true,
				'show_admin_column'   => false,
				// Nest under Events so hosts + logos are managed in one place.
				'show_in_menu'        => 'edit.php?post_type=' . self::POST_TYPE,
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'eventHost',
				'graphql_plural_name' => 'eventHosts',
				'hierarchical'        => false,
				'rewrite'             => false,
			)
		);

		register_term_meta(
			self::HOST_TAXONOMY,
			self::HOST_LOGO_META,
			array(
				'type'              => 'integer',
				'single'            => true,
				'default'           => 0,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => static function (): bool {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}

	/**
	 * One-time migrate legacy co-host taxonomy + logo meta to Hosts.
	 */
	public static function maybe_migrate_hosts(): void {
		if ( get_option( 'kpf_event_hosts_migrated' ) ) {
			return;
		}

		global $wpdb;
		if ( isset( $wpdb ) && $wpdb instanceof \wpdb ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->update(
				$wpdb->term_taxonomy,
				array( 'taxonomy' => self::HOST_TAXONOMY ),
				array( 'taxonomy' => self::LEGACY_PARTNER_TAXONOMY ),
				array( '%s' ),
				array( '%s' )
			);
		}

		$terms = get_terms(
			array(
				'taxonomy'   => self::HOST_TAXONOMY,
				'hide_empty' => false,
				'fields'     => 'ids',
			)
		);
		if ( ! is_wp_error( $terms ) ) {
			foreach ( $terms as $term_id ) {
				$term_id = (int) $term_id;
				$legacy  = (int) get_term_meta( $term_id, self::LEGACY_PARTNER_LOGO_META, true );
				$current = (int) get_term_meta( $term_id, self::HOST_LOGO_META, true );
				if ( $legacy > 0 && $current < 1 ) {
					update_term_meta( $term_id, self::HOST_LOGO_META, $legacy );
				}
				if ( $legacy > 0 ) {
					delete_term_meta( $term_id, self::LEGACY_PARTNER_LOGO_META );
				}
			}
		}

		update_option( 'kpf_event_hosts_migrated', '1', false );
	}
}

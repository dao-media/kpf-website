<?php

declare(strict_types=1);

namespace KPF\Core\Grants;

final class ContentType {
	public const POST_TYPE = 'kpf_grant';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_content' ), 5 );
		add_action( 'init', array( self::class, 'maybe_migrate_from_grantees' ), 20 );
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'               => __( 'Grants', 'kpf-core' ),
					'singular_name'      => __( 'Grant', 'kpf-core' ),
					'add_new'            => __( 'Add New', 'kpf-core' ),
					'add_new_item'       => __( 'Add grant', 'kpf-core' ),
					'edit_item'          => __( 'Edit grant', 'kpf-core' ),
					'new_item'           => __( 'New grant', 'kpf-core' ),
					'view_item'          => __( 'View grant', 'kpf-core' ),
					'search_items'       => __( 'Search grants', 'kpf-core' ),
					'not_found'          => __( 'No grants found.', 'kpf-core' ),
					'not_found_in_trash' => __( 'No grants found in Trash.', 'kpf-core' ),
					'all_items'          => __( 'Grants', 'kpf-core' ),
					'item_published'     => __( 'Grant published.', 'kpf-core' ),
					'item_updated'       => __( 'Grant updated.', 'kpf-core' ),
					'menu_name'          => __( 'Grants', 'kpf-core' ),
				),
				'description'         => __(
					'Individual Foundation awards: recipient, date, amount, and check presentation photo.',
					'kpf-core'
				),
				/* Public like Kevin so Code → Queries can target this type; not front-routable. */
				'public'              => true,
				'publicly_queryable'  => false,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => true,
				'show_in_graphql'     => true,
				'graphql_single_name' => 'grant',
				'graphql_plural_name' => 'grants',
				// Icon is provided by Lucide in admin-shell (`HandCoins`).
				'menu_icon'           => 'none',
				'menu_position'       => null,
				'supports'            => array(
					'title',
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
	}

	/**
	 * One-shot split of legacy grantee posts (org + award on one CPT) into
	 * canonical grantees + grant posts. Preserves logos and check photos.
	 */
	public static function maybe_migrate_from_grantees(): void {
		if ( get_option( Migration::OPTION_KEY ) ) {
			return;
		}
		if ( ! post_type_exists( self::POST_TYPE ) || ! post_type_exists( \KPF\Core\Grantees\ContentType::POST_TYPE ) ) {
			return;
		}
		Migration::run();
	}
}

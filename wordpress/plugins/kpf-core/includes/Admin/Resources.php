<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

use KPF\Core\Grantees\ContentType as GranteesContentType;
use KPF\Core\Kevin\ContentType as KevinContentType;

/**
 * Dashboard → Resources: editorial how-to cards for common CMS tasks.
 */
final class Resources {
	public const MENU_SLUG = 'kpf-resources';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 9 );
		add_action( 'admin_menu', array( self::class, 'reorder_dashboard_submenu' ), 999 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
		add_filter( 'admin_body_class', array( self::class, 'body_class' ) );
	}

	public static function menu(): void {
		add_submenu_page(
			'index.php',
			__( 'Resources', 'kpf-core' ),
			__( 'Resources', 'kpf-core' ),
			'edit_posts',
			self::MENU_SLUG,
			array( self::class, 'render' )
		);
	}

	/**
	 * Keep Resources between Home and Updates under Dashboard.
	 */
	public static function reorder_dashboard_submenu(): void {
		global $submenu;

		if ( ! is_array( $submenu['index.php'] ?? null ) ) {
			return;
		}

		$home      = null;
		$resources = null;
		$updates   = null;
		$rest      = array();

		foreach ( $submenu['index.php'] as $item ) {
			$slug = (string) ( $item[2] ?? '' );
			if ( 'index.php' === $slug ) {
				$home = $item;
			} elseif ( self::MENU_SLUG === $slug ) {
				$resources = $item;
			} elseif ( 'update-core.php' === $slug ) {
				$updates = $item;
			} else {
				$rest[] = $item;
			}
		}

		$ordered = array();
		if ( null !== $home ) {
			$ordered[] = $home;
		}
		if ( null !== $resources ) {
			$ordered[] = $resources;
		}
		if ( null !== $updates ) {
			$ordered[] = $updates;
		}

		$submenu['index.php'] = array_merge( $ordered, $rest );
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( esc_html__( 'You do not have permission to view Resources.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-resources-wrap">';
		echo '<div id="kpf-resources-admin-root"></div>';
		echo '<noscript><p>' . esc_html__( 'Enable JavaScript to view Resources.', 'kpf-core' ) . '</p></noscript>';
		echo '</div>';
	}

	public static function enqueue( string $hook ): void {
		// Under Dashboard (index.php) WP uses admin_page_{slug}; keep dashboard_page_ as a fallback.
		if ( ! in_array( $hook, array( 'admin_page_' . self::MENU_SLUG, 'dashboard_page_' . self::MENU_SLUG ), true ) ) {
			$page = isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				: '';
			if ( self::MENU_SLUG !== $page ) {
				return;
			}
		}

		$asset_file = KPF_CORE_PATH . 'build/resources-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-element', 'wp-i18n' ),
				'version'      => KPF_CORE_VERSION,
			);

		$style_file = KPF_CORE_PATH . 'build/resources-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-resources-admin',
				KPF_CORE_URL . 'build/resources-admin.css',
				array(),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-resources-admin',
			KPF_CORE_URL . 'build/resources-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		wp_localize_script( 'kpf-resources-admin', 'kpfResourcesAdmin', self::data() );
	}

	public static function body_class( string $classes ): string {
		$page = isset( $_GET['page'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';
		return self::MENU_SLUG === $page ? $classes . ' kpf-resources-screen' : $classes;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function data(): array {
		return array(
			'title'       => __( 'Resources', 'kpf-core' ),
			'description' => __(
				'Short how-tos for common Kevin Popke Foundation CMS tasks. Open a card when you need the checklist.',
				'kpf-core'
			),
			'cards'       => self::cards(),
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function cards(): array {
		$kevin_list = admin_url( 'edit.php?post_type=' . KevinContentType::POST_TYPE );
		$kevin_new  = admin_url( 'post-new.php?post_type=' . KevinContentType::POST_TYPE );
		$grantee_list = admin_url( 'edit.php?post_type=' . GranteesContentType::POST_TYPE );
		$grantee_new  = admin_url( 'post-new.php?post_type=' . GranteesContentType::POST_TYPE );

		return array(
			array(
				'id'          => 'kevin-story',
				'icon'        => 'BookHeart',
				'title'       => __( 'Adding to Kevin’s Story', 'kpf-core' ),
				'summary'     => __(
					'Photo + header + body slides for the About page “Who Kevin was” stack (Scrapbook → Kevin).',
					'kpf-core'
				),
				'sections'    => array(
					array(
						'title' => __( 'Slide photo', 'kpf-core' ),
						'items' => array(
							__( 'Use a portrait frame of <strong>1120×1296</strong> pixels (same ratio the About carousel crops to).', 'kpf-core' ),
							__( 'Export as <strong>PNG or WebP with a transparent background</strong> — the photo sits on parchment, so any solid backdrop will show as a box.', 'kpf-core' ),
							__( 'Set the image as the slide’s <strong>featured image</strong> (“Slide photo”).', 'kpf-core' ),
						),
					),
					array(
						'title' => __( 'Copy', 'kpf-core' ),
						'items' => array(
							__( '<strong>Title</strong> → the story-card header (short, name-or-moment style).', 'kpf-core' ),
							__( '<strong>Body</strong> (block editor content) → the supporting paragraph on the card. Keep it to a few sentences.', 'kpf-core' ),
						),
					),
					array(
						'title' => __( 'Order in the stack', 'kpf-core' ),
						'items' => array(
							__( 'Open <strong>Page Attributes → Order</strong> (or the Order column on the Kevin list).', 'kpf-core' ),
							__( 'Slides sort by <strong>menu order ascending</strong> — lower numbers appear earlier in the designed sequence.', 'kpf-core' ),
							__( 'After adding a slide, update Order on the new item <em>and</em> neighbors so the stack matches the intended left-to-right / front-to-back layout.', 'kpf-core' ),
							__( 'The About page query uses this order (up to 12 slides). Publish when ready.', 'kpf-core' ),
						),
					),
				),
				'actions'     => array(
					array(
						'label'   => __( 'Add Kevin slide', 'kpf-core' ),
						'url'     => $kevin_new,
						'primary' => true,
					),
					array(
						'label'   => __( 'All Kevin slides', 'kpf-core' ),
						'url'     => $kevin_list,
						'primary' => false,
					),
				),
			),
			array(
				'id'          => 'grantee',
				'icon'        => 'Users',
				'title'       => __( 'Adding a Grantee', 'kpf-core' ),
				'summary'     => __(
					'Organizations that receive grants and appear in the partners slider (Grants → Grantees).',
					'kpf-core'
				),
				'sections'    => array(
					array(
						'title' => __( 'Organization', 'kpf-core' ),
						'items' => array(
							__( '<strong>Title</strong> → organization name (shown on partner chips and grant cards).', 'kpf-core' ),
							__( '<strong>Logo / profile image</strong> → featured image. Prefer JPEG, PNG, or SVG; square or clear mark works best.', 'kpf-core' ),
						),
					),
					array(
						'title' => __( 'Grantee details sidebar', 'kpf-core' ),
						'items' => array(
							__( '<strong>Website</strong> → preferred public URL (include https:// when possible). Powers the Website chip.', 'kpf-core' ),
							__( '<strong>Mission / blurb</strong> → optional short description for the partners slider.', 'kpf-core' ),
							__( '<strong>Point of contact</strong> → optional, admin-only (not shown on the site).', 'kpf-core' ),
						),
					),
					array(
						'title' => __( 'Awards & amounts', 'kpf-core' ),
						'items' => array(
							__( 'Grant dollars and award dates live on <strong>Grants</strong> posts, linked to this grantee — not on the grantee record itself.', 'kpf-core' ),
							__( 'After the grantee exists, create or edit a Grant and select them as the recipient.', 'kpf-core' ),
						),
					),
				),
				'actions'     => array(
					array(
						'label'   => __( 'Add grantee', 'kpf-core' ),
						'url'     => $grantee_new,
						'primary' => true,
					),
					array(
						'label'   => __( 'All grantees', 'kpf-core' ),
						'url'     => $grantee_list,
						'primary' => false,
					),
				),
			),
		);
	}
}

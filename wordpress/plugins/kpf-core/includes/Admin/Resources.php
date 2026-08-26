<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

use KPF\Core\Grantees\ContentType as GranteesContentType;
use KPF\Core\Grants\ContentType as GrantsContentType;
use KPF\Core\Kevin\ContentType as KevinContentType;
use KPF\Core\Scrapbook\ContentType as ScrapbookContentType;

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
		$groups = self::groups();

		return array(
			'title'       => __( 'Resources', 'kpf-core' ),
			'description' => __(
				'Short how-tos for common Kevin Popke Foundation CMS tasks. Open a card when you need the checklist.',
				'kpf-core'
			),
			'postTypeKey' => self::post_type_key(),
			'techStack'   => self::tech_stack(),
			'groups'      => $groups,
			// Flat list kept for smoke tests and older consumers.
			'cards'       => self::flatten_cards( $groups ),
		);
	}

	/**
	 * Legend for the main editorial post types / taxonomies.
	 *
	 * @return list<array{label: string, description: string}>
	 */
	public static function post_type_key(): array {
		return array(
			array(
				'label'       => __( 'Pages', 'kpf-core' ),
				'description' => __(
					'Public site pages. HTML copy is edited under Pages → Designs (Edit code & copy). Home, About, Events, Blog, Contact, and Privacy use built-in layouts, so their headlines and body copy do not come from that editor.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Scrapbook', 'kpf-core' ),
				'description' => __(
					'Largely About page items managed via photo groups (by event or occasion), all pooled into one infinite-load wall/mosaic.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Events', 'kpf-core' ),
				'description' => __(
					'Songwriters 4 Vets has a built-in feature section on the Events page; then all events (including S4V) appear as cards below.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Hosts', 'kpf-core' ),
				'description' => __(
					'Under Events — includes business name and logo.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Grants', 'kpf-core' ),
				'description' => __(
					'Checks awarded to grantees. Should include a ceremony image, and requires a Grantee to be added first.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Grantees', 'kpf-core' ),
				'description' => __(
					'Appears under Grants — the company, organization, or individual receiving the grant.',
					'kpf-core'
				),
			),
		);
	}

	/**
	 * Legend for the live project stack (frontend, CMS, hosting, and supporting services).
	 *
	 * @return list<array{label: string, description: string}>
	 */
	public static function tech_stack(): array {
		return array(
			array(
				'label'       => __( 'Public site', 'kpf-core' ),
				'description' => __(
					'Faust.js 3 and Next.js 16 (pages router) with React 18 and Apollo Client. Hosted on Vercel at kevinpopkefoundation.org.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'CMS', 'kpf-core' ),
				'description' => __(
					'Headless WordPress (PHP) on DreamHost (kpf.dreamhosters.com; admin.kevinpopkefoundation.org). FaustWP plugin. Stub theme kpf-blank — no public theme UI.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'GraphQL', 'kpf-core' ),
				'description' => __(
					'WPGraphQL and WPGraphQL Content Blocks. Faust reads SEO, page designs, queries, forms, Scrapbook, grants, events, and the global stylesheet over this API.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'kpf-core', 'kpf-core' ),
				'description' => __(
					'Custom plugin: Designs, Queries, Forms, GSAP interactions, SEO, Scrapbook, Grants, Events, Components, Tokens, Stylesheet, Inbox, and this Resources screen.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Admin UI', 'kpf-core' ),
				'description' => __(
					'React screens compiled with @wordpress/scripts (webpack). Icons from Lucide.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Motion', 'kpf-core' ),
				'description' => __(
					'GSAP 3 with Club plugins (ScrollTrigger, ScrollSmoother, MorphSVG, DrawSVG, SplitText, and others), authored under Interactions → GSAP.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Design', 'kpf-core' ),
				'description' => __(
					'Figma is the source of truth. Global CSS lives in Design → Stylesheet; page CSS twins live in the plugin and Faust (foundation.css / pages.css).',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Search', 'kpf-core' ),
				'description' => __(
					'MiniSearch builds a static index at frontend compile time for public site search.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Analytics', 'kpf-core' ),
				'description' => __(
					'Google Analytics 4 and Google Tag Manager on the public site.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Forms & spam', 'kpf-core' ),
				'description' => __(
					'Visual Forms builder. Cloudflare Turnstile, Google reCAPTCHA, and a honeypot.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Donations', 'kpf-core' ),
				'description' => __(
					'PayPal giving form from the public site Donate links.',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Local', 'kpf-core' ),
				'description' => __(
					'Node.js 20.9+, Docker Desktop, and @wordpress/env (WordPress on :8888, Faust on :3010).',
					'kpf-core'
				),
			),
			array(
				'label'       => __( 'Source', 'kpf-core' ),
				'description' => __(
					'GitHub. Frontend deploys from main via Vercel; the plugin and theme sync to DreamHost.',
					'kpf-core'
				),
			),
		);
	}

	/**
	 * Topic groups shown on Dashboard → Resources.
	 *
	 * @return list<array<string, mixed>>
	 */
	public static function groups(): array {
		$kevin_list     = admin_url( 'edit.php?post_type=' . KevinContentType::POST_TYPE );
		$kevin_new      = admin_url( 'post-new.php?post_type=' . KevinContentType::POST_TYPE );
		$scrapbook_list = admin_url( 'edit.php?post_type=' . ScrapbookContentType::POST_TYPE );
		$scrapbook_new  = admin_url( 'post-new.php?post_type=' . ScrapbookContentType::POST_TYPE );
		$grantee_list   = admin_url( 'edit.php?post_type=' . GranteesContentType::POST_TYPE );
		$grantee_new    = admin_url( 'post-new.php?post_type=' . GranteesContentType::POST_TYPE );
		$grant_list     = admin_url( 'edit.php?post_type=' . GrantsContentType::POST_TYPE );
		$grant_new      = admin_url( 'post-new.php?post_type=' . GrantsContentType::POST_TYPE );

		return array(
			array(
				'id'          => 'page-content',
				'title'       => __( 'Page content', 'kpf-core' ),
				'description' => __(
					'Change the text on HTML page designs. Built-in layouts (Home, About, Events, Blog, Contact, Privacy) do not use this editor.',
					'kpf-core'
				),
				'cards'       => array(
					self::card_editing_page_content(),
				),
			),
			array(
				'id'          => 'scrapbook',
				'title'       => __( 'Scrapbook', 'kpf-core' ),
				'description' => __(
					'About page “The work” mosaic. Photos and photo stories from Scrapbook → Add Media / Manage — not Kevin slides.',
					'kpf-core'
				),
				'cards'       => array(
					self::card_adding_scrapbook_item( $scrapbook_new, $scrapbook_list ),
					self::card_editing_scrapbook_items( $scrapbook_list ),
				),
			),
			array(
				'id'          => 'kevin-stories',
				'title'       => __( 'Kevin’s Stories', 'kpf-core' ),
				'description' => __(
					'About page “Who Kevin was” photo + copy slides (Scrapbook → Kevin).',
					'kpf-core'
				),
				'cards'       => array(
					self::card_adding_kevin_story( $kevin_new, $kevin_list ),
					self::card_editing_kevin_stories( $kevin_list ),
				),
			),
			array(
				'id'          => 'grants-partners',
				'title'       => __( 'Grants & partners', 'kpf-core' ),
				'description' => __(
					'Add the organization first, then each award. Grantees appear in the partners slider; grants appear as About page cards.',
					'kpf-core'
				),
				'cards'       => array(
					self::card_adding_grantee( $grantee_new, $grantee_list ),
					self::card_adding_grant( $grant_new, $grant_list ),
				),
			),
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function cards(): array {
		return self::flatten_cards( self::groups() );
	}

	/**
	 * @param list<array<string, mixed>> $groups
	 * @return list<array<string, mixed>>
	 */
	private static function flatten_cards( array $groups ): array {
		$cards = array();
		foreach ( $groups as $group ) {
			foreach ( (array) ( $group['cards'] ?? array() ) as $card ) {
				if ( ! is_array( $card ) ) {
					continue;
				}
				$card['groupId']    = (string) ( $group['id'] ?? '' );
				$card['groupTitle'] = (string) ( $group['title'] ?? '' );
				$cards[]            = $card;
			}
		}
		return $cards;
	}

	/**
	 * Screenshot shown at the top of a how-to card.
	 *
	 * @return array{src: string, alt: string, objectPosition?: string}|null
	 */
	private static function screenshot( string $filename, string $alt, string $object_position = '', string $caption = '' ): ?array {
		$relative = 'assets/media/resources/' . ltrim( $filename, '/' );
		$path     = KPF_CORE_PATH . $relative;
		if ( ! is_readable( $path ) ) {
			return null;
		}

		$shot = array(
			'src' => add_query_arg( 'ver', (string) filemtime( $path ), KPF_CORE_URL . $relative ),
			'alt' => $alt,
		);
		if ( '' !== $object_position ) {
			$shot['objectPosition'] = $object_position;
		}
		if ( '' !== $caption ) {
			$shot['caption'] = $caption;
		}
		return $shot;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function card_editing_page_content(): array {
		$designs_url = admin_url( 'edit.php?post_type=page&page=kpf-designs' );
		$pages_url   = admin_url( 'edit.php?post_type=page' );
		$list        = self::screenshot(
			'page-designs-list.webp',
			__( 'Pages → Designs list. Open a Ready row with Edit code & copy.', 'kpf-core' ),
			'left top',
			__( '1. Pages → Designs, then Edit code & copy', 'kpf-core' )
		);
		$editor      = self::screenshot(
			'page-designs-editor.webp',
			__( 'Design editor: Page copy fields on the left, Save design at the top right.', 'kpf-core' ),
			'left top',
			__( '2. Edit the left-hand Page copy fields, then Save design', 'kpf-core' )
		);
		$shots       = array_values( array_filter( array( $list, $editor ) ) );

		return array(
			'id'          => 'page-copy',
			'icon'        => 'FilePenLine',
			'title'       => __( 'Editing page content', 'kpf-core' ),
			'summary'     => __(
				'Open the page’s HTML design and change the text fields on the left. Save design when you are done.',
				'kpf-core'
			),
			'screenshot'  => $list,
			'screenshots' => $shots,
			'sections'    => array(
				array(
					'title' => __( 'Open the design', 'kpf-core' ),
					'items' => array(
						__( 'In the admin menu, go to <strong>Pages → Designs</strong> (not All Pages).', 'kpf-core' ),
						__( 'Stay on the <strong>Pages</strong> tab and find the page you want.', 'kpf-core' ),
						__( 'The row must say <strong>Ready</strong>. Then click <strong>Edit code & copy</strong>.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Edit the text', 'kpf-core' ),
					'items' => array(
						__( 'The left column is <strong>Page copy</strong>. Each field is one heading, paragraph, link, or button from the page.', 'kpf-core' ),
						__( 'Change those fields. You usually do not need the HTML or CSS on the right.', 'kpf-core' ),
						__( 'Use <strong>Find copy…</strong> if the list is long.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Save', 'kpf-core' ),
					'items' => array(
						__( 'Click <strong>Save design</strong> at the top right.', 'kpf-core' ),
						__( 'Wait until the status says <strong>All changes saved</strong> (it reads Unsaved changes until you save).', 'kpf-core' ),
						__( 'Hard-refresh the public page if you still see old copy.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'What this does not change', 'kpf-core' ),
					'items' => array(
						__( 'Even if <strong>Home, About, Events, Blog, Contact, or Privacy</strong> show as Ready, the public page still uses a built-in layout. Copy you save here will not appear on those live pages.', 'kpf-core' ),
						__( 'For those pages, use the other Resources cards (scrapbook photos, Kevin slides, grants, events) or ask a developer to change template copy.', 'kpf-core' ),
						__( 'If a row says <strong>No design</strong>, <strong>Edit code & copy</strong> is not available until an HTML design is applied.', 'kpf-core' ),
						__( 'Page title, slug, and SEO live on the page itself: <strong>Pages → All Pages</strong> → open the page → <strong>Save page</strong>.', 'kpf-core' ),
					),
				),
			),
			'actions'     => array(
				array(
					'label'   => __( 'Open Designs', 'kpf-core' ),
					'url'     => $designs_url,
					'primary' => true,
				),
				array(
					'label'   => __( 'All Pages', 'kpf-core' ),
					'url'     => $pages_url,
					'primary' => false,
				),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function card_adding_scrapbook_item( string $scrapbook_new, string $scrapbook_list ): array {
		$mosaic = self::screenshot(
			'scrapbook.webp',
			__( 'About page “The work” mosaic: photos from published scrapbook items.', 'kpf-core' ),
			'center 42%',
			__( 'About page “The work” mosaic', 'kpf-core' )
		);
		$editor = self::screenshot(
			'scrapbook-editor.webp',
			__( 'Scrapbook editor: description, Images box, and Scrapbook details in the sidebar.', 'kpf-core' ),
			'left top',
			__( 'Add Media editor: Images box and description', 'kpf-core' )
		);
		$shots  = array_values( array_filter( array( $mosaic, $editor ) ) );

		return array(
			'id'          => 'scrapbook-item',
			'icon'        => 'ImagePlus',
			'title'       => __( 'Adding a scrapbook item', 'kpf-core' ),
			'summary'     => __(
				'Add a photo or photo story to the About page mosaic (Scrapbook → Add Media).',
				'kpf-core'
			),
			'screenshot'  => $mosaic,
			'screenshots' => $shots,
			'sections'    => array(
				array(
					'title' => __( 'Where it appears', 'kpf-core' ),
					'items' => array(
						__( 'Published scrapbook items feed the About page <strong>The work</strong> mosaic — not the “Who Kevin was” slides.', 'kpf-core' ),
						__( 'Every image on the item becomes a tile. One image is a photo; two or more is a photo story.', 'kpf-core' ),
						__( 'Kevin slides live under <strong>Scrapbook → Kevin</strong>. Those never appear in this mosaic.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Create the item', 'kpf-core' ),
					'items' => array(
						__( 'In the admin menu, go to <strong>Scrapbook → Add Media</strong>.', 'kpf-core' ),
						__( 'The title field is labeled <strong>Add a description</strong>. That text is the public caption on the mosaic.', 'kpf-core' ),
						__( 'Add photos in the <strong>Images</strong> box below the description. You cannot publish without at least one image.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Images box', 'kpf-core' ),
					'items' => array(
						__( 'Click <strong>Choose images</strong> (or <strong>Add more images</strong> after the first).', 'kpf-core' ),
						__( 'A single-photo item can contain only one image. Add a second image to make it a photo story.', 'kpf-core' ),
						__( 'Fill in <strong>Image description for screen readers</strong> on each photo before publishing.', 'kpf-core' ),
						__( 'Optional: a <strong>Caption for this story</strong> stays with this item only and does not change the Media Library.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Scrapbook details sidebar', 'kpf-core' ),
					'items' => array(
						__( 'Open <strong>Scrapbook details</strong> in the sidebar for when, where, and source notes.', 'kpf-core' ),
						__( '<strong>When</strong> can be year only, month and year, or a full date — use as much as you know.', 'kpf-core' ),
						__( '<strong>Place</strong>, photographer, and “where the photo came from” are optional historical record fields.', 'kpf-core' ),
						__( '<strong>Feature this item</strong> is stored for later design work. The live mosaic currently shuffles tiles, so featured does not pin a photo first.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Publish', 'kpf-core' ),
					'items' => array(
						__( '<strong>Publish</strong> when the photos should appear on About. Save as <strong>Draft</strong> if images or alt text are still coming.', 'kpf-core' ),
						__( 'Hard-refresh the About page if you still see the old mosaic (frontend cache).', 'kpf-core' ),
					),
				),
			),
			'actions'     => array(
				array(
					'label'   => __( 'Add Media', 'kpf-core' ),
					'url'     => $scrapbook_new,
					'primary' => true,
				),
				array(
					'label'   => __( 'Manage', 'kpf-core' ),
					'url'     => $scrapbook_list,
					'primary' => false,
				),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function card_editing_scrapbook_items( string $scrapbook_list ): array {
		return array(
			'id'         => 'scrapbook-item-edit',
			'icon'       => 'Images',
			'title'      => __( 'Editing scrapbook items', 'kpf-core' ),
			'summary'    => __(
				'Update photos, description, date, or place on an existing mosaic item (Scrapbook → Manage).',
				'kpf-core'
			),
			'screenshot' => self::screenshot(
				'scrapbook-list.webp',
				__( 'Scrapbook → Manage list with Image, Description, When, and Where columns.', 'kpf-core' ),
				'left top'
			),
			'sections' => array(
				array(
					'title' => __( 'Find the item', 'kpf-core' ),
					'items' => array(
						__( 'Go to <strong>Scrapbook → Manage</strong> (or use Manage below). This is the photo mosaic CPT, not <strong>Scrapbook → Kevin</strong>.', 'kpf-core' ),
						__( 'Use the <strong>Image</strong>, <strong>Description</strong>, <strong>When</strong>, and <strong>Where</strong> columns to spot the right row.', 'kpf-core' ),
						__( 'Open the description to edit.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'What to change', 'kpf-core' ),
					'items' => array(
						__( '<strong>Add a description</strong> updates the mosaic caption.', 'kpf-core' ),
						__( 'Replace or add photos in the <strong>Images</strong> box. You still cannot publish with zero images.', 'kpf-core' ),
						__( 'Update <strong>Scrapbook details</strong> for When, Place, photographer, source, or historical notes.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Publish & review', 'kpf-core' ),
					'items' => array(
						__( 'Save as <strong>Draft</strong> to hold a photo off the mosaic; <strong>Update</strong> / Publish when About should show it.', 'kpf-core' ),
						__( 'After publish, hard-refresh About if you still see an old photo or caption.', 'kpf-core' ),
						__( 'To remove an item from the mosaic without deleting history, set it to <strong>Draft</strong> or trash it from Manage.', 'kpf-core' ),
					),
				),
			),
			'actions'  => array(
				array(
					'label'   => __( 'Manage', 'kpf-core' ),
					'url'     => $scrapbook_list,
					'primary' => true,
				),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function card_adding_kevin_story( string $kevin_new, string $kevin_list ): array {
		return array(
			'id'         => 'kevin-story',
			'icon'       => 'BookHeart',
			'title'      => __( 'Adding to Kevin’s Story', 'kpf-core' ),
			'summary'    => __(
				'Create a new photo + header + body slide for the About page stack.',
				'kpf-core'
			),
			'screenshot' => self::screenshot(
				'kevin-story.webp',
				__( 'About page “Who Kevin was” stack: portrait slides beside the story card.', 'kpf-core' ),
				'center 58%'
			),
			'sections' => array(
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
			'actions'  => array(
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
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function card_editing_kevin_stories( string $kevin_list ): array {
		return array(
			'id'         => 'kevin-story-edit',
			'icon'       => 'PencilLine',
			'title'      => __( 'Editing Kevin’s Stories', 'kpf-core' ),
			'summary'    => __(
				'Update an existing About-page slide: photo, copy, order, or publish state.',
				'kpf-core'
			),
			'screenshot' => self::screenshot(
				'kevin-story-edit.webp',
				__( 'Scrapbook → Kevin list with Photo and Order columns for each slide.', 'kpf-core' ),
				'left top'
			),
			'sections' => array(
				array(
					'title' => __( 'Find the slide', 'kpf-core' ),
					'items' => array(
						__( 'Go to <strong>Scrapbook → Kevin</strong> (or use All Kevin slides below).', 'kpf-core' ),
						__( 'Use the list’s <strong>Photo</strong> and <strong>Order</strong> columns to spot the right card quickly.', 'kpf-core' ),
						__( 'Open the slide title to edit — this is the same CPT as “Adding to Kevin’s Story,” not Scrapbook photo entries.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'What to change', 'kpf-core' ),
					'items' => array(
						__( '<strong>Title</strong> and <strong>body</strong> update the card header and supporting paragraph on About.', 'kpf-core' ),
						__( 'Replace the <strong>featured image</strong> when the photo changes — keep <strong>1120×1296</strong> PNG/WebP with a <strong>transparent background</strong>.', 'kpf-core' ),
						__( 'Adjust <strong>Page Attributes → Order</strong> (or the Order column) if the stack sequence should shift. Lower numbers appear earlier.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Publish & review', 'kpf-core' ),
					'items' => array(
						__( 'Save as <strong>Draft</strong> to hold changes off the site; <strong>Update</strong> / Publish when the About carousel should show them.', 'kpf-core' ),
						__( 'After publish, hard-refresh the About page if you still see an old photo or line of copy (frontend cache).', 'kpf-core' ),
						__( 'To remove a slide from the stack without deleting history, set it to <strong>Draft</strong> or trash it from the Kevin list.', 'kpf-core' ),
					),
				),
			),
			'actions'  => array(
				array(
					'label'   => __( 'Edit Kevin slides', 'kpf-core' ),
					'url'     => $kevin_list,
					'primary' => true,
				),
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function card_adding_grantee( string $grantee_new, string $grantee_list ): array {
		return array(
			'id'         => 'grantee',
			'icon'       => 'Users',
			'title'      => __( 'Adding a Grantee', 'kpf-core' ),
			'summary'    => __(
				'Organizations that receive grants and appear in the partners slider (Grants → Grantees).',
				'kpf-core'
			),
			'screenshot' => self::screenshot(
				'grantee.webp',
				__( 'Homepage grantee partners slider with organization logos and names.', 'kpf-core' ),
				'center 28%'
			),
			'sections' => array(
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
			'actions'  => array(
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
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function card_adding_grant( string $grant_new, string $grant_list ): array {
		$about = self::screenshot(
			'grant.webp',
			__( 'About page grant cards: ceremony photos of oversized checks presented to recipients.', 'kpf-core' ),
			'center 42%',
			__( 'About page grant cards', 'kpf-core' )
		);
		$editor = self::screenshot(
			'grant-editor.webp',
			__( 'Grant details editor: recipient, amount, month and year awarded, and check presentation photo.', 'kpf-core' ),
			'center top',
			__( 'Grant details in the editor', 'kpf-core' )
		);
		$shots  = array_values( array_filter( array( $about, $editor ) ) );

		return array(
			'id'          => 'grant',
			'icon'        => 'HandCoins',
			'title'       => __( 'Adding a Grant', 'kpf-core' ),
			'summary'     => __(
				'Record one award to a Grantee — amount, date, and check presentation photo (Grants).',
				'kpf-core'
			),
			'screenshot'  => $about,
			'screenshots' => $shots,
			'sections'    => array(
				array(
					'title' => __( 'Before you start', 'kpf-core' ),
					'items' => array(
						__( 'The recipient organization must already exist under <strong>Grants → Grantees</strong>.', 'kpf-core' ),
						__( '<strong>Recipient</strong> is required — you cannot publish a grant without selecting a Grantee.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Award details', 'kpf-core' ),
					'items' => array(
						__( '<strong>Recipient</strong> → choose the Grantee from the dropdown.', 'kpf-core' ),
						__( '<strong>Grant amount</strong> → optional USD awarded (numbers only; the $ is added for you).', 'kpf-core' ),
						__( '<strong>Month awarded</strong> and <strong>Year awarded</strong> → preferred. The Grants list sorts newest first from this date.', 'kpf-core' ),
						__( 'The grant <strong>title is generated automatically</strong> from recipient, date, and amount — you do not type it.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Check presentation photo', 'kpf-core' ),
					'items' => array(
						__( 'Optional but expected: a photo of someone from KPF presenting the <strong>oversized grant check</strong> to the recipient.', 'kpf-core' ),
						__( 'This image is the <strong>front of the grant card</strong> on the About page (“Making an impact”).', 'kpf-core' ),
						__( 'Prefer a clear landscape JPEG, PNG, or WebP of the ceremony — faces and the check should both read.', 'kpf-core' ),
					),
				),
				array(
					'title' => __( 'Publish', 'kpf-core' ),
					'items' => array(
						__( '<strong>Publish</strong> when the award should appear on About and in the site-wide grants total.', 'kpf-core' ),
						__( 'Save as <strong>Draft</strong> if the photo or amount is still coming.', 'kpf-core' ),
					),
				),
			),
			'actions'     => array(
				array(
					'label'   => __( 'Add grant', 'kpf-core' ),
					'url'     => $grant_new,
					'primary' => true,
				),
				array(
					'label'   => __( 'All grants', 'kpf-core' ),
					'url'     => $grant_list,
					'primary' => false,
				),
			),
		);
	}
}

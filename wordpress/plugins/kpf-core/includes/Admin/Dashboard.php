<?php

declare(strict_types=1);

namespace KPF\Core\Admin;

use KPF\Core\Backups\Admin as BackupsAdmin;
use KPF\Core\Backups\Scheduler as BackupsScheduler;
use KPF\Core\Backups\Storage as BackupsStorage;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Events\ContentType as EventsContentType;
use KPF\Core\Grantees\ContentType as GranteesContentType;
use KPF\Core\Grants\ContentType as GrantsContentType;
use KPF\Core\Inbox\Admin as InboxAdmin;
use KPF\Core\Inbox\Unread;
use KPF\Core\Scrapbook\ContentType as ScrapbookContentType;
use KPF\Core\Seo\Admin as SeoAdmin;
use KPF\Core\Seo\Settings as SeoSettings;
use KPF\Core\Support\FrontendUrl;
use KPF\Core\Support\SiteDateTime;
use WP_Post;

final class Dashboard {
	private const WIDGET_ID = 'kpf-admin-dashboard';

	public static function register(): void {
		add_action( 'wp_dashboard_setup', array( self::class, 'setup' ), 100 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
		add_filter( 'admin_body_class', array( self::class, 'body_class' ) );
	}

	public static function setup(): void {
		global $wp_meta_boxes;

		remove_action( 'welcome_panel', 'wp_welcome_panel' );
		$wp_meta_boxes['dashboard'] = array();

		wp_add_dashboard_widget(
			self::WIDGET_ID,
			__( 'Site dashboard', 'kpf-core' ),
			array( self::class, 'render' )
		);
	}

	public static function render(): void {
		echo '<div id="kpf-admin-dashboard-root"></div>';
		echo '<noscript><p>' . esc_html__( 'Enable JavaScript to view the site dashboard.', 'kpf-core' ) . '</p></noscript>';
	}

	public static function enqueue( string $hook ): void {
		if ( 'index.php' !== $hook ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/dashboard-admin.asset.php';
		$asset      = is_readable( $asset_file ) ? require $asset_file : array(
			'dependencies' => array( 'wp-element', 'wp-i18n' ),
			'version'      => KPF_CORE_VERSION,
		);

		$style_file = KPF_CORE_PATH . 'build/dashboard-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-dashboard-admin',
				KPF_CORE_URL . 'build/dashboard-admin.css',
				array(),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-dashboard-admin',
			KPF_CORE_URL . 'build/dashboard-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		wp_localize_script( 'kpf-dashboard-admin', 'kpfDashboardAdmin', self::data() );
	}

	public static function body_class( string $classes ): string {
		global $pagenow;
		return 'index.php' === $pagenow ? $classes . ' kpf-dashboard-screen' : $classes;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function data(): array {
		$user          = wp_get_current_user();
		$page_counts   = self::post_counts( 'page' );
		$blog_counts   = self::post_counts( 'post' );
		$scrap_counts  = self::post_counts( ScrapbookContentType::POST_TYPE );
		$media_counts  = wp_count_posts( 'attachment' );
		$media_total   = (int) ( $media_counts->inherit ?? 0 );
		$unread_forms  = current_user_can( 'edit_posts' ) ? Unread::forms() : 0;
		$unread_notes  = current_user_can( 'moderate_comments' ) ? Unread::comments() : 0;
		$designed      = self::designed_page_count();
		$total_pages   = $page_counts['total'];
		$design_rate   = $total_pages > 0 ? (int) round( ( $designed / $total_pages ) * 100 ) : 0;
		$seo_settings  = SeoSettings::get();
		$seo_global    = is_array( $seo_settings['global'] ?? null ) ? $seo_settings['global'] : array();
		$indexing      = ! empty( $seo_global['robots_index'] );
		$display_name  = $user->first_name ?: $user->display_name;
		$backup_health = self::backups_health();
		$date_time     = SiteDateTime::config();

		return array(
			'site'      => array(
				'name'        => get_bloginfo( 'name' ),
				'description' => get_bloginfo( 'description' ),
				'url'         => FrontendUrl::base(),
				'adminUrl'    => admin_url(),
				'date'        => SiteDateTime::format_date( time() ),
			),
			'dateTime'  => $date_time,
			'user'      => array(
				'name'      => $display_name,
				'fullName'  => $user->display_name,
				'avatarUrl' => get_avatar_url( $user->ID, array( 'size' => 80 ) ),
			),
			'stats'     => array(
				self::stat( 'pages', __( 'Pages', 'kpf-core' ), $page_counts['total'], $page_counts['draft'], 'FileText', admin_url( 'edit.php?post_type=page' ) ),
				self::stat( 'blogs', __( 'Blogs', 'kpf-core' ), $blog_counts['total'], $blog_counts['draft'], 'Newspaper', admin_url( 'edit.php' ) ),
				self::stat( 'media', __( 'Media files', 'kpf-core' ), $media_total, 0, 'Images', admin_url( 'upload.php' ) ),
				self::stat( 'inbox', __( 'Unread inbox', 'kpf-core' ), $unread_forms + $unread_notes, 0, 'Inbox', admin_url( 'admin.php?page=' . InboxAdmin::MENU_SLUG ) ),
			),
			'health'    => array(
				array(
					'id'          => 'designs',
					'label'       => __( 'Page designs', 'kpf-core' ),
					'value'       => sprintf(
						/* translators: 1: designed pages, 2: total pages. */
						__( '%1$d of %2$d ready', 'kpf-core' ),
						$designed,
						$total_pages
					),
					'progress'    => $design_rate,
					'status'      => $design_rate >= 80 ? 'good' : ( $design_rate > 0 ? 'attention' : 'neutral' ),
					'description' => __( 'Pages with an assigned design', 'kpf-core' ),
					'url'         => admin_url( 'edit.php?post_type=page&page=kpf-designs' ),
					'icon'        => 'PanelsTopLeft',
				),
				array(
					'id'          => 'search',
					'label'       => __( 'Search visibility', 'kpf-core' ),
					'value'       => $indexing ? __( 'Indexing enabled', 'kpf-core' ) : __( 'Indexing blocked', 'kpf-core' ),
					'progress'    => $indexing ? 100 : 20,
					'status'      => $indexing ? 'good' : 'attention',
					'description' => __( 'Public discovery setting', 'kpf-core' ),
					'url'         => admin_url( 'admin.php?page=' . SeoAdmin::menu_slug_for_tab( 'global' ) ),
					'icon'        => 'SearchCheck',
				),
				array(
					'id'          => 'scrapbook',
					'label'       => __( 'Scrapbook', 'kpf-core' ),
					'value'       => sprintf(
						/* translators: %d: published scrapbook entries. */
						_n( '%d published memory', '%d published memories', $scrap_counts['publish'], 'kpf-core' ),
						$scrap_counts['publish']
					),
					'progress'    => min( 100, $scrap_counts['publish'] * 10 ),
					'status'      => $scrap_counts['publish'] > 0 ? 'good' : 'neutral',
					'description' => __( 'Stories and photographs preserved', 'kpf-core' ),
					'url'         => admin_url( 'edit.php?post_type=' . ScrapbookContentType::POST_TYPE ),
					'icon'        => 'Images',
				),
				$backup_health,
			),
			'actions'   => self::actions(),
			'recent'    => self::recent_content(),
			'calendar'  => self::calendar_data(),
			'attention' => self::attention_items(
				$page_counts,
				$blog_counts,
				$total_pages,
				$designed,
				$unread_forms,
				$unread_notes,
				$indexing,
				$backup_health
			),
			'links'     => array(
				'allContent'  => admin_url( 'edit.php?post_type=page' ),
				'siteHealth'  => admin_url( 'site-health.php' ),
				'performance' => admin_url( 'admin.php?page=kpf-performance' ),
				'backups'     => admin_url( 'admin.php?page=' . BackupsAdmin::MENU_SLUG ),
			),
		);
	}

	/**
	 * @return array{publish: int, draft: int, pending: int, future: int, private: int, total: int}
	 */
	private static function post_counts( string $post_type ): array {
		$counts = post_type_exists( $post_type ) ? wp_count_posts( $post_type ) : null;
		$result = array(
			'publish' => (int) ( $counts->publish ?? 0 ),
			'draft'   => (int) ( $counts->draft ?? 0 ),
			'pending' => (int) ( $counts->pending ?? 0 ),
			'future'  => (int) ( $counts->future ?? 0 ),
			'private' => (int) ( $counts->private ?? 0 ),
		);
		$result['total'] = array_sum( $result );
		return $result;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function stat( string $id, string $label, int $value, int $drafts, string $icon, string $url ): array {
		return array(
			'id'      => $id,
			'label'   => $label,
			'value'   => $value,
			'detail'  => $drafts > 0
				? sprintf(
					/* translators: %d: draft count. */
					_n( '%d draft', '%d drafts', $drafts, 'kpf-core' ),
					$drafts
				)
				: __( 'Up to date', 'kpf-core' ),
			'icon'    => $icon,
			'url'     => $url,
		);
	}

	private static function designed_page_count(): int {
		$query = new \WP_Query(
			array(
				'post_type'              => 'page',
				'post_status'            => array( 'publish', 'draft', 'pending', 'future', 'private' ),
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => false,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				'meta_query'             => array(
					array(
						'key'     => DesignsMeta::PAGE_DESIGN_META,
						'value'   => 0,
						'compare' => '>',
						'type'    => 'NUMERIC',
					),
				),
			)
		);
		return (int) $query->found_posts;
	}

	/**
	 * @return array<int, array<string, string>>
	 */
	private static function actions(): array {
		$actions = array();
		if ( current_user_can( 'edit_pages' ) ) {
			$actions[] = self::action( 'page', __( 'New page', 'kpf-core' ), __( 'Build a new site page', 'kpf-core' ), 'FilePlus2', admin_url( 'post-new.php?post_type=page' ), true );
			$actions[] = self::action( 'designs', __( 'Page designs', 'kpf-core' ), __( 'Apply HTML and CSS layouts', 'kpf-core' ), 'PanelsTopLeft', admin_url( 'edit.php?post_type=page&page=kpf-designs' ) );
		}
		if ( current_user_can( 'edit_posts' ) ) {
			$actions[] = self::action( 'blog', __( 'New blog', 'kpf-core' ), __( 'Write and publish an update', 'kpf-core' ), 'SquarePen', admin_url( 'post-new.php' ) );
		}
		if ( current_user_can( 'upload_files' ) ) {
			$actions[] = self::action( 'media', __( 'Add media', 'kpf-core' ), __( 'Upload images, video, or SVG', 'kpf-core' ), 'ImageUp', admin_url( 'media-new.php' ) );
		}
		$scrapbook = get_post_type_object( ScrapbookContentType::POST_TYPE );
		if ( $scrapbook && current_user_can( $scrapbook->cap->create_posts ) ) {
			$actions[] = self::action( 'memory', __( 'Add memory', 'kpf-core' ), __( 'Grow the foundation scrapbook', 'kpf-core' ), 'BookHeart', admin_url( 'post-new.php?post_type=' . ScrapbookContentType::POST_TYPE ) );
		}
		if ( current_user_can( 'manage_options' ) ) {
			$actions[] = self::action( 'stylesheet', __( 'Stylesheet', 'kpf-core' ), __( 'Edit global frontend styles', 'kpf-core' ), 'Braces', admin_url( 'admin.php?page=kpf-stylesheet' ) );
			$actions[] = self::action( 'backups', __( 'Backups', 'kpf-core' ), __( 'Create, schedule, and restore', 'kpf-core' ), 'HardDrive', admin_url( 'admin.php?page=' . BackupsAdmin::MENU_SLUG ) );
		}
		return $actions;
	}

	/**
	 * @return array<string, string>
	 */
	private static function action( string $id, string $label, string $description, string $icon, string $url, bool $primary = false ): array {
		return array(
			'id'          => $id,
			'label'       => $label,
			'description' => $description,
			'icon'        => $icon,
			'url'         => $url,
			'variant'     => $primary ? 'primary' : 'default',
		);
	}

	/**
	 * Post types shown in Recently updated / calendar.
	 * Includes every registered type with an admin UI, plus all KPF types,
	 * excluding Media and WordPress chrome/internal UI types.
	 *
	 * @return list<string>
	 */
	private static function editorial_post_types(): array {
		$exclude = array(
			'attachment',
			'revision',
			'nav_menu_item',
			'custom_css',
			'customize_changeset',
			'oembed_cache',
			'user_request',
			'wp_block',
			'wp_template',
			'wp_template_part',
			'wp_global_styles',
			'wp_navigation',
			'wp_font_family',
			'wp_font_face',
			'wp_pattern',
		);

		$types = array_keys( get_post_types( array( 'show_ui' => true ), 'names' ) );
		foreach ( array_keys( get_post_types( array(), 'names' ) ) as $type ) {
			if ( str_starts_with( $type, 'kpf_' ) ) {
				$types[] = $type;
			}
		}

		$types = array_values(
			array_unique(
				array_diff( $types, $exclude )
			)
		);
		sort( $types );

		/**
		 * Filter post types included in the site dashboard Recently updated list.
		 *
		 * @param list<string> $types
		 */
		return apply_filters( 'kpf_dashboard_editorial_post_types', $types );
	}

	private static function icon_for_post_type( string $post_type ): string {
		return match ( $post_type ) {
			'post'                            => 'Newspaper',
			ScrapbookContentType::POST_TYPE   => 'BookHeart',
			'kpf_kevin'                       => 'Images',
			GrantsContentType::POST_TYPE      => 'HandCoins',
			GranteesContentType::POST_TYPE    => 'Users',
			EventsContentType::POST_TYPE      => 'CalendarDays',
			'kpf_code'                        => 'Braces',
			'kpf_query'                       => 'Braces',
			'kpf_form', 'kpf_form_entry'      => 'Inbox',
			'kpf_design'                      => 'PanelsTopLeft',
			'kpf_stylesheet'                  => 'FileText',
			'kpf_animation'                   => 'Activity',
			default                           => 'FileText',
		};
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function backups_health(): array {
		$can_manage = current_user_can( 'manage_options' );
		$url        = admin_url( 'admin.php?page=' . BackupsAdmin::MENU_SLUG );

		if ( ! $can_manage ) {
			return array(
				'id'          => 'backups',
				'label'       => __( 'Backups', 'kpf-core' ),
				'value'       => __( 'Managed by administrators', 'kpf-core' ),
				'progress'    => 0,
				'status'      => 'neutral',
				'description' => __( 'Site restore points', 'kpf-core' ),
				'url'         => $url,
				'icon'        => 'HardDrive',
			);
		}

		$catalog  = BackupsStorage::catalog();
		$count    = count( $catalog );
		$schedule = BackupsScheduler::status();
		$last_at  = (int) ( $catalog[0]['created_at'] ?? 0 );
		$age_days = $last_at > 0 ? (int) floor( ( time() - $last_at ) / DAY_IN_SECONDS ) : null;

		if ( 0 === $count ) {
			return array(
				'id'          => 'backups',
				'label'       => __( 'Backups', 'kpf-core' ),
				'value'       => __( 'No backups yet', 'kpf-core' ),
				'progress'    => 12,
				'status'      => 'attention',
				'description' => __( 'Create a restore point for this site', 'kpf-core' ),
				'url'         => $url,
				'icon'        => 'HardDrive',
			);
		}

		$last_label = $age_days === 0
			? __( 'Last backup today', 'kpf-core' )
			: sprintf(
				/* translators: %d: days since last backup. */
				_n( 'Last backup %d day ago', 'Last backup %d days ago', max( 1, (int) $age_days ), 'kpf-core' ),
				max( 1, (int) $age_days )
			);

		$stale = null !== $age_days && $age_days >= 7;
		if ( $stale ) {
			$status   = 'attention';
			$progress = 45;
			$detail   = __( 'Backup is older than a week', 'kpf-core' );
		} elseif ( ! empty( $schedule['enabled'] ) ) {
			$status   = 'good';
			$progress = 100;
			$detail   = sprintf(
				/* translators: %d: number of stored backups. */
				_n( '%d stored · schedule on', '%d stored · schedule on', $count, 'kpf-core' ),
				$count
			);
		} else {
			$status   = 'attention';
			$progress = 70;
			$detail   = sprintf(
				/* translators: %d: number of stored backups. */
				_n( '%d stored · schedule off', '%d stored · schedule off', $count, 'kpf-core' ),
				$count
			);
		}

		return array(
			'id'          => 'backups',
			'label'       => __( 'Backups', 'kpf-core' ),
			'value'       => $last_label,
			'progress'    => $progress,
			'status'      => $status,
			'description' => $detail,
			'url'         => $url,
			'icon'        => 'HardDrive',
		);
	}

	private static function plain_title( WP_Post $post ): string {
		$title = get_the_title( $post );
		if ( '' === $title ) {
			return __( '(Untitled)', 'kpf-core' );
		}

		return html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function recent_content(): array {
		$posts = get_posts(
			array(
				'post_type'      => self::editorial_post_types(),
				'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
				'posts_per_page' => 7,
				'orderby'        => 'modified',
				'order'          => 'DESC',
			)
		);

		return array_values(
			array_filter(
				array_map(
					static function ( WP_Post $post ): ?array {
						if ( ! current_user_can( 'edit_post', $post->ID ) ) {
							return null;
						}
						$type   = get_post_type_object( $post->post_type );
						$status = get_post_status_object( $post->post_status );
						return array(
							'id'        => $post->ID,
							'title'     => self::plain_title( $post ),
							'type'      => $type ? $type->labels->singular_name : $post->post_type,
							'postType'  => $post->post_type,
							'icon'      => self::icon_for_post_type( $post->post_type ),
							'status'    => $status ? $status->label : $post->post_status,
							'statusKey' => $post->post_status,
							'modified'  => sprintf(
								/* translators: %s: human-readable elapsed time. */
								__( '%s ago', 'kpf-core' ),
								human_time_diff( get_post_modified_time( 'U', true, $post ), current_time( 'timestamp', true ) )
							),
							'url'       => get_edit_post_link( $post->ID, 'raw' ) ?: '',
							'thumbnail' => get_the_post_thumbnail_url( $post, 'thumbnail' ) ?: '',
						);
					},
					$posts
				)
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function calendar_data(): array {
		$timestamp = current_time( 'timestamp' );
		$year      = (int) wp_date( 'Y', $timestamp );
		$month     = (int) wp_date( 'n', $timestamp );
		$month_start = new \DateTimeImmutable(
			sprintf( '%04d-%02d-01 12:00:00', $year, $month ),
			wp_timezone()
		);
		$scheduled = get_posts(
			array(
				'post_type'      => self::editorial_post_types(),
				'post_status'    => 'future',
				'posts_per_page' => 6,
				'orderby'        => 'date',
				'order'          => 'ASC',
			)
		);

		return array(
			'monthLabel' => wp_date( 'F Y', $timestamp ),
			'today'      => (int) wp_date( 'j', $timestamp ),
			'days'       => (int) wp_date( 't', $timestamp ),
			'startsOn'   => (int) $month_start->format( 'w' ),
			'scheduled'  => array_map(
				static fn( WP_Post $post ): array => array(
					'id'    => $post->ID,
					'title' => self::plain_title( $post ),
					'date'  => get_the_date( 'M j', $post ),
					'time'  => get_the_date( get_option( 'time_format' ), $post ),
					'day'   => (int) get_the_date( 'j', $post ),
					'url'   => get_edit_post_link( $post->ID, 'raw' ) ?: '',
				),
				$scheduled
			),
		);
	}

	/**
	 * @param array<string, int>   $pages
	 * @param array<string, int>   $blogs
	 * @param array<string, mixed> $backup_health
	 * @return array<int, array<string, string>>
	 */
	private static function attention_items(
		array $pages,
		array $blogs,
		int $total_pages,
		int $designed,
		int $unread_forms,
		int $unread_comments,
		bool $indexing,
		array $backup_health = array()
	): array {
		$items = array();
		if ( $unread_forms + $unread_comments > 0 ) {
			$items[] = self::attention(
				'inbox',
				__( 'Inbox needs review', 'kpf-core' ),
				sprintf(
					/* translators: %d: unread item count. */
					_n( '%d unread item', '%d unread items', $unread_forms + $unread_comments, 'kpf-core' ),
					$unread_forms + $unread_comments
				),
				'Inbox',
				admin_url( 'admin.php?page=' . InboxAdmin::MENU_SLUG )
			);
		}
		$without_design = max( 0, $total_pages - $designed );
		if ( $without_design > 0 ) {
			$items[] = self::attention(
				'designs',
				__( 'Pages without designs', 'kpf-core' ),
				sprintf(
					/* translators: %d: number of pages without a design. */
					_n( '%d page is using the fallback', '%d pages are using the fallback', $without_design, 'kpf-core' ),
					$without_design
				),
				'PanelsTopLeft',
				admin_url( 'edit.php?post_type=page&page=kpf-designs' )
			);
		}
		$drafts = $pages['draft'] + $blogs['draft'];
		if ( $drafts > 0 ) {
			$items[] = self::attention(
				'drafts',
				__( 'Draft content', 'kpf-core' ),
				sprintf(
					/* translators: %d: draft count. */
					_n( '%d draft is waiting', '%d drafts are waiting', $drafts, 'kpf-core' ),
					$drafts
				),
				'FileClock',
				admin_url( 'edit.php?post_status=draft&post_type=page' )
			);
		}
		if ( ! $indexing ) {
			$items[] = self::attention(
				'indexing',
				__( 'Search indexing is blocked', 'kpf-core' ),
				__( 'Confirm this before launch.', 'kpf-core' ),
				'SearchX',
				admin_url( 'admin.php?page=' . SeoAdmin::menu_slug_for_tab( 'global' ) )
			);
		}
		if (
			current_user_can( 'manage_options' )
			&& ( $backup_health['status'] ?? '' ) === 'attention'
		) {
			$items[] = self::attention(
				'backups',
				__( 'Backups need attention', 'kpf-core' ),
				(string) ( $backup_health['description'] ?? __( 'Review backup status.', 'kpf-core' ) ),
				'HardDrive',
				admin_url( 'admin.php?page=' . BackupsAdmin::MENU_SLUG )
			);
		}
		return array_slice( $items, 0, 5 );
	}

	/**
	 * @return array<string, string>
	 */
	private static function attention( string $id, string $label, string $description, string $icon, string $url ): array {
		return array(
			'id'          => $id,
			'label'       => $label,
			'description' => $description,
			'icon'        => $icon,
			'url'         => $url,
		);
	}
}

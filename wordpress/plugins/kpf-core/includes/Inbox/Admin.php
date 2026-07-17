<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

final class Admin {
	public const MENU_SLUG     = 'kpf-inbox';
	public const SETTINGS_SLUG = 'kpf-inbox-settings';

	public static function register(): void {
		add_action('admin_menu', array( self::class, 'menu' ), 9);
		add_action('admin_menu', array( self::class, 'finalize_menu' ), 999);
		add_filter('parent_file', array( self::class, 'parent_file' ));
		add_filter('submenu_file', array( self::class, 'submenu_file' ));
		add_action('admin_head', array( self::class, 'admin_styles' ));
	}

	public static function menu(): void {
		remove_menu_page('edit-comments.php');

		$badge = Unread::badge_html(Unread::total_for_current_user());

		add_menu_page(
			__('Inbox', 'kpf-core'),
			__('Inbox', 'kpf-core') . $badge,
			'edit_posts',
			self::MENU_SLUG,
			array( self::class, 'redirect_home' ),
			'dashicons-email-alt',
			25
		);

		$comments_badge = Unread::badge_html(Unread::comments());
		add_submenu_page(
			self::MENU_SLUG,
			__('Comments', 'kpf-core'),
			__('Comments', 'kpf-core') . ( current_user_can('moderate_comments') ? $comments_badge : '' ),
			'moderate_comments',
			'edit-comments.php'
		);

		add_submenu_page(
			self::MENU_SLUG,
			__('Inbox settings', 'kpf-core'),
			__('Settings', 'kpf-core'),
			'manage_options',
			self::SETTINGS_SLUG,
			array( self::class, 'render_settings' )
		);
	}

	/**
	 * Remove the auto-added duplicate parent submenu and refresh badges
	 * after CPT submenu items (Forms) have been registered.
	 */
	public static function finalize_menu(): void {
		remove_submenu_page(self::MENU_SLUG, self::MENU_SLUG);

		global $menu, $submenu;

		if (is_array($menu)) {
			$badge = Unread::badge_html(Unread::total_for_current_user());
			foreach ($menu as $index => $item) {
				if (($item[2] ?? '') !== self::MENU_SLUG) {
					continue;
				}
				$menu[ $index ][0] = __('Inbox', 'kpf-core') . $badge;
				break;
			}
		}

		if (! is_array($submenu[ self::MENU_SLUG ] ?? null)) {
			return;
		}

		$forms_slug = 'edit.php?post_type=' . Forms::POST_TYPE;
		$form_badge = current_user_can('edit_posts')
			? Unread::badge_html(Unread::forms())
			: '';
		$comments_badge = Unread::badge_html(Unread::comments());

		foreach ($submenu[ self::MENU_SLUG ] as $index => $item) {
			$slug = $item[2] ?? '';
			if ('edit-comments.php' === $slug) {
				$submenu[ self::MENU_SLUG ][ $index ][0] = __('Comments', 'kpf-core') .
					( current_user_can('moderate_comments') ? $comments_badge : '' );
			}
			if ($slug === $forms_slug) {
				$submenu[ self::MENU_SLUG ][ $index ][0] = __('Forms', 'kpf-core') . $form_badge;
			}
		}
	}

	public static function redirect_home(): void {
		if (current_user_can('moderate_comments')) {
			wp_safe_redirect(admin_url('edit-comments.php'));
			exit;
		}

		wp_safe_redirect(admin_url('edit.php?post_type=' . Forms::POST_TYPE));
		exit;
	}

	/**
	 * Keep Comments and Forms screens highlighted under Inbox.
	 *
	 * @param string $parent_file Current parent file.
	 */
	public static function parent_file(string $parent_file): string {
		global $pagenow, $typenow;

		if ('edit-comments.php' === $pagenow || 'comment.php' === $pagenow) {
			return self::MENU_SLUG;
		}

		if (Forms::POST_TYPE === $typenow) {
			return self::MENU_SLUG;
		}

		$page = isset($_GET['page']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key(wp_unslash((string) $_GET['page'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';
		if (self::SETTINGS_SLUG === $page) {
			return self::MENU_SLUG;
		}

		return $parent_file;
	}

	/**
	 * @param string|null $submenu_file Current submenu file.
	 */
	public static function submenu_file(?string $submenu_file): ?string {
		global $pagenow, $typenow;

		if ('edit-comments.php' === $pagenow || 'comment.php' === $pagenow) {
			return 'edit-comments.php';
		}

		if (Forms::POST_TYPE === $typenow) {
			return 'edit.php?post_type=' . Forms::POST_TYPE;
		}

		$page = isset($_GET['page']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key(wp_unslash((string) $_GET['page'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';
		if (self::SETTINGS_SLUG === $page) {
			return self::SETTINGS_SLUG;
		}

		return $submenu_file;
	}

	public static function admin_styles(): void {
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;
		if (! $screen) {
			return;
		}

		$is_inbox =
			'edit-comments' === $screen->id ||
			'comment' === $screen->id ||
			Forms::POST_TYPE === $screen->post_type ||
			'toplevel_page_' . self::SETTINGS_SLUG === $screen->id ||
			'inbox_page_' . self::SETTINGS_SLUG === $screen->id ||
			self::MENU_SLUG . '_page_' . self::SETTINGS_SLUG === $screen->id;

		if (! $is_inbox && 'settings_page_' . self::SETTINGS_SLUG !== $screen->id) {
			// Still allow styles when viewing our settings under Inbox.
			if (false === strpos((string) $screen->id, self::SETTINGS_SLUG)) {
				return;
			}
		}

		echo '<style>
			.kpf-inbox-settings .form-table th { width: 220px; }
			.kpf-inbox-unread { font-weight: 700; }
			.kpf-inbox-status { display:inline-block; border-radius:999px; font-size:12px; line-height:1; padding:0.35rem 0.55rem; }
			.kpf-inbox-status--unread { background:#fcf0f1; color:#8a2424; }
			.kpf-inbox-status--read { background:#edfaef; color:#1e6b3a; }
		</style>';
	}

	public static function render_settings(): void {
		if (! current_user_can('manage_options')) {
			wp_die(esc_html__('You do not have permission to manage Inbox settings.', 'kpf-core'));
		}

		if (
			isset($_POST['kpf_inbox_settings_nonce']) &&
			wp_verify_nonce(
				sanitize_text_field(wp_unslash((string) $_POST['kpf_inbox_settings_nonce'])),
				'kpf_inbox_settings'
			)
		) {
			$raw = isset($_POST[ Settings::OPTION_KEY ]) && is_array($_POST[ Settings::OPTION_KEY ])
				? wp_unslash($_POST[ Settings::OPTION_KEY ]) // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
				: array();
			$clean = Settings::sanitize($raw);
			update_option(Settings::OPTION_KEY, $clean, false);
			echo '<div class="notice notice-success is-dismissible"><p>' .
				esc_html__('Inbox settings saved.', 'kpf-core') .
				'</p></div>';
		}

		$settings = Settings::all();
		$n        = $settings['notifications'];
		$c        = $settings['comments'];
		$f        = $settings['forms'];

		echo '<div class="wrap kpf-inbox-settings">';
		echo '<h1>' . esc_html__('Inbox settings', 'kpf-core') . '</h1>';
		echo '<p>' . esc_html__(
			'Configure how comments and form submissions are handled when they arrive in the Inbox.',
			'kpf-core'
		) . '</p>';

		echo '<form method="post">';
		wp_nonce_field('kpf_inbox_settings', 'kpf_inbox_settings_nonce');

		echo '<h2>' . esc_html__('Notifications', 'kpf-core') . '</h2>';
		echo '<p class="description">' . esc_html__(
			'Get an email when something new hits the Inbox.',
			'kpf-core'
		) . '</p>';
		echo '<table class="form-table" role="presentation"><tbody>';

		self::text_row(
			'notifications][email',
			__('Notification email', 'kpf-core'),
			(string) $n['email'],
			__('Where Inbox alerts are sent.', 'kpf-core'),
			'email'
		);
		self::text_row(
			'notifications][from_name',
			__('From name', 'kpf-core'),
			(string) $n['from_name'],
			__('Shown as the sender name on notification emails.', 'kpf-core')
		);
		self::checkbox_row(
			'notifications][notify_comments',
			__('Comment notifications', 'kpf-core'),
			! empty($n['notify_comments']),
			__('Email me when a comment arrives.', 'kpf-core')
		);

		echo '<tr><th scope="row"><label for="kpf-notify-comment-status">' .
			esc_html__('Which comments', 'kpf-core') .
			'</label></th><td>';
		echo '<select id="kpf-notify-comment-status" name="' .
			esc_attr(Settings::OPTION_KEY) . '[notifications][notify_comment_status]">';
		echo '<option value="pending"' . selected($n['notify_comment_status'], 'pending', false) . '>' .
			esc_html__('Only comments awaiting moderation', 'kpf-core') . '</option>';
		echo '<option value="all"' . selected($n['notify_comment_status'], 'all', false) . '>' .
			esc_html__('Every new comment', 'kpf-core') . '</option>';
		echo '</select></td></tr>';

		self::checkbox_row(
			'notifications][notify_forms',
			__('Form notifications', 'kpf-core'),
			! empty($n['notify_forms']),
			__('Email me when a form submission arrives.', 'kpf-core')
		);

		echo '</tbody></table>';

		echo '<h2>' . esc_html__('Comments', 'kpf-core') . '</h2>';
		echo '<table class="form-table" role="presentation"><tbody>';
		self::text_row(
			'comments][auto_close_days',
			__('Auto-close comments after', 'kpf-core'),
			(string) (int) $c['auto_close_days'],
			__('Number of days after a post is published. Use 0 to leave WordPress discussion settings unchanged.', 'kpf-core'),
			'number'
		);
		echo '</tbody></table>';

		echo '<h2>' . esc_html__('Forms', 'kpf-core') . '</h2>';
		echo '<table class="form-table" role="presentation"><tbody>';
		self::text_row(
			'forms][default_form_name',
			__('Default form name', 'kpf-core'),
			(string) $f['default_form_name'],
			__('Used when a submission does not include a form name.', 'kpf-core')
		);
		self::checkbox_row(
			'forms][store_ip',
			__('Store submitter IP', 'kpf-core'),
			! empty($f['store_ip']),
			__('Save the visitor IP address with each submission when provided. Leave off unless you need it for moderation.', 'kpf-core')
		);
		echo '</tbody></table>';

		submit_button(__('Save Inbox settings', 'kpf-core'));
		echo '</form></div>';
	}

	private static function text_row(
		string $key_path,
		string $label,
		string $value,
		string $help,
		string $type = 'text'
	): void {
		$id   = 'kpf-inbox-' . sanitize_html_class(str_replace(array( '][', ']' ), array( '-', '' ), $key_path));
		$name = Settings::OPTION_KEY . '[' . $key_path . ']';
		echo '<tr><th scope="row"><label for="' . esc_attr($id) . '">' . esc_html($label) . '</label></th><td>';
		echo '<input class="regular-text" type="' . esc_attr($type) . '" id="' . esc_attr($id) .
			'" name="' . esc_attr($name) . '" value="' . esc_attr($value) . '" />';
		echo '<p class="description">' . esc_html($help) . '</p></td></tr>';
	}

	private static function checkbox_row(
		string $key_path,
		string $label,
		bool $checked,
		string $help
	): void {
		$id   = 'kpf-inbox-' . sanitize_html_class(str_replace(array( '][', ']' ), array( '-', '' ), $key_path));
		$name = Settings::OPTION_KEY . '[' . $key_path . ']';
		echo '<tr><th scope="row">' . esc_html($label) . '</th><td>';
		echo '<label for="' . esc_attr($id) . '"><input type="checkbox" id="' . esc_attr($id) .
			'" name="' . esc_attr($name) . '" value="1"' . checked($checked, true, false) . ' /> ';
		echo esc_html($help) . '</label></td></tr>';
	}
}

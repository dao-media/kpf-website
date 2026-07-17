<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

use WP_Post;
use WP_Query;

final class FormsAdmin {
	public static function register(): void {
		add_filter(
			'manage_' . Forms::POST_TYPE . '_posts_columns',
			array( self::class, 'columns' )
		);
		add_action(
			'manage_' . Forms::POST_TYPE . '_posts_custom_column',
			array( self::class, 'render_column' ),
			10,
			2
		);
		add_filter(
			'manage_edit-' . Forms::POST_TYPE . '_sortable_columns',
			static fn (array $columns): array => array_merge(
				$columns,
				array( 'kpf_form' => 'kpf_form' )
			)
		);
		add_action('pre_get_posts', array( self::class, 'apply_sorting' ));
		add_action('restrict_manage_posts', array( self::class, 'filters' ));
		add_action('parse_query', array( self::class, 'apply_filters' ));
		add_filter('post_row_actions', array( self::class, 'row_actions' ), 10, 2);
		add_action('admin_init', array( self::class, 'handle_read_actions' ));
		add_action('load-post.php', array( self::class, 'mark_current_as_read' ));
		add_action('add_meta_boxes_' . Forms::POST_TYPE, array( self::class, 'meta_boxes' ));
		add_filter(
			'bulk_actions-edit-' . Forms::POST_TYPE,
			array( self::class, 'bulk_actions' )
		);
		add_filter(
			'handle_bulk_actions-edit-' . Forms::POST_TYPE,
			array( self::class, 'handle_bulk_actions' ),
			10,
			3
		);
		add_action('admin_notices', array( self::class, 'bulk_notices' ));
		add_filter(
			'views_edit-' . Forms::POST_TYPE,
			array( self::class, 'views' )
		);
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns(array $columns): array {
		return array(
			'cb'        => $columns['cb'] ?? '<input type="checkbox" />',
			'title'     => __('Subject', 'kpf-core'),
			'kpf_status'=> __('Status', 'kpf-core'),
			'kpf_form'  => __('Form', 'kpf-core'),
			'kpf_from'  => __('From', 'kpf-core'),
			'date'      => __('Received', 'kpf-core'),
		);
	}

	public static function render_column(string $column, int $post_id): void {
		$meta = Forms::get_meta($post_id);

		switch ($column) {
			case 'kpf_status':
				if ($meta['is_read']) {
					echo '<span class="kpf-inbox-status kpf-inbox-status--read">' .
						esc_html__('Read', 'kpf-core') . '</span>';
				} else {
					echo '<span class="kpf-inbox-status kpf-inbox-status--unread">' .
						esc_html__('Unread', 'kpf-core') . '</span>';
				}
				break;
			case 'kpf_form':
				echo esc_html($meta['form_name'] ?: '—');
				break;
			case 'kpf_from':
				$parts = array_filter(array( $meta['name'], $meta['email'] ));
				echo $parts
					? esc_html(implode(' · ', $parts))
					: '<span aria-hidden="true">—</span>';
				break;
		}
	}

	public static function apply_sorting(WP_Query $query): void {
		if (! is_admin() || ! $query->is_main_query()) {
			return;
		}
		if (Forms::POST_TYPE !== $query->get('post_type')) {
			return;
		}
		if ('kpf_form' !== $query->get('orderby')) {
			return;
		}

		$query->set('meta_key', Forms::META_FORM);
		$query->set('orderby', 'meta_value');
	}

	public static function filters(string $post_type): void {
		if (Forms::POST_TYPE !== $post_type) {
			return;
		}

		$current = isset($_GET['kpf_inbox_status']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key(wp_unslash((string) $_GET['kpf_inbox_status'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		echo '<select name="kpf_inbox_status">';
		echo '<option value="">' . esc_html__('All statuses', 'kpf-core') . '</option>';
		echo '<option value="unread"' . selected($current, 'unread', false) . '>' .
			esc_html__('Unread', 'kpf-core') . '</option>';
		echo '<option value="read"' . selected($current, 'read', false) . '>' .
			esc_html__('Read', 'kpf-core') . '</option>';
		echo '</select>';
	}

	public static function apply_filters(WP_Query $query): void {
		if (! is_admin() || ! $query->is_main_query()) {
			return;
		}
		if (Forms::POST_TYPE !== $query->get('post_type')) {
			return;
		}

		$status = isset($_GET['kpf_inbox_status']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_key(wp_unslash((string) $_GET['kpf_inbox_status'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';

		if ('unread' === $status) {
			$query->set(
				'meta_query',
				array(
					'relation' => 'OR',
					array(
						'key'     => Forms::META_READ,
						'compare' => 'NOT EXISTS',
					),
					array(
						'key'   => Forms::META_READ,
						'value' => '0',
					),
				)
			);
		} elseif ('read' === $status) {
			$query->set(
				'meta_query',
				array(
					array(
						'key'   => Forms::META_READ,
						'value' => '1',
					),
				)
			);
		}
	}

	/**
	 * @param array<string, string> $actions
	 * @return array<string, string>
	 */
	public static function row_actions(array $actions, WP_Post $post): array {
		if (Forms::POST_TYPE !== $post->post_type || ! current_user_can('edit_post', $post->ID)) {
			return $actions;
		}

		$is_read = Forms::is_read($post->ID);
		$url     = wp_nonce_url(
			add_query_arg(
				array(
					'kpf_inbox_mark' => $is_read ? 'unread' : 'read',
					'post'           => $post->ID,
				),
				admin_url('edit.php?post_type=' . Forms::POST_TYPE)
			),
			'kpf_inbox_mark_' . $post->ID
		);

		$actions['kpf_inbox_mark'] = sprintf(
			'<a href="%s">%s</a>',
			esc_url($url),
			esc_html($is_read ? __('Mark unread', 'kpf-core') : __('Mark read', 'kpf-core'))
		);

		return $actions;
	}

	public static function handle_read_actions(): void {
		if (! isset($_GET['kpf_inbox_mark'], $_GET['post'], $_GET['_wpnonce'])) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$post_id = absint($_GET['post']); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$action  = sanitize_key(wp_unslash((string) $_GET['kpf_inbox_mark'])); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if (
			$post_id < 1 ||
			! in_array($action, array( 'read', 'unread' ), true) ||
			! wp_verify_nonce(
				sanitize_text_field(wp_unslash((string) $_GET['_wpnonce'])),
				'kpf_inbox_mark_' . $post_id
			) ||
			! current_user_can('edit_post', $post_id)
		) {
			return;
		}

		$post = get_post($post_id);
		if (! $post || Forms::POST_TYPE !== $post->post_type) {
			return;
		}

		Forms::mark_read($post_id, 'read' === $action);
		wp_safe_redirect(admin_url('edit.php?post_type=' . Forms::POST_TYPE));
		exit;
	}

	public static function mark_current_as_read(): void {
		$post_id = isset($_GET['post']) ? absint($_GET['post']) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ($post_id < 1 || ! current_user_can('edit_post', $post_id)) {
			return;
		}

		$post = get_post($post_id);
		if (! $post || Forms::POST_TYPE !== $post->post_type) {
			return;
		}

		if (! Forms::is_read($post_id)) {
			Forms::mark_read($post_id, true);
		}
	}

	public static function meta_boxes(): void {
		add_meta_box(
			'kpf-inbox-submission',
			__('Submission details', 'kpf-core'),
			array( self::class, 'render_meta_box' ),
			Forms::POST_TYPE,
			'side',
			'high'
		);
	}

	public static function render_meta_box(WP_Post $post): void {
		$meta = Forms::get_meta($post->ID);
		echo '<p><strong>' . esc_html__('Form', 'kpf-core') . ':</strong><br />' .
			esc_html($meta['form_name'] ?: '—') . '</p>';
		echo '<p><strong>' . esc_html__('Name', 'kpf-core') . ':</strong><br />' .
			esc_html($meta['name'] ?: '—') . '</p>';
		echo '<p><strong>' . esc_html__('Email', 'kpf-core') . ':</strong><br />';
		if ($meta['email']) {
			echo '<a href="mailto:' . esc_attr($meta['email']) . '">' .
				esc_html($meta['email']) . '</a>';
		} else {
			echo '—';
		}
		echo '</p>';
		echo '<p><strong>' . esc_html__('Phone', 'kpf-core') . ':</strong><br />' .
			esc_html($meta['phone'] ?: '—') . '</p>';
		if ($meta['ip']) {
			echo '<p><strong>' . esc_html__('IP', 'kpf-core') . ':</strong><br />' .
				esc_html($meta['ip']) . '</p>';
		}
		if ($meta['fields']) {
			echo '<p><strong>' . esc_html__('Extra fields', 'kpf-core') . ':</strong></p><ul>';
			foreach ($meta['fields'] as $label => $value) {
				echo '<li><strong>' . esc_html((string) $label) . ':</strong> ' .
					esc_html((string) $value) . '</li>';
			}
			echo '</ul>';
		}
	}

	/**
	 * @param array<string, string> $actions
	 * @return array<string, string>
	 */
	public static function bulk_actions(array $actions): array {
		$actions['kpf_mark_read']   = __('Mark as read', 'kpf-core');
		$actions['kpf_mark_unread'] = __('Mark as unread', 'kpf-core');
		return $actions;
	}

	/**
	 * @param array<int, int> $post_ids
	 */
	public static function handle_bulk_actions(string $redirect, string $action, array $post_ids): string {
		if (! in_array($action, array( 'kpf_mark_read', 'kpf_mark_unread' ), true)) {
			return $redirect;
		}

		$read = 'kpf_mark_read' === $action;
		foreach ($post_ids as $post_id) {
			if (current_user_can('edit_post', $post_id)) {
				Forms::mark_read((int) $post_id, $read);
			}
		}

		return add_query_arg(
			array(
				'kpf_inbox_bulk' => $read ? 'read' : 'unread',
				'changed'        => count($post_ids),
			),
			$redirect
		);
	}

	public static function bulk_notices(): void {
		if (! isset($_GET['kpf_inbox_bulk'], $_GET['changed'])) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$changed = absint($_GET['changed']); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$kind    = sanitize_key(wp_unslash((string) $_GET['kpf_inbox_bulk'])); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ($changed < 1) {
			return;
		}

		$message = 'read' === $kind
			? sprintf(
				/* translators: %s: number of submissions */
				_n('%s submission marked as read.', '%s submissions marked as read.', $changed, 'kpf-core'),
				number_format_i18n($changed)
			)
			: sprintf(
				/* translators: %s: number of submissions */
				_n('%s submission marked as unread.', '%s submissions marked as unread.', $changed, 'kpf-core'),
				number_format_i18n($changed)
			);

		echo '<div class="notice notice-success is-dismissible"><p>' .
			esc_html($message) . '</p></div>';
	}

	/**
	 * @param array<string, string> $views
	 * @return array<string, string>
	 */
	public static function views(array $views): array {
		$unread = Unread::forms();
		$url    = admin_url('edit.php?post_type=' . Forms::POST_TYPE . '&kpf_inbox_status=unread');
		$class  = ( isset($_GET['kpf_inbox_status']) && 'unread' === $_GET['kpf_inbox_status'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? ' class="current"'
			: '';

		$views['kpf_unread'] = sprintf(
			'<a href="%s"%s>%s <span class="count">(%s)</span></a>',
			esc_url($url),
			$class,
			esc_html__('Unread', 'kpf-core'),
			esc_html(number_format_i18n($unread))
		);

		return $views;
	}
}

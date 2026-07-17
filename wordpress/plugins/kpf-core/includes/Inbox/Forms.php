<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

use WP_Error;

final class Forms {
	public const POST_TYPE = 'kpf_form_entry';
	public const META_READ = '_kpf_inbox_read';
	public const META_FORM = '_kpf_form_name';
	public const META_NAME = '_kpf_submitter_name';
	public const META_EMAIL = '_kpf_submitter_email';
	public const META_PHONE = '_kpf_submitter_phone';
	public const META_FIELDS = '_kpf_form_fields';
	public const META_IP = '_kpf_submitter_ip';

	public static function register(): void {
		add_action('init', array( self::class, 'register_content' ), 5);
	}

	public static function register_content(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'               => __('Form submissions', 'kpf-core'),
					'singular_name'      => __('Form submission', 'kpf-core'),
					'add_new'            => __('Add submission', 'kpf-core'),
					'add_new_item'       => __('Add form submission', 'kpf-core'),
					'edit_item'          => __('View form submission', 'kpf-core'),
					'new_item'           => __('New form submission', 'kpf-core'),
					'search_items'       => __('Search form submissions', 'kpf-core'),
					'not_found'          => __('No form submissions found.', 'kpf-core'),
					'not_found_in_trash' => __('No form submissions found in Trash.', 'kpf-core'),
					'all_items'          => __('Forms', 'kpf-core'),
					'menu_name'          => __('Forms', 'kpf-core'),
				),
				'description'         => __(
					'Messages and submissions that arrive through site forms.',
					'kpf-core'
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'show_ui'             => true,
				'show_in_menu'        => \KPF\Core\Inbox\Admin::MENU_SLUG,
				'show_in_rest'        => false,
				'exclude_from_search' => true,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'delete_with_user'    => false,
				'map_meta_cap'        => true,
				'capability_type'     => 'post',
				'supports'            => array( 'title', 'editor' ),
				'menu_position'       => null,
			)
		);
	}

	/**
	 * @param array{
	 *   form_name?: string,
	 *   name?: string,
	 *   email?: string,
	 *   phone?: string,
	 *   subject?: string,
	 *   message?: string,
	 *   fields?: array<string, mixed>,
	 *   ip?: string
	 * } $data
	 * @return int|WP_Error
	 */
	public static function create_submission(array $data) {
		$settings  = Settings::all();
		$form_name = sanitize_text_field(
			(string) ( $data['form_name'] ?? $settings['forms']['default_form_name'] )
		);
		$name      = sanitize_text_field((string) ( $data['name'] ?? '' ));
		$email     = sanitize_email((string) ( $data['email'] ?? '' ));
		$phone     = sanitize_text_field((string) ( $data['phone'] ?? '' ));
		$subject   = sanitize_text_field((string) ( $data['subject'] ?? '' ));
		$message   = wp_kses_post((string) ( $data['message'] ?? '' ));
		$fields    = is_array($data['fields'] ?? null) ? $data['fields'] : array();

		if ('' === $subject) {
			$subject = $name
				? sprintf(
					/* translators: %s: submitter name */
					__('Message from %s', 'kpf-core'),
					$name
				)
				: __( 'New form submission', 'kpf-core' );
		}

		$post_id = wp_insert_post(
			array(
				'post_type'    => self::POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => $subject,
				'post_content' => $message,
			),
			true
		);

		if (is_wp_error($post_id)) {
			return $post_id;
		}

		update_post_meta($post_id, self::META_READ, '0');
		update_post_meta($post_id, self::META_FORM, $form_name);
		update_post_meta($post_id, self::META_NAME, $name);
		update_post_meta($post_id, self::META_EMAIL, $email);
		update_post_meta($post_id, self::META_PHONE, $phone);
		update_post_meta($post_id, self::META_FIELDS, wp_json_encode(self::sanitize_fields($fields)));

		if (! empty($settings['forms']['store_ip']) && ! empty($data['ip'])) {
			update_post_meta($post_id, self::META_IP, sanitize_text_field((string) $data['ip']));
		}

		/**
		 * Fires after a form submission is stored in the Inbox.
		 *
		 * @param int                $post_id Submission post ID.
		 * @param array<string,mixed> $data    Original submission payload.
		 */
		do_action('kpf_inbox_form_submitted', $post_id, $data);

		return $post_id;
	}

	public static function is_read(int $post_id): bool {
		return '1' === (string) get_post_meta($post_id, self::META_READ, true);
	}

	public static function mark_read(int $post_id, bool $read = true): void {
		update_post_meta($post_id, self::META_READ, $read ? '1' : '0');
	}

	/**
	 * @return array{
	 *   form_name: string,
	 *   name: string,
	 *   email: string,
	 *   phone: string,
	 *   fields: array<string, mixed>,
	 *   ip: string,
	 *   is_read: bool
	 * }
	 */
	public static function get_meta(int $post_id): array {
		$raw_fields = get_post_meta($post_id, self::META_FIELDS, true);
		$fields     = array();
		if (is_string($raw_fields) && '' !== $raw_fields) {
			$decoded = json_decode($raw_fields, true);
			$fields  = is_array($decoded) ? $decoded : array();
		}

		return array(
			'form_name' => (string) get_post_meta($post_id, self::META_FORM, true),
			'name'      => (string) get_post_meta($post_id, self::META_NAME, true),
			'email'     => (string) get_post_meta($post_id, self::META_EMAIL, true),
			'phone'     => (string) get_post_meta($post_id, self::META_PHONE, true),
			'fields'    => $fields,
			'ip'        => (string) get_post_meta($post_id, self::META_IP, true),
			'is_read'   => self::is_read($post_id),
		);
	}

	/**
	 * @param array<string, mixed> $fields
	 * @return array<string, string>
	 */
	private static function sanitize_fields(array $fields): array {
		$clean = array();
		foreach ($fields as $key => $value) {
			$label = sanitize_text_field((string) $key);
			if ('' === $label) {
				continue;
			}
			$clean[ $label ] = is_scalar($value)
				? sanitize_text_field((string) $value)
				: wp_json_encode($value);
		}

		return $clean;
	}
}

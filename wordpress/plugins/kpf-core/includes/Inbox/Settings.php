<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

final class Settings {
	public const OPTION_KEY = 'kpf_inbox_settings';
	public const VERSION    = 1;

	public static function register(): void {
		add_action(
			'admin_init',
			static function (): void {
				register_setting(
					'kpf_inbox',
					self::OPTION_KEY,
					array(
						'type'              => 'object',
						'default'           => self::defaults(),
						'sanitize_callback' => array( self::class, 'sanitize' ),
						'show_in_rest'      => false,
					)
				);
			}
		);
	}

	public static function ensure_defaults(): void {
		$current = get_option(self::OPTION_KEY, null);
		if (! is_array($current)) {
			update_option(self::OPTION_KEY, self::defaults(), false);
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		$admin_email = (string) get_option('admin_email');

		return array(
			'version'       => self::VERSION,
			'notifications' => array(
				'email'                 => $admin_email,
				'notify_comments'       => true,
				'notify_comment_status' => 'pending', // pending | all
				'notify_forms'          => true,
				'from_name'             => get_bloginfo('name'),
			),
			'comments'      => array(
				'auto_close_days' => 0,
			),
			'forms'         => array(
				'default_form_name' => __('Contact form', 'kpf-core'),
				'store_ip'          => false,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$stored = get_option(self::OPTION_KEY, array());
		if (! is_array($stored)) {
			$stored = array();
		}

		return array_replace_recursive(self::defaults(), $stored);
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize($value): array {
		$defaults = self::defaults();
		$input    = is_array($value) ? $value : array();

		$notify_status = (string) ( $input['notifications']['notify_comment_status'] ?? 'pending' );
		if (! in_array($notify_status, array( 'pending', 'all' ), true)) {
			$notify_status = 'pending';
		}

		$email = sanitize_email((string) ( $input['notifications']['email'] ?? $defaults['notifications']['email'] ));
		if ('' === $email) {
			$email = (string) $defaults['notifications']['email'];
		}

		return array(
			'version'       => self::VERSION,
			'notifications' => array(
				'email'                 => $email,
				'notify_comments'       => ! empty($input['notifications']['notify_comments']),
				'notify_comment_status' => $notify_status,
				'notify_forms'          => ! empty($input['notifications']['notify_forms']),
				'from_name'             => sanitize_text_field(
					(string) ( $input['notifications']['from_name'] ?? $defaults['notifications']['from_name'] )
				),
			),
			'comments'      => array(
				'auto_close_days' => max(
					0,
					(int) ( $input['comments']['auto_close_days'] ?? 0 )
				),
			),
			'forms'         => array(
				'default_form_name' => sanitize_text_field(
					(string) ( $input['forms']['default_form_name'] ?? $defaults['forms']['default_form_name'] )
				),
				'store_ip'          => ! empty($input['forms']['store_ip']),
			),
		);
	}
}

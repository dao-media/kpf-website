<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

final class Notifications {
	public static function register(): void {
		add_action('comment_post', array( self::class, 'on_comment' ), 20, 3);
		add_action('kpf_inbox_form_submitted', array( self::class, 'on_form' ), 10, 2);
	}

	/**
	 * @param int|string $comment_approved
	 * @param array<string, mixed> $commentdata
	 */
	public static function on_comment(int $comment_id, $comment_approved, array $commentdata): void {
		unset($commentdata);
		$settings = Settings::all()['notifications'];

		if (empty($settings['notify_comments'])) {
			return;
		}

		$status = (string) $comment_approved;
		$mode   = (string) $settings['notify_comment_status'];
		if ('pending' === $mode && '0' !== $status) {
			return;
		}

		$comment = get_comment($comment_id);
		if (! $comment) {
			return;
		}

		$post = get_post((int) $comment->comment_post_ID);
		$subject = sprintf(
			/* translators: %s: site name */
			__('[%s] New comment in Inbox', 'kpf-core'),
			wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES)
		);

		$body  = __('A new comment arrived in the Inbox.', 'kpf-core') . "\n\n";
		$body .= sprintf(
			/* translators: %s: post title */
			__('On: %s', 'kpf-core'),
			$post ? $post->post_title : __('(unknown)', 'kpf-core')
		) . "\n";
		$body .= sprintf(
			/* translators: %s: author name */
			__('From: %s', 'kpf-core'),
			$comment->comment_author
		) . "\n";
		if ($comment->comment_author_email) {
			$body .= sprintf(
				/* translators: %s: email */
				__('Email: %s', 'kpf-core'),
				$comment->comment_author_email
			) . "\n";
		}
		$body .= "\n" . wp_strip_all_tags((string) $comment->comment_content) . "\n\n";
		$body .= admin_url('edit-comments.php') . "\n";

		self::send($subject, $body);
	}

	/**
	 * @param array<string, mixed> $data
	 */
	public static function on_form(int $post_id, array $data): void {
		unset($data);
		$settings = Settings::all()['notifications'];

		if (empty($settings['notify_forms'])) {
			return;
		}

		$meta = Forms::get_meta($post_id);
		$post = get_post($post_id);
		if (! $post) {
			return;
		}

		$subject = sprintf(
			/* translators: %s: site name */
			__('[%s] New form submission in Inbox', 'kpf-core'),
			wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES)
		);

		$body  = __('A new form submission arrived in the Inbox.', 'kpf-core') . "\n\n";
		$body .= sprintf(
			/* translators: %s: form name */
			__('Form: %s', 'kpf-core'),
			$meta['form_name'] ?: __('(unnamed)', 'kpf-core')
		) . "\n";
		$body .= sprintf(
			/* translators: %s: subject */
			__('Subject: %s', 'kpf-core'),
			$post->post_title
		) . "\n";
		if ($meta['name']) {
			$body .= sprintf(
				/* translators: %s: name */
				__('From: %s', 'kpf-core'),
				$meta['name']
			) . "\n";
		}
		if ($meta['email']) {
			$body .= sprintf(
				/* translators: %s: email */
				__('Email: %s', 'kpf-core'),
				$meta['email']
			) . "\n";
		}
		if ($meta['phone']) {
			$body .= sprintf(
				/* translators: %s: phone number */
				__('Phone: %s', 'kpf-core'),
				$meta['phone']
			) . "\n";
		}
		foreach ($meta['fields'] as $label => $value) {
			$body .= sprintf(
				/* translators: 1: field label, 2: field value */
				__('%1$s: %2$s', 'kpf-core'),
				(string) $label,
				(string) $value
			) . "\n";
		}
		$body .= "\n" . wp_strip_all_tags($post->post_content) . "\n\n";
		$body .= get_edit_post_link($post_id, 'raw') . "\n";

		self::send($subject, $body, (string) $meta['email']);
	}

	private static function send(string $subject, string $body, string $reply_to = ''): void {
		// Avoid noisy mailer failures in CLI/smoke environments.
		if (defined('WP_CLI') && WP_CLI) {
			return;
		}

		$settings = Settings::all()['notifications'];
		$email    = (string) $settings['email'];
		if ('' === $email || ! is_email($email)) {
			return;
		}

		$from_name = (string) $settings['from_name'];
		$headers   = array( 'Content-Type: text/plain; charset=UTF-8' );
		if ('' !== $from_name) {
			$headers[] = 'From: ' . sprintf(
				'%s <%s>',
				$from_name,
				$email
			);
		}
		if (is_email($reply_to)) {
			$headers[] = 'Reply-To: ' . $reply_to;
		}

		wp_mail($email, $subject, $body, $headers);
	}
}

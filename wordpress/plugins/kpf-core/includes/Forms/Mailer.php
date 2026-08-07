<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

/**
 * Per-form staff notifications and submitter receipts.
 */
final class Mailer {
	/**
	 * @param array<string, mixed> $validated
	 * @param array<string, mixed> $definition
	 */
	public static function after_submit( int $post_id, array $validated, array $definition ): void {
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return;
		}

		$settings = is_array( $definition['settings'] ?? null ) ? $definition['settings'] : array();
		self::send_staff_notification( $post_id, $validated, $settings );
		self::send_receipt( $validated, $settings );
	}

	/**
	 * @param array<string, mixed> $validated
	 * @param array<string, mixed> $settings
	 */
	private static function send_staff_notification( int $post_id, array $validated, array $settings ): void {
		$notify = is_array( $settings['notifications'] ?? null ) ? $settings['notifications'] : array();
		if ( empty( $notify['enabled'] ) ) {
			return;
		}

		$emails = array();
		foreach ( (array) ( $notify['emails'] ?? array() ) as $email ) {
			$email = sanitize_email( (string) $email );
			if ( $email && is_email( $email ) ) {
				$emails[] = $email;
			}
		}
		// Legacy flat list.
		if ( ! $emails ) {
			foreach ( (array) ( $settings['notificationEmails'] ?? array() ) as $email ) {
				$email = sanitize_email( (string) $email );
				if ( $email && is_email( $email ) ) {
					$emails[] = $email;
				}
			}
		}
		$emails = array_values( array_unique( $emails ) );
		if ( ! $emails ) {
			return;
		}

		$site = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$form = (string) ( $validated['form_name'] ?? __( 'Website form', 'kpf-core' ) );
		$custom_subject = trim( (string) ( $notify['subject'] ?? '' ) );
		$subject        = $custom_subject !== ''
			? $custom_subject
			: sprintf(
				/* translators: 1: site name, 2: form name */
				__( '[%1$s] New submission: %2$s', 'kpf-core' ),
				$site,
				$form
			);

		$body  = __( 'A new form submission was received.', 'kpf-core' ) . "\n\n";
		$body .= sprintf( __( 'Form: %s', 'kpf-core' ), $form ) . "\n";
		if ( ! empty( $validated['name'] ) ) {
			$body .= sprintf( __( 'From: %s', 'kpf-core' ), (string) $validated['name'] ) . "\n";
		}
		if ( ! empty( $validated['email'] ) ) {
			$body .= sprintf( __( 'Email: %s', 'kpf-core' ), (string) $validated['email'] ) . "\n";
		}
		if ( ! empty( $validated['phone'] ) ) {
			$body .= sprintf( __( 'Phone: %s', 'kpf-core' ), (string) $validated['phone'] ) . "\n";
		}
		foreach ( (array) ( $validated['fields'] ?? array() ) as $label => $value ) {
			$body .= sprintf( '%s: %s', (string) $label, (string) $value ) . "\n";
		}
		if ( ! empty( $validated['message'] ) ) {
			$body .= "\n" . (string) $validated['message'] . "\n";
		}
		$edit = get_edit_post_link( $post_id, 'raw' );
		if ( $edit ) {
			$body .= "\n" . $edit . "\n";
		}

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );
		$reply   = sanitize_email( (string) ( $validated['email'] ?? '' ) );
		if ( is_email( $reply ) ) {
			$headers[] = 'Reply-To: ' . $reply;
		}

		wp_mail( $emails, $subject, $body, $headers );
	}

	/**
	 * @param array<string, mixed> $validated
	 * @param array<string, mixed> $settings
	 */
	private static function send_receipt( array $validated, array $settings ): void {
		$receipt = is_array( $settings['receipt'] ?? null ) ? $settings['receipt'] : array();
		if ( empty( $receipt['enabled'] ) ) {
			return;
		}

		$to = sanitize_email( (string) ( $validated['email'] ?? '' ) );
		if ( ! is_email( $to ) ) {
			return;
		}

		$site = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$form = (string) ( $validated['form_name'] ?? __( 'Website form', 'kpf-core' ) );
		$subject = trim( (string) ( $receipt['subject'] ?? '' ) );
		if ( '' === $subject ) {
			$subject = sprintf(
				/* translators: 1: site name, 2: form name */
				__( '[%1$s] We received your message (%2$s)', 'kpf-core' ),
				$site,
				$form
			);
		}

		$message = trim( (string) ( $receipt['message'] ?? '' ) );
		if ( '' === $message ) {
			$message = __(
				"Thank you for contacting us. We received your message and will get back to you soon.\n\n— {site}",
				'kpf-core'
			);
		}

		$replacements = array(
			'{name}'    => (string) ( $validated['name'] ?? '' ),
			'{email}'   => $to,
			'{form}'    => $form,
			'{message}' => (string) ( $validated['message'] ?? '' ),
			'{site}'    => $site,
		);
		$body = strtr( $message, $replacements );

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );
		$notify  = is_array( $settings['notifications'] ?? null ) ? $settings['notifications'] : array();
		$reply   = '';
		foreach ( (array) ( $notify['emails'] ?? $settings['notificationEmails'] ?? array() ) as $email ) {
			$email = sanitize_email( (string) $email );
			if ( is_email( $email ) ) {
				$reply = $email;
				break;
			}
		}
		if ( is_email( $reply ) ) {
			$headers[] = 'Reply-To: ' . $reply;
		}

		wp_mail( $to, $subject, $body, $headers );
	}
}

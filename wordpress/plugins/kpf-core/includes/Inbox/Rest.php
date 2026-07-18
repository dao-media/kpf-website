<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-inbox/v1';
	public const ROUTE     = '/public/forms/submit';
	private const MAX_BODY_BYTES = 65536;
	private const MAX_FIELDS     = 20;

	public static function register(): void {
		add_action('rest_api_init', array( self::class, 'routes' ));
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			self::ROUTE,
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'submit' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function submit(WP_REST_Request $request) {
		if (strlen($request->get_body()) > self::MAX_BODY_BYTES) {
			return self::error(
				'kpf_form_too_large',
				__('The form submission is too large.', 'kpf-core'),
				413
			);
		}

		if (! self::valid_proxy_signature($request)) {
			return self::error(
				'kpf_form_forbidden',
				__('The form request could not be verified.', 'kpf-core'),
				403
			);
		}

		$params = $request->get_json_params();
		if (! is_array($params)) {
			return self::error(
				'kpf_form_invalid_body',
				__('Send the form as a JSON object.', 'kpf-core'),
				400
			);
		}

		$allowed = array( 'form_name', 'name', 'email', 'phone', 'subject', 'message', 'fields', 'website' );
		$unknown = array_diff(array_keys($params), $allowed);
		if ($unknown !== array()) {
			return self::error(
				'kpf_form_unknown_fields',
				__('The form contains unsupported fields.', 'kpf-core'),
				400
			);
		}

		$limited = self::apply_rate_limit($request);
		if (is_wp_error($limited)) {
			return $limited;
		}

		// A hidden website field catches basic bots without creating Inbox noise.
		if ('' !== trim((string) ( $params['website'] ?? '' ))) {
			return self::response(
				array(
					'success' => true,
					'message' => __('Thank you. Your message has been received.', 'kpf-core'),
				),
				202
			);
		}

		$validated = self::validate($params);
		if (is_wp_error($validated)) {
			return $validated;
		}

		if (! empty(Settings::all()['forms']['store_ip'])) {
			$validated['ip'] = self::client_ip($request);
		}

		$submission = Forms::create_submission($validated);
		if (is_wp_error($submission)) {
			return self::error(
				'kpf_form_store_failed',
				__('Your message could not be saved. Please try again.', 'kpf-core'),
				500
			);
		}

		return self::response(
			array(
				'success' => true,
				'message' => __('Thank you. Your message has been received.', 'kpf-core'),
			),
			201
		);
	}

	/**
	 * @param array<string, mixed> $params
	 * @return array<string, mixed>|WP_Error
	 */
	private static function validate(array $params) {
		$email = sanitize_email((string) ( $params['email'] ?? '' ));
		if ('' === $email || ! is_email($email)) {
			return self::error(
				'kpf_form_invalid_email',
				__('Enter a valid email address.', 'kpf-core'),
				400,
				'email'
			);
		}

		$values = array(
			'form_name' => sanitize_text_field((string) ( $params['form_name'] ?? '' )),
			'name'      => sanitize_text_field((string) ( $params['name'] ?? '' )),
			'email'     => $email,
			'phone'     => sanitize_text_field((string) ( $params['phone'] ?? '' )),
			'subject'   => sanitize_text_field((string) ( $params['subject'] ?? '' )),
			'message'   => sanitize_textarea_field((string) ( $params['message'] ?? '' )),
		);

		$limits = array(
			'form_name' => 120,
			'name'      => 120,
			'email'     => 254,
			'phone'     => 80,
			'subject'   => 200,
			'message'   => 5000,
		);
		foreach ($limits as $key => $maximum) {
			if (strlen($values[ $key ]) <= $maximum) {
				continue;
			}

			return self::error(
				'kpf_form_field_too_long',
				__('One of the form fields is too long.', 'kpf-core'),
				400,
				$key
			);
		}

		$raw_fields = $params['fields'] ?? array();
		if (! is_array($raw_fields) || count($raw_fields) > self::MAX_FIELDS) {
			return self::error(
				'kpf_form_invalid_fields',
				__('The additional form fields are invalid.', 'kpf-core'),
				400,
				'fields'
			);
		}

		$fields = array();
		foreach ($raw_fields as $key => $value) {
			if (! is_scalar($value)) {
				return self::error(
					'kpf_form_invalid_field_value',
					__('Additional form fields must contain text values.', 'kpf-core'),
					400,
					'fields'
				);
			}

			$label = sanitize_text_field((string) $key);
			$clean = sanitize_text_field((string) $value);
			if ('' === $label || strlen($label) > 80 || strlen($clean) > 1000) {
				return self::error(
					'kpf_form_invalid_field_value',
					__('An additional form field is invalid.', 'kpf-core'),
					400,
					'fields'
				);
			}
			$fields[ $label ] = $clean;
		}

		if ('' === $values['message'] && $fields === array()) {
			return self::error(
				'kpf_form_missing_message',
				__('Enter a message or complete at least one form field.', 'kpf-core'),
				400,
				'message'
			);
		}

		$values['fields'] = $fields;
		return $values;
	}

	/**
	 * @return true|WP_Error
	 */
	private static function apply_rate_limit(WP_REST_Request $request) {
		$settings = Settings::all()['forms'];
		$limit    = (int) ( $settings['rate_limit_count'] ?? 5 );
		$window   = (int) ( $settings['rate_limit_window_minutes'] ?? 15 ) * MINUTE_IN_SECONDS;
		$limit    = (int) apply_filters('kpf_inbox_form_rate_limit', max(1, $limit), $request);
		$window   = (int) apply_filters('kpf_inbox_form_rate_window', max(MINUTE_IN_SECONDS, $window), $request);

		$fingerprint = self::client_ip($request) . '|' . (string) $request->get_header('user_agent');
		$key         = 'kpf_form_rate_' . substr(
			hash_hmac('sha256', $fingerprint, wp_salt('nonce')),
			0,
			40
		);
		$state       = get_transient($key);
		$now         = time();
		$reset       = is_array($state) ? (int) ( $state['reset'] ?? 0 ) : 0;
		if ($reset <= $now) {
			$state = array(
				'count' => 0,
				'reset' => $now + $window,
			);
		}
		$count = (int) ( $state['count'] ?? 0 );

		if ($count >= $limit) {
			return self::error(
				'kpf_form_rate_limited',
				__('Too many messages were sent. Please wait and try again.', 'kpf-core'),
				429
			);
		}

		set_transient(
			$key,
			array(
				'count' => $count + 1,
				'reset' => (int) $state['reset'],
			),
			max(1, (int) $state['reset'] - $now)
		);

		return true;
	}

	private static function client_ip(WP_REST_Request $request): string {
		$ip = sanitize_text_field((string) $request->get_header('x_kpf_client_ip'));
		return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
	}

	private static function valid_proxy_signature(WP_REST_Request $request): bool {
		$settings = get_option('faustwp_settings', array());
		$secret   = is_array($settings) ? (string) ( $settings['secret_key'] ?? '' ) : '';
		$timestamp = (int) $request->get_header('x_kpf_form_timestamp');
		$signature = (string) $request->get_header('x_kpf_form_signature');
		$ip        = self::client_ip($request);

		if (
			'' === $secret ||
			'' === $signature ||
			$timestamp <= 0 ||
			abs(time() - $timestamp) > 300
		) {
			return false;
		}

		$body_hash = hash('sha256', $request->get_body());
		$expected  = hash_hmac(
			'sha256',
			$timestamp . '.' . $ip . '.' . $body_hash,
			$secret
		);

		return hash_equals($expected, $signature);
	}

	/**
	 * @param array<string, mixed> $data
	 */
	private static function response(array $data, int $status): WP_REST_Response {
		$response = new WP_REST_Response($data, $status);
		$response->header('Cache-Control', 'no-store');
		$response->header('X-Content-Type-Options', 'nosniff');
		return $response;
	}

	private static function error(
		string $code,
		string $message,
		int $status,
		string $field = ''
	): WP_Error {
		$data = array( 'status' => $status );
		if ('' !== $field) {
			$data['field'] = $field;
		}
		return new WP_Error($code, $message, $data);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Inbox;

use KPF\Core\Forms\Captcha as FormCaptcha;
use KPF\Core\Forms\Definition as FormDefinition;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-inbox/v1';
	public const ROUTE     = '/public/forms/submit';
	private const MAX_BODY_BYTES = 65536;
	private const MAX_FIELDS     = 40;

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

		$allowed = array(
			'form_name',
			'form_id',
			'form_slug',
			'name',
			'email',
			'phone',
			'subject',
			'message',
			'fields',
			'website',
			'context',
			'captcha_token',
			'turnstile_token',
			'recaptcha_token',
			'g-recaptcha-response',
		);
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

		$client_ip = self::client_ip($request);
		if (! empty(Settings::all()['forms']['store_ip'])) {
			$validated['ip'] = $client_ip;
		}

		if (! empty($validated['form_definition_id']) || ! empty($validated['form_slug'])) {
			$builder = self::resolve_builder_form(
				(string) ( $validated['form_slug'] ?? '' ),
				(int) ( $validated['form_definition_id'] ?? 0 )
			);
			if ($builder) {
				$captcha = FormCaptcha::verify_submission(
					array_merge($params, array( 'ip' => $client_ip )),
					$builder['definition'],
					$client_ip
				);
				if (is_wp_error($captcha)) {
					return $captcha;
				}
			}
		}

		$submission = Forms::create_submission($validated);
		if (is_wp_error($submission)) {
			return self::error(
				'kpf_form_store_failed',
				__('Your message could not be saved. Please try again.', 'kpf-core'),
				500
			);
		}

		self::dispatch_webhooks((int) $submission, $validated);

		if ($builder) {
			\KPF\Core\Forms\Mailer::after_submit(
				(int) $submission,
				$validated,
				is_array($builder['definition'] ?? null) ? $builder['definition'] : array()
			);
		}

		$success_message = ! empty($validated['success_message'])
			? (string) $validated['success_message']
			: __('Thank you. Your message has been received.', 'kpf-core');

		return self::response(
			array(
				'success' => true,
				'message' => $success_message,
			),
			201
		);
	}

	/**
	 * @param array<string, mixed> $params
	 * @return array<string, mixed>|WP_Error
	 */
	private static function validate(array $params) {
		$form_slug = sanitize_title((string) ( $params['form_slug'] ?? '' ));
		$form_id   = absint($params['form_id'] ?? 0);
		$builder   = self::resolve_builder_form($form_slug, $form_id);
		$is_builder = null !== $builder;

		$email = sanitize_email((string) ( $params['email'] ?? '' ));
		if ('' === $email && $is_builder) {
			$email = self::email_from_fields($params['fields'] ?? array());
		}

		if (! $is_builder && ( '' === $email || ! is_email($email) )) {
			return self::error(
				'kpf_form_invalid_email',
				__('Enter a valid email address.', 'kpf-core'),
				400,
				'email'
			);
		}

		if ($is_builder && '' !== $email && ! is_email($email)) {
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

		if ('' !== $form_slug) {
			$values['form_slug'] = $form_slug;
		}
		if ($form_id > 0) {
			$values['form_definition_id'] = $form_id;
		}

		if ($is_builder) {
			$settings = is_array($builder['definition']['settings'] ?? null)
				? $builder['definition']['settings']
				: array();
			if ('' === $values['form_name']) {
				$values['form_name'] = sanitize_text_field(
					(string) ( $settings['inboxFormName'] ?? $builder['title'] )
				);
			}
			$values['form_slug']          = $builder['slug'];
			$values['form_definition_id'] = $builder['databaseId'];
			$values['success_message']    = sanitize_text_field(
				(string) ( $settings['successMessage'] ?? '' )
			);
			$values['webhooks'] = is_array($settings['webhooks'] ?? null)
				? array_values(
					array_filter(
						array_map('esc_url_raw', $settings['webhooks'])
					)
				)
				: array();
		}

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

		$raw_context = $params['context'] ?? array();
		if (! is_array($raw_context)) {
			return self::error(
				'kpf_form_invalid_context',
				__('The form context payload is invalid.', 'kpf-core'),
				400,
				'context'
			);
		}
		$values['context'] = self::sanitize_context($raw_context);

		return $values;
	}

	/**
	 * @return array{databaseId:int,title:string,slug:string,definition:array<string,mixed>}|null
	 */
	private static function resolve_builder_form(string $slug, int $form_id): ?array {
		if ($form_id > 0) {
			$payload = FormDefinition::internal_payload($form_id);
			if ($payload) {
				return $payload;
			}
		}

		if ('' !== $slug) {
			$id = FormDefinition::find_by_slug($slug);
			return $id ? FormDefinition::internal_payload($id) : null;
		}

		return null;
	}

	/**
	 * @param mixed $fields
	 */
	private static function email_from_fields($fields): string {
		if (! is_array($fields)) {
			return '';
		}
		foreach ($fields as $key => $value) {
			$label = strtolower((string) $key);
			if (false !== strpos($label, 'email') && is_scalar($value)) {
				$email = sanitize_email((string) $value);
				if (is_email($email)) {
					return $email;
				}
			}
		}
		return '';
	}

	/**
	 * @param array<string, mixed> $context
	 * @return array<string, mixed>
	 */
	private static function sanitize_context(array $context): array {
		$clean = array();
		$count = 0;
		foreach ($context as $key => $value) {
			if ($count >= 40) {
				break;
			}
			$label = sanitize_key((string) $key);
			if ('' === $label) {
				continue;
			}
			if (is_array($value)) {
				$clean[ $label ] = self::sanitize_context($value);
			} elseif (is_scalar($value)) {
				$clean[ $label ] = sanitize_text_field(substr((string) $value, 0, 500));
			}
			++$count;
		}
		return $clean;
	}

	/**
	 * @param array<string, mixed> $validated
	 */
	private static function dispatch_webhooks(int $post_id, array $validated): void {
		$urls = is_array($validated['webhooks'] ?? null) ? $validated['webhooks'] : array();
		if ($urls === array()) {
			return;
		}

		$payload = wp_json_encode(
			array(
				'id'        => $post_id,
				'form_name' => $validated['form_name'] ?? '',
				'form_slug' => $validated['form_slug'] ?? '',
				'name'      => $validated['name'] ?? '',
				'email'     => $validated['email'] ?? '',
				'phone'     => $validated['phone'] ?? '',
				'message'   => $validated['message'] ?? '',
				'fields'    => $validated['fields'] ?? array(),
				'context'   => $validated['context'] ?? array(),
			)
		);

		foreach (array_slice($urls, 0, 5) as $url) {
			if (! is_string($url) || '' === $url) {
				continue;
			}
			wp_remote_post(
				$url,
				array(
					'timeout'  => 5,
					'blocking' => false,
					'headers'  => array( 'Content-Type' => 'application/json' ),
					'body'     => $payload ?: '{}',
				)
			);
		}
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

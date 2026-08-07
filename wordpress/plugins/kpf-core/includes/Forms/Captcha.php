<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

use WP_Error;

/**
 * Server-side captcha verification against Forms Settings keys.
 */
final class Captcha {
	/**
	 * @param array<string, mixed> $params
	 * @param array<string, mixed> $definition
	 * @return true|WP_Error
	 */
	public static function verify_submission( array $params, array $definition, string $remote_ip = '' ) {
		$mode = Settings::coerce_captcha_mode(
			(string) ( $definition['settings']['captchaMode'] ?? 'honeypot' )
		);

		if ( in_array( $mode, array( 'honeypot', 'off' ), true ) ) {
			return true;
		}

		if ( 'turnstile' === $mode ) {
			return self::verify_turnstile( $params, $remote_ip );
		}

		if ( 'recaptcha' === $mode ) {
			return self::verify_recaptcha( $params, $remote_ip );
		}

		return true;
	}

	/**
	 * @param array<string, mixed> $params
	 * @return true|WP_Error
	 */
	private static function verify_turnstile( array $params, string $remote_ip ) {
		$token = trim( (string) ( $params['turnstile_token'] ?? $params['captcha_token'] ?? '' ) );
		if ( '' === $token ) {
			return self::missing_token_error();
		}

		$secret = Settings::turnstile_secret_key();
		if ( '' === $secret ) {
			return new WP_Error(
				'kpf_form_captcha_unconfigured',
				__( 'Turnstile is selected but no secret key is configured in Forms → Settings.', 'kpf-core' ),
				array( 'status' => 503, 'field' => 'captcha' )
			);
		}

		/**
		 * Short-circuit or override Turnstile verification.
		 *
		 * @param true|WP_Error|null $result Pre-verified result, or null to run the default check.
		 * @param string             $token  Client token.
		 * @param array              $params Submission params.
		 */
		$filtered = apply_filters( 'kpf_forms_verify_turnstile', null, $token, $params );
		if ( null !== $filtered ) {
			return self::normalize_filter_result( $filtered );
		}

		return self::siteverify(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			$secret,
			$token,
			$remote_ip
		);
	}

	/**
	 * @param array<string, mixed> $params
	 * @return true|WP_Error
	 */
	private static function verify_recaptcha( array $params, string $remote_ip ) {
		$token = trim(
			(string) (
				$params['recaptcha_token']
				?? $params['g-recaptcha-response']
				?? $params['captcha_token']
				?? ''
			)
		);
		if ( '' === $token ) {
			return self::missing_token_error();
		}

		$secret = Settings::recaptcha_secret_key();
		if ( '' === $secret ) {
			return new WP_Error(
				'kpf_form_captcha_unconfigured',
				__( 'reCAPTCHA is selected but no secret key is configured in Forms → Settings.', 'kpf-core' ),
				array( 'status' => 503, 'field' => 'captcha' )
			);
		}

		/**
		 * Short-circuit or override reCAPTCHA verification.
		 *
		 * @param true|WP_Error|null $result Pre-verified result, or null to run the default check.
		 * @param string             $token  Client token.
		 * @param array              $params Submission params.
		 */
		$filtered = apply_filters( 'kpf_forms_verify_recaptcha', null, $token, $params );
		if ( null !== $filtered ) {
			return self::normalize_filter_result( $filtered );
		}

		$result = self::siteverify(
			'https://www.google.com/recaptcha/api/siteverify',
			$secret,
			$token,
			$remote_ip,
			true
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// v3 responses include a score; enforce the configured minimum.
		if ( 'v3' === Settings::recaptcha_version() ) {
			$body = is_array( $result ) ? $result : array();
			$score = isset( $body['score'] ) ? (float) $body['score'] : 0.0;
			if ( $score < Settings::recaptcha_min_score() ) {
				return new WP_Error(
					'kpf_form_captcha_failed',
					__( 'Captcha verification failed. Please try again.', 'kpf-core' ),
					array( 'status' => 400, 'field' => 'captcha' )
				);
			}
		}

		return true;
	}

	/**
	 * @return true|array<string,mixed>|WP_Error
	 */
	private static function siteverify(
		string $endpoint,
		string $secret,
		string $token,
		string $remote_ip,
		bool $return_body = false
	) {
		$body_args = array(
			'secret'   => $secret,
			'response' => $token,
		);
		if ( '' !== $remote_ip ) {
			$body_args['remoteip'] = $remote_ip;
		}

		$response = wp_remote_post(
			$endpoint,
			array(
				'timeout' => 8,
				'body'    => $body_args,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'kpf_form_captcha_unavailable',
				__( 'Captcha verification is temporarily unavailable. Please try again.', 'kpf-core' ),
				array( 'status' => 503, 'field' => 'captcha' )
			);
		}

		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $body ) || empty( $body['success'] ) ) {
			return new WP_Error(
				'kpf_form_captcha_failed',
				__( 'Captcha verification failed. Please try again.', 'kpf-core' ),
				array( 'status' => 400, 'field' => 'captcha' )
			);
		}

		return $return_body ? $body : true;
	}

	/**
	 * @param mixed $filtered
	 * @return true|WP_Error
	 */
	private static function normalize_filter_result( $filtered ) {
		if ( is_wp_error( $filtered ) ) {
			return $filtered;
		}
		return true === $filtered
			? true
			: new WP_Error(
				'kpf_form_captcha_failed',
				__( 'Captcha verification failed. Please try again.', 'kpf-core' ),
				array( 'status' => 400, 'field' => 'captcha' )
			);
	}

	private static function missing_token_error(): WP_Error {
		return new WP_Error(
			'kpf_form_captcha_missing',
			__( 'Please complete the captcha challenge.', 'kpf-core' ),
			array( 'status' => 400, 'field' => 'captcha' )
		);
	}
}

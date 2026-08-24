<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

final class Meta {
	public const META_KEY = '_kpf_form';
	public const VERSION  = 1;
	public const MAX_FIELDS = 40;
	public const MAX_ROWS   = 40;
	public const MAX_RULES  = 20;

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
	}

	public static function register_meta(): void {
		register_post_meta(
			ContentType::POST_TYPE,
			self::META_KEY,
			array(
				'type'              => 'object',
				'single'            => true,
				'default'           => self::defaults(),
				'show_in_rest'      => false,
				'sanitize_callback' => array( self::class, 'sanitize' ),
				'auth_callback'     => static fn(): bool => current_user_can( 'edit_theme_options' ),
				'revisions_enabled' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		$field_id = 'field_name';
		$email_id = 'field_email';
		$msg_id   = 'field_message';

		return array(
			'version'  => self::VERSION,
			'status'   => 'active',
			'settings' => array(
				'submitLabel'        => __( 'Send message', 'kpf-core' ),
				'successMessage'     => __( 'Thank you. Your message has been received.', 'kpf-core' ),
				'successDisplay'     => 'inline',
				'redirectUrl'        => '',
				'inboxFormName'     => __( 'Contact form', 'kpf-core' ),
				'notificationEmails' => array(),
				'notifications'      => array(
					'enabled' => true,
					'emails'  => array(),
					'subject' => '',
				),
				'receipt'            => array(
					'enabled' => false,
					'subject' => '',
					'message' => __(
						"Thank you for contacting us. We received your message and will get back to you soon.\n\n— {site}",
						'kpf-core'
					),
				),
				'webhooks'           => array(),
				'captchaMode'        => 'honeypot',
				'analytics'          => array(
					'eventName' => 'form_submitted',
					'formTag'   => '',
				),
			),
			'rows'     => array(
				array(
					'id'      => 'row_1',
					'columns' => 2,
					'slots'   => array( array( $field_id ), array( $email_id ) ),
					'fields'  => array( $field_id, $email_id ),
				),
				array(
					'id'      => 'row_2',
					'columns' => 1,
					'slots'   => array( array( $msg_id ) ),
					'fields'  => array( $msg_id ),
				),
			),
			'fields'   => array(
				$field_id => self::default_field( $field_id, 'short_text', 'Name', 'name', 'half' ),
				$email_id => self::default_field( $email_id, 'email', 'Email', 'email', 'half' ),
				$msg_id   => self::default_field( $msg_id, 'long_text', 'Message', 'message', 'full' ),
			),
			'conditions' => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_field( string $id, string $type, string $label, string $name, string $width ): array {
		return array(
			'id'            => $id,
			'type'          => $type,
			'label'         => $label,
			'name'          => $name,
			'placeholder'   => '',
			'help'          => '',
			'required'      => in_array( $type, array( 'email', 'short_text', 'long_text' ), true ),
			'width'         => $width,
			'options'       => array(),
			'validation'    => array(),
			'analyticsTag'  => '',
			'defaultValue'  => '',
			'html'          => '',
			'accept'        => '',
			'platform'      => 'x',
			'countryDefault'=> 'US',
			'conditions'    => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get( int $post_id ): array {
		$value = get_post_meta( $post_id, self::META_KEY, true );
		return self::sanitize( is_array( $value ) ? $value : array() );
	}

	/**
	 * @param array<string, mixed> $value
	 * @return array<string, mixed>
	 */
	public static function update( int $post_id, array $value ): array {
		$clean = self::sanitize( $value );
		update_post_meta( $post_id, self::META_KEY, $clean );
		return $clean;
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$value    = is_array( $value ) ? $value : array();
		$defaults = self::defaults();

		$status = sanitize_key( (string) ( $value['status'] ?? $defaults['status'] ) );
		if ( ! in_array( $status, array( 'active', 'inactive' ), true ) ) {
			$status = 'active';
		}

		return array(
			'version'    => self::VERSION,
			'status'     => $status,
			'settings'   => self::sanitize_settings( $value['settings'] ?? array(), $defaults['settings'] ),
			'fields'     => self::sanitize_fields( $value['fields'] ?? array() ),
			'rows'       => self::sanitize_rows( $value['rows'] ?? array(), $value['fields'] ?? array() ),
			'conditions' => self::sanitize_conditions( $value['conditions'] ?? array() ),
		);
	}

	/**
	 * @param mixed                $raw
	 * @param array<string, mixed> $defaults
	 * @return array<string, mixed>
	 */
	private static function sanitize_settings( $raw, array $defaults ): array {
		$raw = is_array( $raw ) ? $raw : array();

		$notify_raw = is_array( $raw['notifications'] ?? null ) ? $raw['notifications'] : array();
		$emails     = array();
		$email_sources = array_merge(
			(array) ( $notify_raw['emails'] ?? array() ),
			(array) ( $raw['notificationEmails'] ?? array() )
		);
		foreach ( $email_sources as $email ) {
			$email = sanitize_email( (string) $email );
			if ( $email && is_email( $email ) ) {
				$emails[] = $email;
			}
		}
		$emails = array_values( array_unique( array_slice( $emails, 0, 10 ) ) );

		$notify_defaults = is_array( $defaults['notifications'] ?? null ) ? $defaults['notifications'] : array();
		$notifications   = array(
			'enabled' => array_key_exists( 'enabled', $notify_raw )
				? ! empty( $notify_raw['enabled'] )
				: ! empty( $notify_defaults['enabled'] ),
			'emails'  => $emails,
			'subject' => sanitize_text_field( (string) ( $notify_raw['subject'] ?? '' ) ),
		);

		$receipt_raw      = is_array( $raw['receipt'] ?? null ) ? $raw['receipt'] : array();
		$receipt_defaults = is_array( $defaults['receipt'] ?? null ) ? $defaults['receipt'] : array();
		$receipt          = array(
			'enabled' => ! empty( $receipt_raw['enabled'] ),
			'subject' => sanitize_text_field( (string) ( $receipt_raw['subject'] ?? '' ) ),
			'message' => sanitize_textarea_field(
				(string) ( $receipt_raw['message'] ?? ( $receipt_defaults['message'] ?? '' ) )
			),
		);

		$webhooks = array();
		foreach ( (array) ( $raw['webhooks'] ?? array() ) as $url ) {
			$url = esc_url_raw( (string) $url );
			if ( $url && wp_http_validate_url( $url ) ) {
				$webhooks[] = $url;
			}
		}
		$webhooks = array_values( array_unique( array_slice( $webhooks, 0, 5 ) ) );

		$captcha = sanitize_key( (string) ( $raw['captchaMode'] ?? $defaults['captchaMode'] ) );
		if ( ! in_array( $captcha, Catalog::captcha_modes(), true ) ) {
			$captcha = 'honeypot';
		}

		$success_display = sanitize_key( (string) ( $raw['successDisplay'] ?? ( $defaults['successDisplay'] ?? 'inline' ) ) );
		if ( ! in_array( $success_display, array( 'inline', 'toast', 'modal' ), true ) ) {
			$success_display = 'inline';
		}

		$analytics = is_array( $raw['analytics'] ?? null ) ? $raw['analytics'] : array();

		return array(
			'submitLabel'        => sanitize_text_field( (string) ( $raw['submitLabel'] ?? $defaults['submitLabel'] ) ),
			'successMessage'     => sanitize_textarea_field( (string) ( $raw['successMessage'] ?? $defaults['successMessage'] ) ),
			'successDisplay'     => $success_display,
			'redirectUrl'        => esc_url_raw( (string) ( $raw['redirectUrl'] ?? '' ) ),
			'inboxFormName'     => sanitize_text_field( (string) ( $raw['inboxFormName'] ?? $defaults['inboxFormName'] ) ),
			'notificationEmails' => $emails,
			'notifications'      => $notifications,
			'receipt'            => $receipt,
			'webhooks'           => $webhooks,
			'captchaMode'        => $captcha,
			'analytics'          => array(
				'eventName' => sanitize_key( (string) ( $analytics['eventName'] ?? 'kpf_form_submit' ) ) ?: 'kpf_form_submit',
				'formTag'   => sanitize_text_field( (string) ( $analytics['formTag'] ?? '' ) ),
			),
		);
	}

	/**
	 * @param mixed $raw
	 * @return array<string, array<string, mixed>>
	 */
	private static function sanitize_fields( $raw ): array {
		$raw = is_array( $raw ) ? $raw : array();
		$out = array();
		$count = 0;
		$allowed_types = Catalog::field_type_ids();

		foreach ( $raw as $key => $field ) {
			if ( $count >= self::MAX_FIELDS || ! is_array( $field ) ) {
				continue;
			}

			$id = sanitize_key( (string) ( $field['id'] ?? $key ) );
			if ( '' === $id ) {
				continue;
			}

			$type = sanitize_key( (string) ( $field['type'] ?? 'short_text' ) );
			if ( ! in_array( $type, $allowed_types, true ) ) {
				$type = 'short_text';
			}

			$width = sanitize_key( (string) ( $field['width'] ?? 'full' ) );
			$width = in_array( $width, array( 'full', 'half' ), true ) ? $width : 'full';

			$name = sanitize_key( (string) ( $field['name'] ?? $id ) );
			if ( '' === $name ) {
				$name = $id;
			}

			$options = array();
			foreach ( (array) ( $field['options'] ?? array() ) as $option ) {
				if ( is_array( $option ) ) {
					$label = sanitize_text_field( (string) ( $option['label'] ?? '' ) );
					$value = sanitize_text_field( (string) ( $option['value'] ?? $label ) );
				} else {
					$label = sanitize_text_field( (string) $option );
					$value = $label;
				}
				if ( '' !== $label ) {
					$options[] = array(
						'label' => $label,
						'value' => $value !== '' ? $value : $label,
					);
				}
				if ( count( $options ) >= 50 ) {
					break;
				}
			}

			$platform = sanitize_key( (string) ( $field['platform'] ?? 'x' ) );
			if ( ! in_array( $platform, Catalog::social_platforms(), true ) ) {
				$platform = 'x';
			}

			$country = strtoupper( sanitize_key( (string) ( $field['countryDefault'] ?? 'US' ) ) );
			$valid_countries = array_column( Catalog::countries(), 'code' );
			if ( ! in_array( $country, $valid_countries, true ) ) {
				$country = 'US';
			}

			$validation = is_array( $field['validation'] ?? null ) ? $field['validation'] : array();

			$out[ $id ] = array(
				'id'             => $id,
				'type'           => $type,
				'label'          => sanitize_text_field( (string) ( $field['label'] ?? $id ) ),
				'name'           => $name,
				'placeholder'    => sanitize_text_field( (string) ( $field['placeholder'] ?? '' ) ),
				'help'           => sanitize_text_field( (string) ( $field['help'] ?? '' ) ),
				'required'       => ! empty( $field['required'] ),
				'width'          => $width,
				'options'        => $options,
				'validation'     => array(
					'min'     => isset( $validation['min'] ) ? (float) $validation['min'] : null,
					'max'     => isset( $validation['max'] ) ? (float) $validation['max'] : null,
					'pattern' => sanitize_text_field( (string) ( $validation['pattern'] ?? '' ) ),
					'minLength'=> isset( $validation['minLength'] ) ? absint( $validation['minLength'] ) : null,
					'maxLength'=> isset( $validation['maxLength'] ) ? absint( $validation['maxLength'] ) : null,
				),
				'analyticsTag'   => sanitize_text_field( (string) ( $field['analyticsTag'] ?? '' ) ),
				'defaultValue'   => sanitize_text_field( (string) ( $field['defaultValue'] ?? '' ) ),
				'html'           => wp_kses_post( (string) ( $field['html'] ?? '' ) ),
				'accept'         => sanitize_text_field( (string) ( $field['accept'] ?? '' ) ),
				'platform'       => $platform,
				'countryDefault' => $country,
				'conditions'     => self::sanitize_conditions( $field['conditions'] ?? array() ),
			);
			++$count;
		}

		return $out;
	}

	/**
	 * @param mixed                      $raw
	 * @param array<string, mixed>|mixed $fields_raw
	 * @return array<int, array<string, mixed>>
	 */
	private static function sanitize_rows( $raw, $fields_raw ): array {
		$raw       = is_array( $raw ) ? $raw : array();
		$fields    = self::sanitize_fields( $fields_raw );
		$field_ids = array_keys( $fields );
		$out       = array();
		$count     = 0;
		$seen      = array();

		foreach ( $raw as $row ) {
			if ( $count >= self::MAX_ROWS || ! is_array( $row ) ) {
				continue;
			}
			$id      = sanitize_key( (string) ( $row['id'] ?? 'row_' . ( $count + 1 ) ) );
			$columns = 2 === (int) ( $row['columns'] ?? 1 ) ? 2 : 1;
			$slots   = self::sanitize_slots( $row, $columns, $field_ids, $seen );

			$out[] = array(
				'id'      => $id ?: ( 'row_' . ( $count + 1 ) ),
				'columns' => $columns,
				'slots'   => $slots,
				'fields'  => self::flatten_slots( $slots ),
			);
			++$count;
		}

		if ( ! $out && $field_ids ) {
			$out[] = array(
				'id'      => 'row_1',
				'columns' => 1,
				'slots'   => array( array_slice( $field_ids, 0, 1 ) ),
				'fields'  => array_slice( $field_ids, 0, 1 ),
			);
		}

		return $out;
	}

	/**
	 * @param array<string, mixed> $row
	 * @param int                  $columns
	 * @param array<int, string>   $field_ids
	 * @param array<string, true>  $seen
	 * @return array<int, array<int, string>>
	 */
	private static function sanitize_slots( array $row, int $columns, array $field_ids, array &$seen ): array {
		$slots = array();

		if ( isset( $row['slots'] ) && is_array( $row['slots'] ) ) {
			for ( $i = 0; $i < $columns; $i++ ) {
				$slots[] = self::sanitize_slot_ids( $row['slots'][ $i ] ?? array(), $field_ids, $seen );
			}
			return $slots;
		}

		// Legacy rows: one field id per column slot.
		$legacy = self::sanitize_slot_ids( $row['fields'] ?? array(), $field_ids, $seen );
		if ( 2 === $columns ) {
			return array(
				isset( $legacy[0] ) ? array( $legacy[0] ) : array(),
				isset( $legacy[1] ) ? array( $legacy[1] ) : array(),
			);
		}

		return array( $legacy );
	}

	/**
	 * @param mixed               $raw
	 * @param array<int, string>  $field_ids
	 * @param array<string, true> $seen
	 * @return array<int, string>
	 */
	private static function sanitize_slot_ids( $raw, array $field_ids, array &$seen ): array {
		$ids = array();
		foreach ( (array) $raw as $fid ) {
			$fid = sanitize_key( (string) $fid );
			if ( ! $fid || ! in_array( $fid, $field_ids, true ) || isset( $seen[ $fid ] ) ) {
				continue;
			}
			$seen[ $fid ] = true;
			$ids[]        = $fid;
			if ( count( $ids ) >= self::MAX_FIELDS ) {
				break;
			}
		}
		return $ids;
	}

	/**
	 * @param array<int, array<int, string>> $slots
	 * @return array<int, string>
	 */
	private static function flatten_slots( array $slots ): array {
		$out = array();
		foreach ( $slots as $slot ) {
			foreach ( $slot as $fid ) {
				if ( $fid && ! in_array( $fid, $out, true ) ) {
					$out[] = $fid;
				}
			}
		}
		return $out;
	}

	/**
	 * @param mixed $raw
	 * @return array<int, array<string, mixed>>
	 */
	private static function sanitize_conditions( $raw ): array {
		$raw = is_array( $raw ) ? $raw : array();
		$out = array();
		$sources = array_column( Catalog::condition_sources(), 'id' );
		$operators = Catalog::condition_operators();
		$actions = array( 'show', 'hide', 'require' );

		foreach ( $raw as $condition ) {
			if ( count( $out ) >= self::MAX_RULES || ! is_array( $condition ) ) {
				continue;
			}

			$action = sanitize_key( (string) ( $condition['action'] ?? 'show' ) );
			if ( ! in_array( $action, $actions, true ) ) {
				$action = 'show';
			}

			$match = sanitize_key( (string) ( $condition['match'] ?? 'all' ) );
			$match = 'any' === $match ? 'any' : 'all';

			$rules = array();
			foreach ( (array) ( $condition['rules'] ?? array() ) as $rule ) {
				if ( ! is_array( $rule ) || count( $rules ) >= self::MAX_RULES ) {
					continue;
				}
				$source = sanitize_key( (string) ( $rule['source'] ?? 'field' ) );
				if ( ! in_array( $source, $sources, true ) ) {
					continue;
				}
				$operator = sanitize_key( (string) ( $rule['operator'] ?? 'equals' ) );
				if ( ! in_array( $operator, $operators, true ) ) {
					$operator = 'equals';
				}
				$rules[] = array(
					'source'   => $source,
					'operator' => $operator,
					'key'      => sanitize_text_field( (string) ( $rule['key'] ?? '' ) ),
					'value'    => sanitize_text_field( (string) ( $rule['value'] ?? '' ) ),
					'fieldId'  => sanitize_key( (string) ( $rule['fieldId'] ?? '' ) ),
				);
			}

			if ( ! $rules ) {
				continue;
			}

			$out[] = array(
				'id'     => sanitize_key( (string) ( $condition['id'] ?? 'cond_' . ( count( $out ) + 1 ) ) ),
				'action' => $action,
				'match'  => $match,
				'rules'  => $rules,
			);
		}

		return $out;
	}
}

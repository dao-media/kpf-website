<?php

declare(strict_types=1);

namespace KPF\Core\Events;

use KPF\Core\Seo\MetaRepository;

final class Meta {
	public const META_KEY        = '_kpf_event';
	public const START_DATE_META = '_kpf_event_start_date';
	public const VERSION         = 2;

	public const FREQUENCIES = array(
		'one_time',
		'weekly',
		'monthly',
		'quarterly',
		'semiannually',
		'annually',
	);

	public const LOCATION_MODES = array( 'none', 'area', 'address', 'directions' );

	private const WEEKDAYS = array( 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU' );

	private const MONTHLY_MODES = array( 'day_of_month', 'nth_weekday' );

	/** Annual/semiannual anchors: fixed calendar day, nth weekday, or month-only. */
	private const ANCHOR_DAY_MODES = array( 'exact', 'nth_weekday', 'month' );

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
		add_action( 'added_post_meta', array( self::class, 'sync_on_meta_change' ), 10, 4 );
		add_action( 'updated_post_meta', array( self::class, 'sync_on_meta_change' ), 10, 4 );
		add_action(
			'save_post_' . ContentType::POST_TYPE,
			array( self::class, 'sync_taxonomies_from_meta' ),
			20,
			2
		);
	}

	public static function register_meta(): void {
		register_post_meta(
			ContentType::POST_TYPE,
			self::META_KEY,
			array(
				'type'              => 'object',
				'single'            => true,
				'default'           => self::defaults(),
				'show_in_rest'      => array( 'schema' => self::rest_schema() ),
				'sanitize_callback' => array( self::class, 'sanitize' ),
				'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
					unset( $allowed, $meta_key );
					return current_user_can( 'edit_post', $post_id );
				},
				'revisions_enabled' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'       => self::VERSION,
			'logline'       => '',
			'description'   => '',
			'contact_email'  => '',
			'contact_phone'  => '',
			'website'        => '',
			'ticketing_link' => '',
			'location'       => self::default_location(),
			'frequency'     => 'one_time',
			'duration_days' => 1,
			'schedule'      => self::default_schedule(),
			'host_term_ids' => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_location(): array {
		return array(
			'mode'        => 'none',
			'label'       => '',
			'line1'       => '',
			'line2'       => '',
			'city'        => '',
			'state'       => '',
			'postal_code' => '',
			'url'         => '',
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_schedule(): array {
		return array(
			'start_date'    => '',
			'by_weekday'    => array(),
			'monthly_mode'  => 'day_of_month',
			'by_monthday'   => 0,
			'nth_weekday'   => array(
				'n'   => 1,
				'day' => 'MO',
			),
			'by_month'      => array(),
			'anchors'       => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function rest_schema(): array {
		return array(
			'type'                 => 'object',
			'additionalProperties' => false,
			'properties'           => array(
				'version'       => array(
					'type'    => 'integer',
					'default' => self::VERSION,
				),
				'logline'       => array( 'type' => 'string', 'default' => '' ),
				'description'   => array( 'type' => 'string', 'default' => '' ),
				'contact_email'  => array( 'type' => 'string', 'default' => '' ),
				'contact_phone'  => array( 'type' => 'string', 'default' => '' ),
				// No format:uri — partial/empty values must round-trip while editing.
				'website'        => array( 'type' => 'string', 'default' => '' ),
				'ticketing_link' => array( 'type' => 'string', 'default' => '' ),
				'location'       => array(
					'type'                 => 'object',
					'additionalProperties' => false,
					'default'              => self::default_location(),
					'properties'           => array(
						'mode'        => array(
							'type'    => 'string',
							'enum'    => self::LOCATION_MODES,
							'default' => 'none',
						),
						'label'       => array( 'type' => 'string', 'default' => '' ),
						'line1'       => array( 'type' => 'string', 'default' => '' ),
						'line2'       => array( 'type' => 'string', 'default' => '' ),
						'city'        => array( 'type' => 'string', 'default' => '' ),
						'state'       => array( 'type' => 'string', 'default' => '' ),
						'postal_code' => array( 'type' => 'string', 'default' => '' ),
						'url'         => array( 'type' => 'string', 'default' => '' ),
					),
				),
				'frequency'     => array(
					'type'    => 'string',
					'enum'    => self::FREQUENCIES,
					'default' => 'one_time',
				),
				'duration_days' => array(
					'type'    => 'integer',
					'minimum' => 1,
					'maximum' => 30,
					'default' => 1,
				),
				'schedule'      => array(
					'type'                 => 'object',
					'additionalProperties' => false,
					'default'              => self::default_schedule(),
					'properties'           => array(
						'start_date'   => array( 'type' => 'string', 'default' => '' ),
						'by_weekday'   => array(
							'type'  => 'array',
							'items' => array( 'type' => 'string', 'enum' => self::WEEKDAYS ),
						),
						'monthly_mode' => array(
							'type' => 'string',
							'enum' => self::MONTHLY_MODES,
						),
						'by_monthday'  => array(
							'type'    => 'integer',
							'minimum' => 0,
							'maximum' => 31,
						),
						'nth_weekday'  => array(
							'type'       => 'object',
							'properties' => array(
								'n'   => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 5 ),
								'day' => array( 'type' => 'string', 'enum' => self::WEEKDAYS ),
							),
						),
						'by_month'     => array(
							'type'  => 'array',
							'items' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 12 ),
						),
						'anchors'      => array(
							'type'  => 'array',
							'items' => array(
								'type'                 => 'object',
								'additionalProperties' => false,
								'properties'           => array(
									'month'       => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 12 ),
									'day'         => array( 'type' => 'integer', 'minimum' => 0, 'maximum' => 31 ),
									'day_mode'    => array(
										'type' => 'string',
										'enum' => self::ANCHOR_DAY_MODES,
									),
									'nth_weekday' => array(
										'type'       => 'object',
										'properties' => array(
											'n'   => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 5 ),
											'day' => array( 'type' => 'string', 'enum' => self::WEEKDAYS ),
										),
									),
								),
							),
						),
					),
				),
				'host_term_ids' => array(
					'type'  => 'array',
					'items' => array( 'type' => 'integer', 'minimum' => 1 ),
				),
			),
		);
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$value = is_array( $value ) ? $value : array();

		// Legacy v1 → v2 field mapping when reading old blobs into sanitize.
		if ( empty( $value['host_term_ids'] ) && ! empty( $value['co_host_term_ids'] ) ) {
			$value['host_term_ids'] = $value['co_host_term_ids'];
		}
		if ( empty( $value['frequency'] ) && ! empty( $value['is_recurring'] ) ) {
			$legacy_freq = sanitize_key( (string) ( $value['recurrence']['frequency'] ?? 'weekly' ) );
			$map         = array(
				'daily'   => 'weekly',
				'weekly'  => 'weekly',
				'monthly' => 'monthly',
				'yearly'  => 'annually',
			);
			$value['frequency'] = $map[ $legacy_freq ] ?? 'weekly';
		}
		if ( empty( $value['schedule'] ) || ! is_array( $value['schedule'] ) ) {
			$value['schedule'] = array();
			if ( ! empty( $value['start_date'] ) ) {
				$value['schedule']['start_date'] = $value['start_date'];
			}
			if ( is_array( $value['recurrence'] ?? null ) ) {
				$rec = $value['recurrence'];
				$value['schedule']['by_weekday']   = $rec['by_weekday'] ?? array();
				$value['schedule']['by_month']     = $rec['by_month'] ?? array();
				$value['schedule']['monthly_mode'] = $rec['monthly_mode'] ?? 'day_of_month';
				$value['schedule']['nth_weekday']  = $rec['nth_weekday'] ?? array();
				$days = $rec['by_monthday'] ?? array();
				if ( is_array( $days ) && isset( $days[0] ) ) {
					$value['schedule']['by_monthday'] = (int) $days[0];
				}
			}
		}
		if ( empty( $value['logline'] ) && ! empty( $value['description'] ) && empty( $value['version'] ) ) {
			// Keep description; logline stays empty for legacy.
		}

		$frequency = sanitize_key( (string) ( $value['frequency'] ?? 'one_time' ) );
		if ( ! in_array( $frequency, self::FREQUENCIES, true ) ) {
			$frequency = 'one_time';
		}

		$website         = self::sanitize_website( (string) ( $value['website'] ?? '' ) );
		$ticketing_link  = self::sanitize_website( (string) ( $value['ticketing_link'] ?? '' ) );
		$email           = sanitize_email( (string) ( $value['contact_email'] ?? '' ) );
		$phone           = sanitize_text_field( (string) ( $value['contact_phone'] ?? '' ) );

		return array(
			'version'        => self::VERSION,
			'logline'        => sanitize_text_field( (string) ( $value['logline'] ?? '' ) ),
			'description'    => sanitize_textarea_field( (string) ( $value['description'] ?? '' ) ),
			'contact_email'  => is_email( $email ) ? $email : '',
			'contact_phone'  => $phone,
			'website'        => $website,
			'ticketing_link' => $ticketing_link,
			'location'       => self::sanitize_location( $value['location'] ?? array() ),
			'frequency'      => $frequency,
			'duration_days'  => max( 1, min( 30, absint( $value['duration_days'] ?? 1 ) ) ),
			'schedule'       => self::sanitize_schedule( $value['schedule'] ?? array() ),
			'host_term_ids'  => self::sanitize_id_list( $value['host_term_ids'] ?? array() ),
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
	 * Human schedule string for cards / admin, with frequency-name fallback.
	 *
	 * @param array<string, mixed> $meta
	 */
	public static function format_schedule_label( array $meta ): string {
		$meta      = self::sanitize( $meta );
		$frequency = (string) $meta['frequency'];
		$schedule  = is_array( $meta['schedule'] ?? null ) ? $meta['schedule'] : self::default_schedule();
		$duration  = max( 1, (int) ( $meta['duration_days'] ?? 1 ) );
		$fallback  = self::frequency_label( $frequency );

		$detail = '';

		switch ( $frequency ) {
			case 'one_time':
				$start = (string) ( $schedule['start_date'] ?? '' );
				if ( '' !== $start ) {
					$detail = self::format_date_range( $start, $duration );
				}
				break;

			case 'weekly':
				$days = array_values( array_filter( (array) ( $schedule['by_weekday'] ?? array() ) ) );
				if ( $days ) {
					$names = array_map( array( self::class, 'weekday_label' ), $days );
					$detail = sprintf(
						/* translators: %s: comma-separated weekdays */
						__( 'Weekly on %s', 'kpf-core' ),
						self::join_list( $names )
					);
					$detail = self::append_duration_note( $detail, $duration );
				}
				break;

			case 'monthly':
				$mode = (string) ( $schedule['monthly_mode'] ?? 'day_of_month' );
				if ( 'nth_weekday' === $mode ) {
					$nth = is_array( $schedule['nth_weekday'] ?? null ) ? $schedule['nth_weekday'] : array();
					$n   = (int) ( $nth['n'] ?? 0 );
					$day = (string) ( $nth['day'] ?? '' );
					if ( $n >= 1 && $n <= 5 && '' !== $day ) {
						$detail = sprintf(
							/* translators: 1: ordinal week (first, second…), 2: weekday name */
							__( 'Monthly on the %1$s %2$s', 'kpf-core' ),
							self::ordinal_week_label( $n ),
							self::weekday_label( $day )
						);
						$detail = self::append_duration_note( $detail, $duration );
					}
				} else {
					$monthday = (int) ( $schedule['by_monthday'] ?? 0 );
					if ( $monthday >= 1 && $monthday <= 31 ) {
						$detail = sprintf(
							/* translators: %s: day of month with ordinal suffix */
							__( 'Monthly on the %s', 'kpf-core' ),
							self::ordinal_day( $monthday )
						);
						$detail = self::append_duration_note( $detail, $duration );
					}
				}
				break;

			case 'quarterly':
				$months = array_values( array_filter( array_map( 'intval', (array) ( $schedule['by_month'] ?? array() ) ) ) );
				$day_bit = self::format_day_rule_fragment( $schedule );
				if ( $months && '' !== $day_bit ) {
					$month_names = array_map( array( self::class, 'month_label' ), $months );
					$detail      = sprintf(
						/* translators: 1: months list, 2: day rule fragment */
						__( 'Quarterly in %1$s, %2$s', 'kpf-core' ),
						self::join_list( $month_names ),
						$day_bit
					);
					$detail = self::append_duration_note( $detail, $duration );
				} elseif ( $months ) {
					$month_names = array_map( array( self::class, 'month_label' ), $months );
					$detail      = sprintf(
						/* translators: %s: months list */
						__( 'Quarterly in %s', 'kpf-core' ),
						self::join_list( $month_names )
					);
				} elseif ( '' !== $day_bit ) {
					$detail = sprintf(
						/* translators: %s: day rule fragment */
						__( 'Quarterly, %s', 'kpf-core' ),
						$day_bit
					);
					$detail = self::append_duration_note( $detail, $duration );
				}
				break;

			case 'semiannually':
			case 'annually':
				$anchors = self::sanitize_anchors( $schedule['anchors'] ?? array() );
				if ( $anchors ) {
					$parts = array();
					$modes = array();
					foreach ( $anchors as $anchor ) {
						$parts[] = self::format_anchor( $anchor );
						$modes[] = (string) ( $anchor['day_mode'] ?? 'exact' );
					}
					$parts = array_values( array_filter( $parts ) );
					if ( $parts ) {
						$joined     = self::join_list( $parts );
						$all_month  = $modes && count( array_unique( $modes ) ) === 1 && 'month' === $modes[0];
						$all_exact  = $modes && count( array_unique( $modes ) ) === 1 && 'exact' === $modes[0];
						$is_annual  = 'annually' === $frequency;
						if ( $all_month ) {
							$detail = $is_annual
								? sprintf(
									/* translators: %s: month name(s) */
									__( 'Annually in %s', 'kpf-core' ),
									$joined
								)
								: sprintf(
									/* translators: %s: month name list */
									__( 'Semiannually in %s', 'kpf-core' ),
									$joined
								);
						} elseif ( $all_exact ) {
							$detail = $is_annual
								? sprintf(
									/* translators: %s: month day (e.g. August 29) */
									__( 'Annually on %s', 'kpf-core' ),
									$joined
								)
								: sprintf(
									/* translators: %s: month day list */
									__( 'Semiannually on %s', 'kpf-core' ),
									$joined
								);
						} else {
							$detail = $is_annual
								? sprintf(
									/* translators: %s: annual date rule (e.g. the third Saturday of August) */
									__( 'Annually · %s', 'kpf-core' ),
									$joined
								)
								: sprintf(
									/* translators: %s: semiannual date rules */
									__( 'Semiannually · %s', 'kpf-core' ),
									$joined
								);
						}
						$detail = self::append_duration_note( $detail, $duration );
					}
				}
				break;
		}

		return '' !== $detail ? $detail : $fallback;
	}

	public static function frequency_label( string $frequency ): string {
		$labels = array(
			'one_time'      => __( 'One time', 'kpf-core' ),
			'weekly'        => __( 'Weekly', 'kpf-core' ),
			'monthly'       => __( 'Monthly', 'kpf-core' ),
			'quarterly'     => __( 'Quarterly', 'kpf-core' ),
			'semiannually'  => __( 'Semiannually', 'kpf-core' ),
			'annually'      => __( 'Annually', 'kpf-core' ),
		);
		return $labels[ $frequency ] ?? '';
	}

	/**
	 * @param mixed $meta_value
	 */
	public static function sync_on_meta_change( int $meta_id, int $post_id, string $meta_key, $meta_value ): void {
		unset( $meta_id );
		if ( self::META_KEY !== $meta_key || ContentType::POST_TYPE !== get_post_type( $post_id ) ) {
			return;
		}

		$clean = self::sanitize( is_array( $meta_value ) ? $meta_value : array() );
		$start = (string) ( $clean['schedule']['start_date'] ?? '' );
		update_post_meta( $post_id, self::START_DATE_META, $start );

		if ( '' !== $clean['description'] && class_exists( MetaRepository::class ) ) {
			$seo                         = MetaRepository::get( $post_id );
			$seo['description_template'] = $clean['logline'] !== '' ? $clean['logline'] : $clean['description'];
			MetaRepository::update( $post_id, $seo );
		}
	}

	public static function sync_taxonomies_from_meta( int $post_id, \WP_Post $post ): void {
		unset( $post );
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		$meta = self::get( $post_id );
		$ids  = array_map( 'intval', $meta['host_term_ids'] );
		wp_set_object_terms( $post_id, $ids, ContentType::HOST_TAXONOMY, false );
	}

	/**
	 * Human-readable location for cards / admin.
	 *
	 * @param array<string, mixed> $meta
	 */
	public static function format_location_label( array $meta ): string {
		$location = self::sanitize_location( $meta['location'] ?? array() );
		$mode     = (string) $location['mode'];
		$label    = trim( (string) $location['label'] );

		if ( 'none' === $mode ) {
			return '';
		}

		if ( 'directions' === $mode ) {
			if ( '' !== $label ) {
				return $label;
			}
			return '' !== $location['url'] ? __( 'Get directions', 'kpf-core' ) : '';
		}

		$parts = array();
		if ( 'address' === $mode ) {
			foreach ( array( 'line1', 'line2' ) as $key ) {
				$value = trim( (string) $location[ $key ] );
				if ( '' !== $value ) {
					$parts[] = $value;
				}
			}
		}

		$city_state = self::format_city_state( $location );
		if ( '' !== $city_state ) {
			$parts[] = $city_state;
		}

		$postal = trim( (string) $location['postal_code'] );
		if ( '' !== $postal && ! str_contains( implode( ' ', $parts ), $postal ) ) {
			$parts[] = $postal;
		}

		$body = implode( ', ', array_filter( $parts ) );
		if ( '' !== $label && '' !== $body ) {
			return $label . ' — ' . $body;
		}
		if ( '' !== $label ) {
			return $label;
		}
		return $body;
	}

	/**
	 * Maps / driving-directions URL for the location.
	 *
	 * @param array<string, mixed> $meta
	 */
	public static function location_maps_url( array $meta ): string {
		$location = self::sanitize_location( $meta['location'] ?? array() );
		$mode     = (string) $location['mode'];

		if ( 'none' === $mode ) {
			return '';
		}

		if ( 'directions' === $mode || '' !== trim( (string) $location['url'] ) ) {
			return (string) $location['url'];
		}

		$query_parts = array();
		if ( '' !== trim( (string) $location['label'] ) ) {
			$query_parts[] = trim( (string) $location['label'] );
		}
		if ( 'address' === $mode ) {
			foreach ( array( 'line1', 'line2' ) as $key ) {
				$value = trim( (string) $location[ $key ] );
				if ( '' !== $value ) {
					$query_parts[] = $value;
				}
			}
		}
		$city_state = self::format_city_state( $location );
		if ( '' !== $city_state ) {
			$query_parts[] = $city_state;
		}
		$postal = trim( (string) $location['postal_code'] );
		if ( '' !== $postal ) {
			$query_parts[] = $postal;
		}

		$query = trim( implode( ', ', array_filter( $query_parts ) ) );
		if ( '' === $query ) {
			return '';
		}

		return 'https://www.google.com/maps/dir/?api=1&destination=' . rawurlencode( $query );
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	private static function sanitize_location( $value ): array {
		$value    = is_array( $value ) ? $value : array();
		$defaults = self::default_location();
		$mode     = sanitize_key( (string) ( $value['mode'] ?? $defaults['mode'] ) );
		if ( ! in_array( $mode, self::LOCATION_MODES, true ) ) {
			$mode = 'none';
		}

		$label       = sanitize_text_field( (string) ( $value['label'] ?? '' ) );
		$line1       = sanitize_text_field( (string) ( $value['line1'] ?? '' ) );
		$line2       = sanitize_text_field( (string) ( $value['line2'] ?? '' ) );
		$city        = sanitize_text_field( (string) ( $value['city'] ?? '' ) );
		$state       = strtoupper( sanitize_text_field( (string) ( $value['state'] ?? '' ) ) );
		$postal_code = sanitize_text_field( (string) ( $value['postal_code'] ?? '' ) );
		$url         = self::sanitize_website( (string) ( $value['url'] ?? '' ) );

		// Soft-normalize US state to 2 letters when possible; keep free text otherwise.
		if ( strlen( $state ) > 2 ) {
			$state = sanitize_text_field( (string) ( $value['state'] ?? '' ) );
		}

		if ( 'none' === $mode ) {
			return $defaults;
		}

		if ( 'area' === $mode ) {
			$line1 = '';
			$line2 = '';
			if ( '' === $city && '' === $state && '' === $postal_code && '' === $label ) {
				return $defaults;
			}
		}

		if ( 'address' === $mode ) {
			if ( '' === $line1 && '' === $city && '' === $postal_code && '' === $label ) {
				return $defaults;
			}
		}

		if ( 'directions' === $mode ) {
			$line1       = '';
			$line2       = '';
			$city        = '';
			$state       = '';
			$postal_code = '';
			if ( '' === $url ) {
				return $defaults;
			}
		}

		return array(
			'mode'        => $mode,
			'label'       => $label,
			'line1'       => $line1,
			'line2'       => $line2,
			'city'        => $city,
			'state'       => $state,
			'postal_code' => $postal_code,
			'url'         => $url,
		);
	}

	/**
	 * @param array<string, mixed> $location
	 */
	private static function format_city_state( array $location ): string {
		$city  = trim( (string) ( $location['city'] ?? '' ) );
		$state = trim( (string) ( $location['state'] ?? '' ) );
		if ( '' !== $city && '' !== $state ) {
			return $city . ', ' . $state;
		}
		return $city !== '' ? $city : $state;
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	private static function sanitize_schedule( $value ): array {
		$value    = is_array( $value ) ? $value : array();
		$defaults = self::default_schedule();

		$mode = sanitize_key( (string) ( $value['monthly_mode'] ?? $defaults['monthly_mode'] ) );
		if ( ! in_array( $mode, self::MONTHLY_MODES, true ) ) {
			$mode = 'day_of_month';
		}

		$by_weekday = array();
		foreach ( (array) ( $value['by_weekday'] ?? array() ) as $day ) {
			$day = strtoupper( sanitize_key( (string) $day ) );
			if ( in_array( $day, self::WEEKDAYS, true ) ) {
				$by_weekday[] = $day;
			}
		}
		$by_weekday = array_values( array_unique( $by_weekday ) );

		$by_month = array();
		foreach ( (array) ( $value['by_month'] ?? array() ) as $month ) {
			$month = absint( $month );
			if ( $month >= 1 && $month <= 12 ) {
				$by_month[] = $month;
			}
		}
		$by_month = array_values( array_unique( $by_month ) );
		sort( $by_month );

		$nth = is_array( $value['nth_weekday'] ?? null ) ? $value['nth_weekday'] : array();
		$n   = max( 1, min( 5, absint( $nth['n'] ?? 1 ) ) );
		$day = strtoupper( sanitize_key( (string) ( $nth['day'] ?? 'MO' ) ) );
		if ( ! in_array( $day, self::WEEKDAYS, true ) ) {
			$day = 'MO';
		}

		$monthday = absint( $value['by_monthday'] ?? 0 );
		if ( $monthday > 31 ) {
			$monthday = 0;
		}

		return array(
			'start_date'   => self::sanitize_date( (string) ( $value['start_date'] ?? '' ) ),
			'by_weekday'   => $by_weekday,
			'monthly_mode' => $mode,
			'by_monthday'  => $monthday,
			'nth_weekday'  => array(
				'n'   => $n,
				'day' => $day,
			),
			'by_month'     => $by_month,
			'anchors'      => self::sanitize_anchors( $value['anchors'] ?? array() ),
		);
	}

	/**
	 * @param mixed $value
	 * @return array<int, array<string, mixed>>
	 */
	private static function sanitize_anchors( $value ): array {
		$out = array();
		foreach ( (array) $value as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$month = absint( $row['month'] ?? 0 );
			if ( $month < 1 || $month > 12 ) {
				continue;
			}

			$day_mode = sanitize_key( (string) ( $row['day_mode'] ?? '' ) );
			$day      = absint( $row['day'] ?? 0 );

			// Legacy anchors only stored month+day — treat as exact.
			if ( '' === $day_mode ) {
				$day_mode = $day >= 1 ? 'exact' : 'month';
			}
			if ( ! in_array( $day_mode, self::ANCHOR_DAY_MODES, true ) ) {
				$day_mode = 'exact';
			}

			if ( 'month' === $day_mode ) {
				$out[] = array(
					'month'    => $month,
					'day'      => 0,
					'day_mode' => 'month',
				);
				continue;
			}

			if ( 'nth_weekday' === $day_mode ) {
				$out[] = array(
					'month'       => $month,
					'day'         => 0,
					'day_mode'    => 'nth_weekday',
					'nth_weekday' => self::sanitize_nth_weekday_row( $row['nth_weekday'] ?? array() ),
				);
				continue;
			}

			if ( $day < 1 || $day > 31 ) {
				continue;
			}
			// Soft calendar check with leap-safe Feb 29.
			if ( ! checkdate( $month, $day, 2024 ) && ! ( 2 === $month && 29 === $day ) ) {
				continue;
			}
			$out[] = array(
				'month'    => $month,
				'day'      => $day,
				'day_mode' => 'exact',
			);
		}
		return array_values( $out );
	}

	/**
	 * @param mixed $value
	 * @return array{n: int, day: string}
	 */
	private static function sanitize_nth_weekday_row( $value ): array {
		$value = is_array( $value ) ? $value : array();
		$n     = max( 1, min( 5, absint( $value['n'] ?? 1 ) ) );
		$day   = strtoupper( sanitize_key( (string) ( $value['day'] ?? 'SA' ) ) );
		if ( ! in_array( $day, self::WEEKDAYS, true ) ) {
			$day = 'SA';
		}
		return array(
			'n'   => $n,
			'day' => $day,
		);
	}

	/**
	 * @param array<string, mixed> $anchor
	 */
	private static function format_anchor( array $anchor ): string {
		$month    = (int) ( $anchor['month'] ?? 0 );
		$day_mode = (string) ( $anchor['day_mode'] ?? 'exact' );
		$month_name = self::month_label( $month );
		if ( '' === $month_name ) {
			return '';
		}

		if ( 'month' === $day_mode ) {
			return $month_name;
		}

		if ( 'nth_weekday' === $day_mode ) {
			$nth = is_array( $anchor['nth_weekday'] ?? null ) ? $anchor['nth_weekday'] : array();
			$n   = (int) ( $nth['n'] ?? 0 );
			$day = (string) ( $nth['day'] ?? '' );
			if ( $n < 1 || $n > 5 || '' === $day ) {
				return $month_name;
			}
			return sprintf(
				/* translators: 1: ordinal week, 2: weekday, 3: month name */
				__( 'the %1$s %2$s of %3$s', 'kpf-core' ),
				self::ordinal_week_label( $n ),
				self::weekday_label( $day ),
				$month_name
			);
		}

		$day = (int) ( $anchor['day'] ?? 0 );
		if ( $day < 1 ) {
			return $month_name;
		}
		return self::format_month_day( $month, $day );
	}

	/**
	 * @param mixed $value
	 * @return array<int, int>
	 */
	private static function sanitize_id_list( $value ): array {
		$ids = array();
		foreach ( (array) $value as $id ) {
			$id = absint( $id );
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}
		return array_values( array_unique( $ids ) );
	}

	private static function sanitize_date( string $value ): string {
		$value = trim( $value );
		if ( '' === $value ) {
			return '';
		}
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return '';
		}
		$parts = array_map( 'intval', explode( '-', $value ) );
		if ( ! checkdate( $parts[1], $parts[2], $parts[0] ) ) {
			return '';
		}
		return sprintf( '%04d-%02d-%02d', $parts[0], $parts[1], $parts[2] );
	}

	private static function sanitize_website( string $url ): string {
		$url = trim( $url );
		if ( '' === $url ) {
			return '';
		}
		if ( ! preg_match( '#^https?://#i', $url ) ) {
			$url = 'https://' . $url;
		}
		$clean = esc_url_raw( $url );
		if ( is_string( $clean ) && '' !== $clean ) {
			return $clean;
		}
		// Keep incomplete-but-safe drafts through autosave (e.g. "https://ex") so
		// editors are not wiped mid-type. Final publish still prefers esc_url_raw.
		if ( preg_match( '#^https?://[a-zA-Z0-9._~:/\?#\[\]@!$&\'()*+,;=%-]*$#', $url ) ) {
			return $url;
		}
		return '';
	}

	private static function format_date_range( string $start_ymd, int $duration_days ): string {
		$ts = strtotime( $start_ymd . ' UTC' );
		if ( false === $ts ) {
			return $start_ymd;
		}
		$start_label = gmdate( 'F j, Y', $ts );
		if ( $duration_days <= 1 ) {
			return $start_label;
		}
		$end_ts = strtotime( '+' . ( $duration_days - 1 ) . ' days', $ts );
		if ( false === $end_ts ) {
			return $start_label;
		}
		if ( gmdate( 'Y-m', $ts ) === gmdate( 'Y-m', $end_ts ) ) {
			return gmdate( 'F j', $ts ) . '–' . gmdate( 'j, Y', $end_ts );
		}
		if ( gmdate( 'Y', $ts ) === gmdate( 'Y', $end_ts ) ) {
			return gmdate( 'F j', $ts ) . ' – ' . gmdate( 'F j, Y', $end_ts );
		}
		return $start_label . ' – ' . gmdate( 'F j, Y', $end_ts );
	}

	/**
	 * @param array<string, mixed> $schedule
	 */
	private static function format_day_rule_fragment( array $schedule ): string {
		$mode = (string) ( $schedule['monthly_mode'] ?? 'day_of_month' );
		if ( 'nth_weekday' === $mode ) {
			$nth = is_array( $schedule['nth_weekday'] ?? null ) ? $schedule['nth_weekday'] : array();
			$n   = (int) ( $nth['n'] ?? 0 );
			$day = (string) ( $nth['day'] ?? '' );
			if ( $n >= 1 && $n <= 5 && '' !== $day ) {
				return sprintf(
					/* translators: 1: ordinal week, 2: weekday */
					__( 'the %1$s %2$s', 'kpf-core' ),
					self::ordinal_week_label( $n ),
					self::weekday_label( $day )
				);
			}
			return '';
		}
		$monthday = (int) ( $schedule['by_monthday'] ?? 0 );
		if ( $monthday >= 1 && $monthday <= 31 ) {
			return sprintf(
				/* translators: %s: ordinal day */
				__( 'the %s', 'kpf-core' ),
				self::ordinal_day( $monthday )
			);
		}
		return '';
	}

	private static function append_duration_note( string $label, int $duration_days ): string {
		if ( $duration_days <= 1 || '' === $label ) {
			return $label;
		}
		return $label . ' · ' . sprintf(
			/* translators: %d: number of days */
			_n( '%d day', '%d days', $duration_days, 'kpf-core' ),
			$duration_days
		);
	}

	private static function weekday_label( string $code ): string {
		$map = array(
			'MO' => __( 'Monday', 'kpf-core' ),
			'TU' => __( 'Tuesday', 'kpf-core' ),
			'WE' => __( 'Wednesday', 'kpf-core' ),
			'TH' => __( 'Thursday', 'kpf-core' ),
			'FR' => __( 'Friday', 'kpf-core' ),
			'SA' => __( 'Saturday', 'kpf-core' ),
			'SU' => __( 'Sunday', 'kpf-core' ),
		);
		return $map[ $code ] ?? $code;
	}

	private static function month_label( int $month ): string {
		if ( $month < 1 || $month > 12 ) {
			return '';
		}
		return gmdate( 'F', mktime( 0, 0, 0, $month, 1, 2000 ) );
	}

	private static function format_month_day( int $month, int $day ): string {
		return sprintf( '%s %d', self::month_label( $month ), $day );
	}

	private static function ordinal_day( int $day ): string {
		$suffix = 'th';
		if ( ! in_array( $day % 100, array( 11, 12, 13 ), true ) ) {
			switch ( $day % 10 ) {
				case 1:
					$suffix = 'st';
					break;
				case 2:
					$suffix = 'nd';
					break;
				case 3:
					$suffix = 'rd';
					break;
			}
		}
		return $day . $suffix;
	}

	private static function ordinal_week_label( int $n ): string {
		$map = array(
			1 => __( 'first', 'kpf-core' ),
			2 => __( 'second', 'kpf-core' ),
			3 => __( 'third', 'kpf-core' ),
			4 => __( 'fourth', 'kpf-core' ),
			5 => __( 'last', 'kpf-core' ),
		);
		return $map[ $n ] ?? (string) $n;
	}

	/**
	 * @param array<int, string> $items
	 */
	private static function join_list( array $items ): string {
		$items = array_values( array_filter( array_map( 'strval', $items ) ) );
		$count = count( $items );
		if ( 0 === $count ) {
			return '';
		}
		if ( 1 === $count ) {
			return $items[0];
		}
		if ( 2 === $count ) {
			return $items[0] . ' & ' . $items[1];
		}
		$last = array_pop( $items );
		return implode( ', ', $items ) . ', & ' . $last;
	}
}

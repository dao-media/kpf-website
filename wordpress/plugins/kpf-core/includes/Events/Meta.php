<?php

declare(strict_types=1);

namespace KPF\Core\Events;

use KPF\Core\Seo\MetaRepository;

final class Meta {
	public const META_KEY           = '_kpf_event';
	public const START_DATE_META    = '_kpf_event_start_date';
	public const END_DATE_META      = '_kpf_event_end_date';
	public const IS_RECURRING_META  = '_kpf_event_is_recurring';
	public const VERSION            = 1;

	private const LOCATION_TYPES = array( 'indoor', 'outdoor', 'both', 'tbd' );
	private const FOOD_DRINKS    = array( 'both', 'food', 'drinks', 'none' );
	private const FREQUENCIES    = array( 'daily', 'weekly', 'monthly', 'yearly' );
	private const END_MODES      = array( 'never', 'until', 'count' );
	private const WEEKDAYS       = array( 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU' );
	private const MONTHLY_MODES  = array( 'day_of_month', 'nth_weekday' );

	public static function register(): void {
		add_action('init', array( self::class, 'register_meta' ), 10);
		add_action('added_post_meta', array( self::class, 'sync_on_meta_change' ), 10, 4);
		add_action('updated_post_meta', array( self::class, 'sync_on_meta_change' ), 10, 4);
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
				'auth_callback'     => static function (bool $allowed, string $meta_key, int $post_id): bool {
					unset($allowed, $meta_key);
					return current_user_can('edit_post', $post_id);
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
			'version'          => self::VERSION,
			'start_date'       => '',
			'end_date'         => '',
			'start_time'       => '',
			'end_time'         => '',
			'timezone'         => 'America/New_York',
			'location_type'    => 'tbd',
			'description'      => '',
			'details'          => '',
			'food_drinks'      => 'none',
			'is_recurring'     => false,
			'recurrence'       => self::default_recurrence(),
			'exceptions'       => array(),
			'reschedules'      => array(),
			'co_host_term_ids' => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_recurrence(): array {
		return array(
			'frequency'    => 'weekly',
			'interval'     => 1,
			'by_weekday'   => array(),
			'by_monthday'  => array(),
			'by_month'     => array(),
			'monthly_mode' => 'day_of_month',
			'nth_weekday'  => array(
				'n'   => 1,
				'day' => 'MO',
			),
			'end_mode'     => 'never',
			'until'        => '',
			'count'        => 0,
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
				'version'          => array(
					'type'    => 'integer',
					'default' => self::VERSION,
				),
				'start_date'       => array( 'type' => 'string', 'default' => '' ),
				'end_date'         => array( 'type' => 'string', 'default' => '' ),
				'start_time'       => array( 'type' => 'string', 'default' => '' ),
				'end_time'         => array( 'type' => 'string', 'default' => '' ),
				'timezone'         => array( 'type' => 'string', 'default' => 'America/New_York' ),
				'location_type'    => array(
					'type'    => 'string',
					'enum'    => self::LOCATION_TYPES,
					'default' => 'tbd',
				),
				'description'      => array( 'type' => 'string', 'default' => '' ),
				'details'          => array( 'type' => 'string', 'default' => '' ),
				'food_drinks'      => array(
					'type'    => 'string',
					'enum'    => self::FOOD_DRINKS,
					'default' => 'none',
				),
				'is_recurring'     => array( 'type' => 'boolean', 'default' => false ),
				'recurrence'       => array(
					'type'                 => 'object',
					'additionalProperties' => false,
					'default'              => self::default_recurrence(),
					'properties'           => array(
						'frequency'    => array(
							'type'    => 'string',
							'enum'    => self::FREQUENCIES,
							'default' => 'weekly',
						),
						'interval'     => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 99,
							'default' => 1,
						),
						'by_weekday'   => array(
							'type'    => 'array',
							'default' => array(),
							'items'   => array(
								'type' => 'string',
								'enum' => self::WEEKDAYS,
							),
						),
						'by_monthday'  => array(
							'type'    => 'array',
							'default' => array(),
							'items'   => array(
								'type'    => 'integer',
								'minimum' => 1,
								'maximum' => 31,
							),
						),
						'by_month'     => array(
							'type'    => 'array',
							'default' => array(),
							'items'   => array(
								'type'    => 'integer',
								'minimum' => 1,
								'maximum' => 12,
							),
						),
						'monthly_mode' => array(
							'type'    => 'string',
							'enum'    => self::MONTHLY_MODES,
							'default' => 'day_of_month',
						),
						'nth_weekday'  => array(
							'type'                 => 'object',
							'additionalProperties' => false,
							'properties'           => array(
								'n'   => array(
									'type'    => 'integer',
									'minimum' => 1,
									'maximum' => 5,
									'default' => 1,
								),
								'day' => array(
									'type'    => 'string',
									'enum'    => self::WEEKDAYS,
									'default' => 'MO',
								),
							),
						),
						'end_mode'     => array(
							'type'    => 'string',
							'enum'    => self::END_MODES,
							'default' => 'never',
						),
						'until'        => array( 'type' => 'string', 'default' => '' ),
						'count'        => array(
							'type'    => 'integer',
							'minimum' => 0,
							'maximum' => 999,
							'default' => 0,
						),
					),
				),
				'exceptions'       => array(
					'type'    => 'array',
					'default' => array(),
					'items'   => array(
						'type'                 => 'object',
						'additionalProperties' => false,
						'properties'           => array(
							'date'   => array( 'type' => 'string', 'default' => '' ),
							'reason' => array( 'type' => 'string', 'default' => '' ),
						),
					),
				),
				'reschedules'      => array(
					'type'    => 'array',
					'default' => array(),
					'items'   => array(
						'type'                 => 'object',
						'additionalProperties' => false,
						'properties'           => array(
							'original_date' => array( 'type' => 'string', 'default' => '' ),
							'new_date'      => array( 'type' => 'string', 'default' => '' ),
							'start_time'    => array( 'type' => 'string', 'default' => '' ),
							'end_time'      => array( 'type' => 'string', 'default' => '' ),
							'note'          => array( 'type' => 'string', 'default' => '' ),
						),
					),
				),
				'co_host_term_ids' => array(
					'type'    => 'array',
					'default' => array(),
					'items'   => array(
						'type'    => 'integer',
						'minimum' => 1,
					),
				),
			),
		);
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize($value): array {
		$value = is_array($value) ? $value : array();

		$location = sanitize_key((string) ($value['location_type'] ?? 'tbd'));
		if (! in_array($location, self::LOCATION_TYPES, true)) {
			$location = 'tbd';
		}

		$food = sanitize_key((string) ($value['food_drinks'] ?? 'none'));
		if (! in_array($food, self::FOOD_DRINKS, true)) {
			$food = 'none';
		}

		$timezone = sanitize_text_field((string) ($value['timezone'] ?? 'America/New_York'));
		if (! in_array($timezone, timezone_identifiers_list(), true)) {
			$timezone = 'America/New_York';
		}

		$start_date = self::sanitize_date((string) ($value['start_date'] ?? ''));
		$end_date   = self::sanitize_date((string) ($value['end_date'] ?? ''));
		if ('' !== $end_date && '' !== $start_date && $end_date < $start_date) {
			$end_date = $start_date;
		}

		return array(
			'version'          => self::VERSION,
			'start_date'       => $start_date,
			'end_date'         => $end_date,
			'start_time'       => self::sanitize_time((string) ($value['start_time'] ?? '')),
			'end_time'         => self::sanitize_time((string) ($value['end_time'] ?? '')),
			'timezone'         => $timezone,
			'location_type'    => $location,
			'description'      => sanitize_textarea_field((string) ($value['description'] ?? '')),
			'details'          => wp_kses_post((string) ($value['details'] ?? '')),
			'food_drinks'      => $food,
			'is_recurring'     => (bool) ($value['is_recurring'] ?? false),
			'recurrence'       => self::sanitize_recurrence($value['recurrence'] ?? array()),
			'exceptions'       => self::sanitize_exceptions($value['exceptions'] ?? array()),
			'reschedules'      => self::sanitize_reschedules($value['reschedules'] ?? array()),
			'co_host_term_ids' => self::sanitize_id_list($value['co_host_term_ids'] ?? array()),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get(int $post_id): array {
		$value = get_post_meta($post_id, self::META_KEY, true);
		return array_merge(self::defaults(), self::sanitize(is_array($value) ? $value : array()));
	}

	/**
	 * @param mixed $meta_value
	 */
	public static function sync_on_meta_change(int $meta_id, int $post_id, string $meta_key, $meta_value): void {
		unset($meta_id);
		if (self::META_KEY !== $meta_key || ContentType::POST_TYPE !== get_post_type($post_id)) {
			return;
		}

		$clean = self::sanitize(is_array($meta_value) ? $meta_value : array());
		update_post_meta($post_id, self::START_DATE_META, $clean['start_date']);
		update_post_meta($post_id, self::END_DATE_META, $clean['end_date'] ?: $clean['start_date']);
		update_post_meta($post_id, self::IS_RECURRING_META, $clean['is_recurring'] ? '1' : '0');

		if ('' !== $clean['description'] && class_exists(MetaRepository::class)) {
			$seo = MetaRepository::get($post_id);
			$seo['description_template'] = $clean['description'];
			MetaRepository::update($post_id, $seo);
		}
	}

	/**
	 * Keep partner taxonomy terms in sync with selected co-host IDs.
	 */
	public static function sync_taxonomies_from_meta(int $post_id, \WP_Post $post): void {
		unset($post);
		if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
			return;
		}

		$meta = self::get($post_id);
		$ids  = array_map('intval', $meta['co_host_term_ids']);
		wp_set_object_terms($post_id, $ids, ContentType::PARTNER_TAXONOMY, false);
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	private static function sanitize_recurrence($value): array {
		$value = is_array($value) ? $value : array();
		$defaults = self::default_recurrence();

		$frequency = sanitize_key((string) ($value['frequency'] ?? $defaults['frequency']));
		if (! in_array($frequency, self::FREQUENCIES, true)) {
			$frequency = 'weekly';
		}

		$end_mode = sanitize_key((string) ($value['end_mode'] ?? 'never'));
		if (! in_array($end_mode, self::END_MODES, true)) {
			$end_mode = 'never';
		}

		$monthly_mode = sanitize_key((string) ($value['monthly_mode'] ?? 'day_of_month'));
		if (! in_array($monthly_mode, self::MONTHLY_MODES, true)) {
			$monthly_mode = 'day_of_month';
		}

		$by_weekday = array();
		foreach ((array) ($value['by_weekday'] ?? array()) as $day) {
			$day = strtoupper(sanitize_key((string) $day));
			if (in_array($day, self::WEEKDAYS, true)) {
				$by_weekday[] = $day;
			}
		}
		$by_weekday = array_values(array_unique($by_weekday));

		$by_monthday = array();
		foreach ((array) ($value['by_monthday'] ?? array()) as $day) {
			$day = absint($day);
			if ($day >= 1 && $day <= 31) {
				$by_monthday[] = $day;
			}
		}
		$by_monthday = array_values(array_unique($by_monthday));
		sort($by_monthday);

		$by_month = array();
		foreach ((array) ($value['by_month'] ?? array()) as $month) {
			$month = absint($month);
			if ($month >= 1 && $month <= 12) {
				$by_month[] = $month;
			}
		}
		$by_month = array_values(array_unique($by_month));
		sort($by_month);

		$nth = is_array($value['nth_weekday'] ?? null) ? $value['nth_weekday'] : array();
		$n   = max(1, min(5, absint($nth['n'] ?? 1)));
		$day = strtoupper(sanitize_key((string) ($nth['day'] ?? 'MO')));
		if (! in_array($day, self::WEEKDAYS, true)) {
			$day = 'MO';
		}

		return array(
			'frequency'    => $frequency,
			'interval'     => max(1, min(99, absint($value['interval'] ?? 1))),
			'by_weekday'   => $by_weekday,
			'by_monthday'  => $by_monthday,
			'by_month'     => $by_month,
			'monthly_mode' => $monthly_mode,
			'nth_weekday'  => array(
				'n'   => $n,
				'day' => $day,
			),
			'end_mode'     => $end_mode,
			'until'        => self::sanitize_date((string) ($value['until'] ?? '')),
			'count'        => max(0, min(999, absint($value['count'] ?? 0))),
		);
	}

	/**
	 * @param mixed $value
	 * @return array<int, array{date: string, reason: string}>
	 */
	private static function sanitize_exceptions($value): array {
		$out = array();
		foreach ((array) $value as $row) {
			if (! is_array($row)) {
				continue;
			}
			$date = self::sanitize_date((string) ($row['date'] ?? ''));
			if ('' === $date) {
				continue;
			}
			$out[] = array(
				'date'   => $date,
				'reason' => sanitize_text_field((string) ($row['reason'] ?? '')),
			);
		}
		return array_values($out);
	}

	/**
	 * @param mixed $value
	 * @return array<int, array<string, string>>
	 */
	private static function sanitize_reschedules($value): array {
		$out = array();
		foreach ((array) $value as $row) {
			if (! is_array($row)) {
				continue;
			}
			$original = self::sanitize_date((string) ($row['original_date'] ?? ''));
			$new      = self::sanitize_date((string) ($row['new_date'] ?? ''));
			if ('' === $original || '' === $new) {
				continue;
			}
			$out[] = array(
				'original_date' => $original,
				'new_date'      => $new,
				'start_time'    => self::sanitize_time((string) ($row['start_time'] ?? '')),
				'end_time'      => self::sanitize_time((string) ($row['end_time'] ?? '')),
				'note'          => sanitize_text_field((string) ($row['note'] ?? '')),
			);
		}
		return array_values($out);
	}

	/**
	 * @param mixed $value
	 * @return array<int, int>
	 */
	private static function sanitize_id_list($value): array {
		$ids = array();
		foreach ((array) $value as $id) {
			$id = absint($id);
			if ($id > 0) {
				$ids[] = $id;
			}
		}
		return array_values(array_unique($ids));
	}

	private static function sanitize_date(string $value): string {
		$value = trim($value);
		if ('' === $value) {
			return '';
		}
		if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
			return '';
		}
		$parts = array_map('intval', explode('-', $value));
		if (! checkdate($parts[1], $parts[2], $parts[0])) {
			return '';
		}
		return sprintf('%04d-%02d-%02d', $parts[0], $parts[1], $parts[2]);
	}

	private static function sanitize_time(string $value): string {
		$value = trim($value);
		if ('' === $value) {
			return '';
		}
		if (! preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $value, $m)) {
			return '';
		}
		return $m[1] . ':' . $m[2];
	}
}

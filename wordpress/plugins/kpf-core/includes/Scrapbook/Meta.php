<?php

declare(strict_types=1);

namespace KPF\Core\Scrapbook;

use WP_Error;
use WP_Post;
use WP_REST_Request;

final class Meta {
	public const META_KEY          = '_kpf_scrapbook';
	public const ENTRY_TYPE_META   = '_kpf_scrapbook_entry_type';
	public const FEATURED_META     = '_kpf_scrapbook_featured';
	public const DISPLAY_ORDER_META = '_kpf_scrapbook_display_order';
	public const VERSION           = 1;

	private const ENTRY_TYPES     = array( 'photo', 'story' );
	private const DATE_PRECISIONS = array( 'exact', 'month', 'year', 'decade', 'unknown' );
	private const MAX_IMAGES      = 100;

	public static function register(): void {
		add_action('init', array( self::class, 'register_meta' ), 10);
		add_filter(
			'rest_pre_insert_' . ContentType::POST_TYPE,
			array( self::class, 'validate_rest_request' ),
			10,
			2
		);
		add_action(
			'rest_after_insert_' . ContentType::POST_TYPE,
			array( self::class, 'after_rest_insert' ),
			10,
			3
		);
		add_action('added_post_meta', array( self::class, 'sync_on_meta_change' ), 10, 4);
		add_action('updated_post_meta', array( self::class, 'sync_on_meta_change' ), 10, 4);
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
			'entry_type'       => 'photo',
			'event_date'       => '',
			'date_precision'   => 'unknown',
			'location'         => '',
			'photographer'     => '',
			'source'           => '',
			'historical_notes' => '',
			'featured'         => false,
			'display_order'    => 0,
			'images'           => array(),
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
				'entry_type'       => array(
					'type'    => 'string',
					'enum'    => self::ENTRY_TYPES,
					'default' => 'photo',
				),
				'event_date'       => array(
					'type'    => 'string',
					'default' => '',
				),
				'date_precision'   => array(
					'type'    => 'string',
					'enum'    => self::DATE_PRECISIONS,
					'default' => 'unknown',
				),
				'location'         => array(
					'type'    => 'string',
					'default' => '',
				),
				'photographer'     => array(
					'type'    => 'string',
					'default' => '',
				),
				'source'           => array(
					'type'    => 'string',
					'default' => '',
				),
				'historical_notes' => array(
					'type'    => 'string',
					'default' => '',
				),
				'featured'         => array(
					'type'    => 'boolean',
					'default' => false,
				),
				'display_order'    => array(
					'type'    => 'integer',
					'minimum' => 0,
					'default' => 0,
				),
				'images'           => array(
					'type'     => 'array',
					'maxItems' => self::MAX_IMAGES,
					'default'  => array(),
					'items'    => array(
						'type'                 => 'object',
						'additionalProperties' => false,
						'required'             => array( 'attachment_id' ),
						'properties'           => array(
							'attachment_id' => array(
								'type'    => 'integer',
								'minimum' => 1,
							),
							'alt_text'     => array(
								'type'    => 'string',
								'default' => '',
							),
							'caption'      => array(
								'type'    => 'string',
								'default' => '',
							),
						),
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

		$entry_type = sanitize_key((string) ($value['entry_type'] ?? 'photo'));
		if (! in_array($entry_type, self::ENTRY_TYPES, true)) {
			$entry_type = 'photo';
		}

		$date_precision = sanitize_key((string) ($value['date_precision'] ?? 'unknown'));
		if (! in_array($date_precision, self::DATE_PRECISIONS, true)) {
			$date_precision = 'unknown';
		}

		$images = self::sanitize_images($value['images'] ?? array());
		if ('photo' === $entry_type && count($images) > 1) {
			$images = array_slice($images, 0, 1);
		}

		return array(
			'version'          => self::VERSION,
			'entry_type'       => $entry_type,
			'event_date'       => self::sanitize_date((string) ($value['event_date'] ?? ''), $date_precision),
			'date_precision'   => $date_precision,
			'location'         => sanitize_text_field((string) ($value['location'] ?? '')),
			'photographer'     => sanitize_text_field((string) ($value['photographer'] ?? '')),
			'source'           => sanitize_text_field((string) ($value['source'] ?? '')),
			'historical_notes' => sanitize_textarea_field((string) ($value['historical_notes'] ?? '')),
			'featured'         => (bool) ($value['featured'] ?? false),
			'display_order'    => max(0, absint($value['display_order'] ?? 0)),
			'images'           => $images,
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
	 * Validate collection rules before WordPress saves the post.
	 *
	 * @param mixed $prepared_post
	 * @return mixed
	 */
	public static function validate_rest_request($prepared_post, WP_REST_Request $request) {
		$meta         = $request->get_param('meta');
		$has_incoming = is_array($meta) && array_key_exists(self::META_KEY, $meta);
		$post_id      = isset($prepared_post->ID) ? (int) $prepared_post->ID : 0;
		$value        = $has_incoming && is_array($meta[ self::META_KEY ])
			? $meta[ self::META_KEY ]
			: ($post_id > 0 ? self::get($post_id) : self::defaults());
		$clean        = self::sanitize($value);
		$images       = is_array($value['images'] ?? null) ? $value['images'] : array();

		if ($has_incoming) {
			foreach ($images as $image) {
				$attachment_id = absint(is_array($image) ? ($image['attachment_id'] ?? 0) : 0);
				if ($attachment_id < 1 || ! wp_attachment_is_image($attachment_id)) {
					return new WP_Error(
						'kpf_scrapbook_invalid_image',
						__('One of the selected files is not a valid image. Remove it and choose an image from the Media Library.', 'kpf-core'),
						array( 'status' => 400 )
					);
				}
				if (! current_user_can('read_post', $attachment_id)) {
					return new WP_Error(
						'kpf_scrapbook_image_forbidden',
						__('You do not have permission to use one of the selected images.', 'kpf-core'),
						array( 'status' => 403 )
					);
				}
			}

			if ('photo' === $clean['entry_type'] && count($images) > 1) {
				return new WP_Error(
					'kpf_scrapbook_too_many_images',
					__('A single-photo item can contain only one image. Choose Photo story if these images belong together.', 'kpf-core'),
					array( 'status' => 400 )
				);
			}

			$raw_date = trim((string) ($value['event_date'] ?? ''));
			if (
				'' !== $raw_date &&
				'unknown' !== $clean['date_precision'] &&
				'' === $clean['event_date']
			) {
				return new WP_Error(
					'kpf_scrapbook_invalid_date',
					__(
						'Choose every part of the date that matches “How exact is the date?” Incomplete dates cannot be saved.',
						'kpf-core'
					),
					array( 'status' => 400 )
				);
			}
		}

		if ('publish' === ($request->get_param('status') ?? '') && count($clean['images']) < 1) {
			return new WP_Error(
				'kpf_scrapbook_image_required',
				__('Add at least one image before publishing this scrapbook item.', 'kpf-core'),
				array( 'status' => 400 )
			);
		}

		return $prepared_post;
	}

	public static function after_rest_insert(
		WP_Post $post,
		WP_REST_Request $request,
		bool $creating
	): void {
		unset($creating);
		$value = self::get((int) $post->ID);
		self::sync_shadow_meta((int) $post->ID, $value);
		self::sync_decade((int) $post->ID, $value);

		if (! has_post_thumbnail($post) && ! empty($value['images'][0]['attachment_id'])) {
			set_post_thumbnail($post, (int) $value['images'][0]['attachment_id']);
		}
	}

	/**
	 * @param mixed $meta_value
	 */
	public static function sync_on_meta_change(
		int $meta_id,
		int $post_id,
		string $meta_key,
		$meta_value
	): void {
		unset($meta_id);
		if (self::META_KEY !== $meta_key || ContentType::POST_TYPE !== get_post_type($post_id)) {
			return;
		}

		$value = self::sanitize(is_array($meta_value) ? $meta_value : array());
		self::sync_shadow_meta($post_id, $value);
	}

	/**
	 * @param mixed $images
	 * @return array<int, array<string, mixed>>
	 */
	private static function sanitize_images($images): array {
		if (! is_array($images)) {
			return array();
		}

		$clean = array();
		$seen  = array();
		foreach (array_slice($images, 0, self::MAX_IMAGES) as $image) {
			if (! is_array($image)) {
				continue;
			}

			$attachment_id = absint($image['attachment_id'] ?? 0);
			if ($attachment_id < 1 || isset($seen[ $attachment_id ])) {
				continue;
			}

			$seen[ $attachment_id ] = true;
			$clean[] = array(
				'attachment_id' => $attachment_id,
				'alt_text'      => sanitize_text_field((string) ($image['alt_text'] ?? '')),
				'caption'       => sanitize_textarea_field((string) ($image['caption'] ?? '')),
			);
		}

		return $clean;
	}

	private static function sanitize_date(string $date, string $precision): string {
		$date = trim($date);
		if ('unknown' === $precision || '' === $date) {
			return '';
		}

		$patterns = array(
			'exact'   => '/^\d{4}-\d{2}-\d{2}$/',
			'month'   => '/^\d{4}-\d{2}$/',
			'year'    => '/^\d{4}$/',
			'decade'  => '/^\d{4}$/',
		);

		if (! isset($patterns[ $precision ]) || ! preg_match($patterns[ $precision ], $date)) {
			return '';
		}

		if ('exact' === $precision) {
			$parts = array_map('intval', explode('-', $date));
			if (count($parts) !== 3 || ! checkdate($parts[1], $parts[2], $parts[0])) {
				return '';
			}
		}

		if ('month' === $precision) {
			$parts = array_map('intval', explode('-', $date));
			if (count($parts) !== 2 || $parts[1] < 1 || $parts[1] > 12) {
				return '';
			}
		}

		return $date;
	}

	/**
	 * @param array<string, mixed> $value
	 */
	private static function sync_shadow_meta(int $post_id, array $value): void {
		update_post_meta($post_id, self::ENTRY_TYPE_META, (string) $value['entry_type']);
		update_post_meta($post_id, self::FEATURED_META, $value['featured'] ? '1' : '0');
		update_post_meta($post_id, self::DISPLAY_ORDER_META, (int) $value['display_order']);
	}

	/**
	 * @param array<string, mixed> $value
	 */
	private static function sync_decade(int $post_id, array $value): void {
		$date      = (string) ($value['event_date'] ?? '');
		$precision = (string) ($value['date_precision'] ?? 'unknown');
		if ('' === $date || 'unknown' === $precision) {
			wp_set_object_terms($post_id, array(), ContentType::TAXONOMY, false);
			return;
		}

		$year = (int) substr($date, 0, 4);
		if ($year < 1000 || $year > 2999) {
			wp_set_object_terms($post_id, array(), ContentType::TAXONOMY, false);
			return;
		}

		$decade = (int) floor($year / 10) * 10;
		$name   = sprintf('%ds', $decade);
		$term   = term_exists($name, ContentType::TAXONOMY);
		if (! $term) {
			$term = wp_insert_term($name, ContentType::TAXONOMY, array( 'slug' => (string) $decade ));
		} else {
			$term_id       = is_array($term) ? (int) $term['term_id'] : (int) $term;
			$existing_term = get_term($term_id, ContentType::TAXONOMY);
			if (! is_wp_error($existing_term) && (string) $existing_term->slug !== (string) $decade) {
				$term = wp_update_term(
					$term_id,
					ContentType::TAXONOMY,
					array( 'slug' => (string) $decade )
				);
			}
		}
		if (! is_wp_error($term)) {
			wp_set_object_terms($post_id, array( $name ), ContentType::TAXONOMY, false);
		}
	}
}

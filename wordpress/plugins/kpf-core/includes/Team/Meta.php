<?php

declare(strict_types=1);

namespace KPF\Core\Team;

final class Meta {
	public const META_KEY = '_kpf_team';
	public const VERSION  = 1;

	public const SOCIAL_TYPES = array(
		'facebook',
		'instagram',
		'twitter',
		'linkedin',
		'youtube',
		'tiktok',
		'threads',
		'website',
		'other',
	);

	public static function register(): void {
		add_action('init', array( self::class, 'register_meta' ), 10);
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
			'version'        => self::VERSION,
			'job_title'      => '',
			'short_summary'  => '',
			'email'          => '',
			'phone'          => '',
			'social_links'   => array(),
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
				'job_title'     => array( 'type' => 'string', 'default' => '' ),
				'short_summary' => array( 'type' => 'string', 'default' => '' ),
				'email'         => array( 'type' => 'string', 'default' => '' ),
				'phone'         => array( 'type' => 'string', 'default' => '' ),
				'social_links'  => array(
					'type'    => 'array',
					'default' => array(),
					'items'   => array(
						'type'                 => 'object',
						'additionalProperties' => false,
						'properties'           => array(
							'type'  => array(
								'type'    => 'string',
								'enum'    => self::SOCIAL_TYPES,
								'default' => 'website',
							),
							'url'   => array( 'type' => 'string', 'default' => '' ),
							'label' => array( 'type' => 'string', 'default' => '' ),
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

		$email = sanitize_email((string) ($value['email'] ?? ''));
		$links = array();
		foreach ((array) ($value['social_links'] ?? array()) as $row) {
			if (! is_array($row)) {
				continue;
			}
			$type = sanitize_key((string) ($row['type'] ?? 'website'));
			if (! in_array($type, self::SOCIAL_TYPES, true)) {
				$type = 'other';
			}
			$url = esc_url_raw((string) ($row['url'] ?? ''));
			if ('' === $url) {
				continue;
			}
			$links[] = array(
				'type'  => $type,
				'url'   => $url,
				'label' => sanitize_text_field((string) ($row['label'] ?? '')),
			);
		}

		return array(
			'version'       => self::VERSION,
			'job_title'     => sanitize_text_field((string) ($value['job_title'] ?? '')),
			'short_summary' => sanitize_textarea_field((string) ($value['short_summary'] ?? '')),
			'email'         => $email,
			'phone'         => sanitize_text_field((string) ($value['phone'] ?? '')),
			'social_links'  => $links,
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
	 * @param array<string, mixed> $value
	 * @return array<string, mixed>
	 */
	public static function update(int $post_id, array $value): array {
		$clean = self::sanitize($value);
		update_post_meta($post_id, self::META_KEY, $clean);
		return $clean;
	}
}

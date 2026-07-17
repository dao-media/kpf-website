<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class MetaRepository {
	public const META_KEY = '_kpf_seo';

	public static function register(): void {
		add_action(
			'init',
			static function (): void {
				foreach (get_post_types(array( 'public' => true ), 'names') as $post_type) {
					add_post_type_support($post_type, 'custom-fields');
					register_post_meta(
						$post_type,
						self::META_KEY,
						array(
							'type'              => 'object',
							'single'            => true,
							'show_in_rest'      => array(
								'schema' => array(
									'type'                 => 'object',
									'additionalProperties' => true,
								),
							),
							'auth_callback'     => static function (): bool {
								return current_user_can('edit_posts');
							},
							'sanitize_callback' => array( Sanitizer::class, 'sanitize_entity_meta' ),
						)
					);
				}
			}
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get(int $post_id): array {
		$value = get_post_meta($post_id, self::META_KEY, true);
		if (! is_array($value)) {
			return Sanitizer::sanitize_entity_meta(array());
		}
		return Sanitizer::sanitize_entity_meta($value);
	}

	/**
	 * @param array<string, mixed> $meta
	 * @return array<string, mixed>
	 */
	public static function update(int $post_id, array $meta): array {
		$clean = Sanitizer::sanitize_entity_meta($meta);
		update_post_meta($post_id, self::META_KEY, $clean);
		return $clean;
	}
}

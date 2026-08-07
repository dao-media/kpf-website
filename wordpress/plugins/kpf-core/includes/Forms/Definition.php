<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

final class Definition {
	public static function find_by_slug( string $slug ): int {
		$slug = sanitize_title( $slug );
		if ( '' === $slug ) {
			return 0;
		}

		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'name'           => $slug,
				'post_status'    => array( 'publish' ),
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);

		return ! empty( $posts[0] ) ? (int) $posts[0] : 0;
	}

	/**
	 * Full form payload for trusted server-side use (admin REST, submit handling).
	 *
	 * @return array<string, mixed>|null
	 */
	public static function internal_payload( int $post_id ): ?array {
		$post = get_post( $post_id );
		if ( ! $post || ContentType::POST_TYPE !== $post->post_type || 'publish' !== $post->post_status ) {
			return null;
		}

		$definition = Meta::get( $post_id );
		if ( 'active' !== ( $definition['status'] ?? 'active' ) ) {
			return null;
		}

		$mode = (string) ( $definition['settings']['captchaMode'] ?? 'honeypot' );
		$definition['settings']['captchaMode'] = Settings::coerce_captcha_mode( $mode );
		$definition['settings']['captcha']     = Settings::public_for_mode(
			$definition['settings']['captchaMode']
		);

		return array(
			'databaseId' => $post_id,
			'title'      => get_the_title( $post ),
			'slug'       => $post->post_name,
			'definition' => $definition,
		);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function public_payload( int $post_id ): ?array {
		$payload = self::internal_payload( $post_id );
		if ( ! $payload ) {
			return null;
		}

		$settings = is_array( $payload['definition']['settings'] ?? null )
			? $payload['definition']['settings']
			: array();

		// Keep private delivery settings off the public frontend payload.
		$payload['definition']['settings'] = array(
			'submitLabel'    => (string) ( $settings['submitLabel'] ?? '' ),
			'successMessage' => (string) ( $settings['successMessage'] ?? '' ),
			'successDisplay' => (string) ( $settings['successDisplay'] ?? 'inline' ),
			'redirectUrl'    => (string) ( $settings['redirectUrl'] ?? '' ),
			'inboxFormName' => (string) ( $settings['inboxFormName'] ?? '' ),
			'captchaMode'    => (string) ( $settings['captchaMode'] ?? 'honeypot' ),
			'captcha'        => $settings['captcha'] ?? null,
			'analytics'      => is_array( $settings['analytics'] ?? null )
				? $settings['analytics']
				: array(),
		);

		return $payload;
	}

	/**
	 * @param list<string> $slugs
	 * @return array<int, array<string, mixed>>
	 */
	public static function public_payloads_for_slugs( array $slugs ): array {
		$out = array();
		foreach ( array_unique( array_filter( array_map( 'sanitize_title', $slugs ) ) ) as $slug ) {
			$id = self::find_by_slug( $slug );
			if ( ! $id ) {
				continue;
			}
			$payload = self::public_payload( $id );
			if ( $payload ) {
				$out[] = $payload;
			}
		}
		return $out;
	}

	/**
	 * @return list<string>
	 */
	public static function slugs_in_html( string $html ): array {
		preg_match_all( '/\{\{\s*form:([a-z0-9_-]+)\s*\}\}/i', $html, $matches );
		return array_values( array_unique( array_map( 'sanitize_title', $matches[1] ?? array() ) ) );
	}
}

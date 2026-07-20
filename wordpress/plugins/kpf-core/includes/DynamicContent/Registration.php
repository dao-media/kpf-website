<?php

declare(strict_types=1);

namespace KPF\Core\DynamicContent;

/**
 * Registers custom site tags into SEO %% resolution and design placeholder catalogs.
 */
final class Registration {
	public static function register(): void {
		add_action( 'kpf_seo_register_tags', array( self::class, 'register_seo_tags' ) );
		add_filter( 'kpf_design_placeholders', array( self::class, 'append_design_placeholders' ) );
	}

	/**
	 * @param callable $register function(string $token, array $definition): void
	 */
	public static function register_seo_tags( callable $register ): void {
		foreach ( Settings::get_tags() as $tag ) {
			if ( empty( $tag['enabled'] ) || empty( $tag['expose_seo'] ) ) {
				continue;
			}
			$key = (string) ( $tag['key'] ?? '' );
			if ( $key === '' ) {
				continue;
			}

			$token = 'site_' . $key;

			$register(
				$token,
				array(
					'label'       => (string) ( $tag['label'] ?? $key ),
					'description' => (string) ( $tag['description'] ?? __( 'Site-wide custom tag.', 'kpf-core' ) ),
					'group'       => 'Site custom',
					'example'     => '%%' . $token . '%%',
					'callback'    => static function () use ( $key ): string {
						foreach ( Settings::get_tags() as $row ) {
							if ( (string) ( $row['key'] ?? '' ) === $key && ! empty( $row['enabled'] ) && ! empty( $row['expose_seo'] ) ) {
								return (string) ( $row['value'] ?? '' );
							}
						}
						return '';
					},
				)
			);
		}
	}

	/**
	 * @param array<int, array{token: string, label: string, description: string, group: string}> $items
	 * @return array<int, array{token: string, label: string, description: string, group: string}>
	 */
	public static function append_design_placeholders( array $items ): array {
		foreach ( Settings::get_tags() as $tag ) {
			if ( empty( $tag['enabled'] ) || empty( $tag['expose_design'] ) ) {
				continue;
			}
			$key = (string) ( $tag['key'] ?? '' );
			if ( $key === '' ) {
				continue;
			}
			$items[] = array(
				'token'       => '{{site.' . $key . '}}',
				'label'       => (string) ( $tag['label'] ?? $key ),
				'description' => (string) ( $tag['description'] ?? __( 'Site-wide custom tag.', 'kpf-core' ) ),
				'group'       => 'site',
			);
		}
		return $items;
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\DynamicContent;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfSiteTag',
			array(
				'description' => 'A site-wide dynamic content tag value.',
				'fields'      => array(
					'key'   => array( 'type' => 'String' ),
					'value' => array( 'type' => 'String' ),
					'label' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfSiteTags',
			array(
				'type'        => array( 'list_of' => 'KpfSiteTag' ),
				'description' => 'Site-wide custom tags for design templates ({{site.key}}).',
				'resolve'     => static function (): array {
					$out = array();
					foreach ( Settings::get_tags() as $tag ) {
						if ( empty( $tag['enabled'] ) || empty( $tag['expose_design'] ) ) {
							continue;
						}
						$key = (string) ( $tag['key'] ?? '' );
						if ( $key === '' ) {
							continue;
						}
						$out[] = array(
							'key'   => $key,
							'value' => (string) ( $tag['value'] ?? '' ),
							'label' => (string) ( $tag['label'] ?? $key ),
						);
					}
					return $out;
				},
			)
		);
	}
}

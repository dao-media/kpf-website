<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_field(
			'RootQuery',
			'kpfFrontPage',
			array(
				'type'        => 'Page',
				'description' => 'The WordPress page assigned as the site front page.',
				'resolve'     => static function ( $source, array $args, $context ) {
					unset( $source, $args );
					$page_id = (int) get_option( 'page_on_front' );
					if ( $page_id < 1 || ! class_exists( '\WPGraphQL\Data\DataSource' ) ) {
						return null;
					}

					return \WPGraphQL\Data\DataSource::resolve_post_object( $page_id, $context );
				},
			)
		);

		register_graphql_object_type(
			'KpfSiteChromeBehavior',
			array(
				'description' => 'Role-specific layout and scroll behavior for a global site component.',
				'fields'      => array(
					'version'           => array( 'type' => 'Int' ),
					'mode'              => array( 'type' => 'String' ),
					'retractDelayMs'    => array( 'type' => 'Int' ),
					'scrollThresholdPx' => array( 'type' => 'Int' ),
					'transitionMs'      => array( 'type' => 'Int' ),
					'revealAtTop'       => array( 'type' => 'Boolean' ),
					'overlayHero'       => array( 'type' => 'Boolean' ),
					'transparentAtTop'  => array( 'type' => 'Boolean' ),
					'zIndex'            => array( 'type' => 'Int' ),
					'fullWidth'         => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfSiteChromeComponent',
			array(
				'description' => 'A published reusable component assigned as global header or footer.',
				'fields'      => array(
					'databaseId' => array( 'type' => 'Int' ),
					'title'      => array( 'type' => 'String' ),
					'role'       => array( 'type' => 'String' ),
					'html'       => array( 'type' => 'String' ),
					'behavior'   => array( 'type' => 'KpfSiteChromeBehavior' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfSiteChrome',
			array(
				'description' => 'Published global header and footer components for the headless site shell.',
				'fields'      => array(
					'header' => array( 'type' => 'KpfSiteChromeComponent' ),
					'footer' => array( 'type' => 'KpfSiteChromeComponent' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfSiteChrome',
			array(
				'type'        => 'KpfSiteChrome',
				'description' => 'Global header and footer components rendered from published wp_block assignments.',
				'resolve'     => static function (): array {
					$chrome = Globals::site_chrome();

					return array(
						'header' => self::shape_component( $chrome['header'] ?? null ),
						'footer' => self::shape_component( $chrome['footer'] ?? null ),
					);
				},
			)
		);
	}

	/**
	 * @param array<string, mixed>|null $component
	 * @return array<string, mixed>|null
	 */
	private static function shape_component( ?array $component ): ?array {
		if ( ! is_array( $component ) ) {
			return null;
		}

		$behavior = is_array( $component['behavior'] ?? null ) ? $component['behavior'] : array();

		return array(
			'databaseId' => absint( $component['databaseId'] ?? 0 ),
			'title'      => (string) ( $component['title'] ?? '' ),
			'role'       => (string) ( $component['role'] ?? '' ),
			'html'       => (string) ( $component['html'] ?? '' ),
			'behavior'   => array(
				'version'           => isset( $behavior['version'] ) ? (int) $behavior['version'] : null,
				'mode'              => isset( $behavior['mode'] ) ? (string) $behavior['mode'] : null,
				'retractDelayMs'    => isset( $behavior['retractDelayMs'] ) ? (int) $behavior['retractDelayMs'] : null,
				'scrollThresholdPx' => isset( $behavior['scrollThresholdPx'] ) ? (int) $behavior['scrollThresholdPx'] : null,
				'transitionMs'      => isset( $behavior['transitionMs'] ) ? (int) $behavior['transitionMs'] : null,
				'revealAtTop'       => array_key_exists( 'revealAtTop', $behavior ) ? (bool) $behavior['revealAtTop'] : null,
				'overlayHero'       => array_key_exists( 'overlayHero', $behavior ) ? (bool) $behavior['overlayHero'] : null,
				'transparentAtTop'  => array_key_exists( 'transparentAtTop', $behavior ) ? (bool) $behavior['transparentAtTop'] : null,
				'zIndex'            => isset( $behavior['zIndex'] ) ? (int) $behavior['zIndex'] : null,
				'fullWidth'         => array_key_exists( 'fullWidth', $behavior ) ? (bool) $behavior['fullWidth'] : null,
			),
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Accessibility;

final class GraphQL {
	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_field' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfAccessibilityNavigation',
			array(
				'description' => 'Navigation accessibility utilities.',
				'fields'      => array(
					'skipLink'       => array( 'type' => 'Boolean' ),
					'skipTarget'     => array( 'type' => 'String' ),
					'focusRing'      => array( 'type' => 'Boolean' ),
					'focusRingColor' => array( 'type' => 'String' ),
					'focusRingWidth' => array( 'type' => 'Int' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfAccessibilityContent',
			array(
				'description' => 'Content accessibility utilities.',
				'fields'      => array(
					'language'       => array( 'type' => 'String' ),
					'underlineLinks' => array( 'type' => 'Boolean' ),
					'routeAnnouncer' => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfAccessibilityMedia',
			array(
				'description' => 'Media accessibility utilities.',
				'fields'      => array(
					'blockAutoplayReducedMotion' => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfAccessibilityMotion',
			array(
				'description' => 'Motion accessibility utilities.',
				'fields'      => array(
					'honorPrefersReducedMotion' => array( 'type' => 'Boolean' ),
					'forceReduceMotion'         => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfAccessibilityForms',
			array(
				'description' => 'Form accessibility utilities.',
				'fields'      => array(
					'enhancedFocus'    => array( 'type' => 'Boolean' ),
					'statusLiveRegion' => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfAccessibilityAdvanced',
			array(
				'description' => 'Advanced accessibility utilities.',
				'fields'      => array(
					'customCss'     => array( 'type' => 'String' ),
					'debugOutlines' => array( 'type' => 'Boolean' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfAccessibility',
			array(
				'description' => 'Published accessibility utilities for the headless frontend.',
				'fields'      => array(
					'preset'     => array( 'type' => 'String' ),
					'navigation' => array( 'type' => 'KpfAccessibilityNavigation' ),
					'content'    => array( 'type' => 'KpfAccessibilityContent' ),
					'media'      => array( 'type' => 'KpfAccessibilityMedia' ),
					'motion'     => array( 'type' => 'KpfAccessibilityMotion' ),
					'forms'      => array( 'type' => 'KpfAccessibilityForms' ),
					'advanced'   => array( 'type' => 'KpfAccessibilityAdvanced' ),
				),
			)
		);

		register_graphql_field(
			'RootQuery',
			'kpfAccessibility',
			array(
				'type'        => 'KpfAccessibility',
				'description' => 'Accessibility utilities configured under Utilities → Accessibility.',
				'resolve'     => static fn(): array => Settings::public_config(),
			)
		);
	}
}

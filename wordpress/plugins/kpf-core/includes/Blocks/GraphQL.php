<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

final class GraphQL {
	public static function register(): void {
		add_action('graphql_register_types', array( self::class, 'register_types' ));
	}

	public static function register_types(): void {
		if (! function_exists('register_graphql_field')) {
			return;
		}

		register_graphql_field(
			'RootQuery',
			'kpfFrontPage',
			array(
				'type'        => 'Page',
				'description' => 'The WordPress page assigned as the site front page.',
				'resolve'     => static function ($source, array $args, $context) {
					unset($source, $args);
					$page_id = (int) get_option('page_on_front');
					if ($page_id < 1 || ! class_exists('\WPGraphQL\Data\DataSource')) {
						return null;
					}

					return \WPGraphQL\Data\DataSource::resolve_post_object($page_id, $context);
				},
			)
		);
	}
}

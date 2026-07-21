<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

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
			'kpfStylesheet',
			array(
				'type'        => 'String',
				'description' => 'The sanitized global stylesheet managed in WordPress (Stylesheet admin).',
				'resolve'     => static fn(): string => self::resolve_css(),
			)
		);
	}

	public static function resolve_css(): string {
		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'orderby'        => 'ID',
				'order'          => 'ASC',
				'fields'         => 'ids',
			)
		);
		return $posts ? Meta::get_css( (int) $posts[0] ) : '';
	}
}

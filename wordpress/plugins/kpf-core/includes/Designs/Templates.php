<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

/**
 * Catalog of dynamic design templates (singular + archive per post type).
 */
final class Templates {
	public const VIEW_SINGULAR = 'singular';
	public const VIEW_ARCHIVE  = 'archive';

	/**
	 * Public / editorial post types that can receive dynamic designs.
	 *
	 * @return array<int, array{name: string, label: string, rest_base: string, has_archive: bool, rewrite_slug: string}>
	 */
	public static function post_types(): array {
		$catalog = array();

		foreach ( self::candidate_names() as $name ) {
			$object = get_post_type_object( $name );
			if ( ! $object || empty( $object->public ) ) {
				continue;
			}

			$rewrite_slug = $name;
			if ( is_array( $object->rewrite ) && ! empty( $object->rewrite['slug'] ) ) {
				$rewrite_slug = (string) $object->rewrite['slug'];
			} elseif ( 'post' === $name ) {
				$rewrite_slug = 'blog';
			}

			$catalog[] = array(
				'name'         => $name,
				'label'        => (string) ( $object->labels->name ?? $object->label ?? $name ),
				'singular'     => (string) ( $object->labels->singular_name ?? $object->label ?? $name ),
				'rest_base'    => (string) ( $object->rest_base ?: $name ),
				'has_archive'  => (bool) $object->has_archive,
				'rewrite_slug' => trim( $rewrite_slug, '/' ),
			);
		}

		/**
		 * Filter the post types available for dynamic design templates.
		 *
		 * @param array<int, array<string, mixed>> $catalog Post type rows.
		 */
		return array_values( apply_filters( 'kpf_design_template_post_types', $catalog ) );
	}

	/**
	 * @return array<int, string>
	 */
	private static function candidate_names(): array {
		$names = array( 'post', 'page' );
		foreach ( get_post_types( array( 'public' => true ), 'names' ) as $name ) {
			$name = (string) $name;
			if ( in_array( $name, array( 'attachment', 'revision', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_font_family', 'wp_font_face' ), true ) ) {
				continue;
			}
			if ( ! in_array( $name, $names, true ) ) {
				$names[] = $name;
			}
		}

		/**
		 * Filter candidate post type names before public checks.
		 *
		 * @param array<int, string> $names Post type names.
		 */
		return array_values( array_unique( apply_filters( 'kpf_design_template_candidate_post_types', $names ) ) );
	}

	/**
	 * @return array<int, string>
	 */
	public static function views(): array {
		return array( self::VIEW_SINGULAR, self::VIEW_ARCHIVE );
	}

	public static function is_valid_view( string $view ): bool {
		return in_array( $view, self::views(), true );
	}

	public static function is_valid_post_type( string $post_type ): bool {
		foreach ( self::post_types() as $row ) {
			if ( $post_type === $row['name'] ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function rows(): array {
		$rows = array();
		foreach ( self::post_types() as $type ) {
			foreach ( self::views() as $view ) {
				$rows[] = self::row( $type['name'], $view, $type );
			}
		}

		return $rows;
	}

	/**
	 * @param array<string, mixed>|null $type_info Optional cached post type info.
	 * @return array<string, mixed>
	 */
	public static function row( string $post_type, string $view, ?array $type_info = null ): array {
		$type_info ??= self::type_info( $post_type );
		$design_id   = Meta::find_template_design_id( $post_type, $view );
		$design      = $design_id > 0 ? Meta::get_design( $design_id ) : Meta::design_defaults();
		$ready       = Meta::template_has_design( $post_type, $view );
		$path        = self::path_for( $type_info, $view );
		$label       = self::VIEW_ARCHIVE === $view
			? sprintf(
				/* translators: %s: post type plural label */
				__( '%s archive', 'kpf-core' ),
				(string) ( $type_info['label'] ?? $post_type )
			)
			: sprintf(
				/* translators: %s: post type singular label */
				__( '%s singular', 'kpf-core' ),
				(string) ( $type_info['singular'] ?? $post_type )
			);

		return array(
			'kind'         => 'template',
			'id'           => self::row_id( $post_type, $view ),
			'postType'     => $post_type,
			'view'         => $view,
			'title'        => $label,
			'typeLabel'    => (string) ( $type_info['label'] ?? $post_type ),
			'status'       => 'template',
			'url'          => home_url( $path ),
			'path'         => $path,
			'ready'        => $ready,
			'designId'     => $design_id,
			'htmlFilename' => (string) ( $design['html_filename'] ?? '' ),
			'cssFilename'  => (string) ( $design['css_filename'] ?? '' ),
		);
	}

	public static function row_id( string $post_type, string $view ): string {
		return $post_type . ':' . $view;
	}

	/**
	 * @return array{postType: string, view: string}|null
	 */
	public static function parse_row_id( string $id ): ?array {
		$parts = explode( ':', $id, 2 );
		if ( 2 !== count( $parts ) ) {
			return null;
		}

		$post_type = sanitize_key( $parts[0] );
		$view      = sanitize_key( $parts[1] );
		if ( ! self::is_valid_post_type( $post_type ) || ! self::is_valid_view( $view ) ) {
			return null;
		}

		return array(
			'postType' => $post_type,
			'view'     => $view,
		);
	}

	/**
	 * @param array<string, mixed> $type_info Post type info.
	 */
	private static function path_for( array $type_info, string $view ): string {
		$slug = trim( (string) ( $type_info['rewrite_slug'] ?? $type_info['name'] ?? '' ), '/' );
		if ( 'page' === ( $type_info['name'] ?? '' ) ) {
			return self::VIEW_ARCHIVE === $view ? '/' : '/{slug}/';
		}
		if ( 'post' === ( $type_info['name'] ?? '' ) ) {
			return self::VIEW_ARCHIVE === $view ? '/blog/' : '/blog/{slug}/';
		}
		if ( '' === $slug ) {
			$slug = (string) ( $type_info['name'] ?? 'content' );
		}

		return self::VIEW_ARCHIVE === $view ? '/' . $slug . '/' : '/' . $slug . '/{slug}/';
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function type_info( string $post_type ): array {
		foreach ( self::post_types() as $row ) {
			if ( $post_type === $row['name'] ) {
				return $row;
			}
		}

		return array(
			'name'         => $post_type,
			'label'        => $post_type,
			'singular'     => $post_type,
			'rewrite_slug' => $post_type,
		);
	}
}

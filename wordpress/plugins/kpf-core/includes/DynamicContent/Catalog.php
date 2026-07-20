<?php

declare(strict_types=1);

namespace KPF\Core\DynamicContent;

use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Designs\Placeholders;
use KPF\Core\Pages\FieldDiscovery;
use KPF\Core\Seo\Tags\Registry as SeoTagRegistry;

/**
 * Unified catalog of invocable frontend / SEO tags, grouped by context.
 */
final class Catalog {
	/**
	 * @return array{
	 *   sections: array<int, array{id:string,label:string,description:string,editable:bool,tags:array<int,array<string,mixed>>}>,
	 *   custom: array<int, array<string,mixed>>,
	 *   updated_at: string|null
	 * }
	 */
	public static function get(): array {
		return array(
			'sections'   => array(
				self::section(
					'site',
					__( 'Site-wide custom tags', 'kpf-core' ),
					__( 'Editable values synced across SEO patterns (%%site_key%%) and design templates ({{site.key}}).', 'kpf-core' ),
					true,
					self::custom_tag_rows()
				),
				self::section(
					'seo',
					__( 'SEO pattern tags', 'kpf-core' ),
					__( 'Resolved server-side in search titles, descriptions, and social meta.', 'kpf-core' ),
					false,
					self::seo_rows()
				),
				self::section(
					'design_page',
					__( 'Design — page fields', 'kpf-core' ),
					__( 'Mustache tags resolved on the headless frontend for the current page.', 'kpf-core' ),
					false,
					self::design_rows( array( 'page' ) )
				),
				self::section(
					'design_media',
					__( 'Design — media', 'kpf-core' ),
					__( 'Featured image and media attributes available in page designs.', 'kpf-core' ),
					false,
					self::design_rows( array( 'media' ) )
				),
				self::section(
					'design_seo',
					__( 'Design — SEO fields', 'kpf-core' ),
					__( 'Resolved SEO values injected into design templates.', 'kpf-core' ),
					false,
					self::design_rows( array( 'seo' ) )
				),
				self::section(
					'design_fields',
					__( 'Design — custom content fields', 'kpf-core' ),
					__( 'Active {{fields.*}} keys discovered from published designs (values set per page).', 'kpf-core' ),
					false,
					self::discovered_field_rows()
				),
				self::section(
					'content_post',
					__( 'Content — blog posts', 'kpf-core' ),
					__( 'SEO / field chips available when editing posts.', 'kpf-core' ),
					false,
					self::content_field_rows( 'post' )
				),
				self::section(
					'content_event',
					__( 'Content — events', 'kpf-core' ),
					__( 'SEO / field chips available when editing events.', 'kpf-core' ),
					false,
					self::content_field_rows( 'kpf_event' )
				),
				self::section(
					'content_page',
					__( 'Content — pages', 'kpf-core' ),
					__( 'Design and SEO chips available in the page editor.', 'kpf-core' ),
					false,
					self::page_editor_rows()
				),
			),
			'custom'     => Settings::get_tags(),
			'updated_at' => self::updated_at(),
		);
	}

	/**
	 * @param array<int, array<string, mixed>> $tags
	 * @return array{id:string,label:string,description:string,editable:bool,tags:array<int,array<string,mixed>>}
	 */
	private static function section( string $id, string $label, string $description, bool $editable, array $tags ): array {
		return compact( 'id', 'label', 'description', 'editable', 'tags' );
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function custom_tag_rows(): array {
		$rows = array();
		foreach ( Settings::get_tags() as $tag ) {
			$key = (string) ( $tag['key'] ?? '' );
			if ( $key === '' ) {
				continue;
			}
			$invocations = array();
			if ( ! empty( $tag['expose_seo'] ) ) {
				$invocations[] = '%%site_' . $key . '%%';
			}
			if ( ! empty( $tag['expose_design'] ) ) {
				$invocations[] = '{{site.' . $key . '}}';
			}
			$rows[] = array(
				'id'            => 'site:' . $key,
				'token'         => $key,
				'invocation'    => $invocations[0] ?? '{{site.' . $key . '}}',
				'invocations'   => $invocations,
				'label'         => (string) ( $tag['label'] ?? $key ),
				'description'   => (string) ( $tag['description'] ?? '' ),
				'value'         => (string) ( $tag['value'] ?? '' ),
				'enabled'       => ! empty( $tag['enabled'] ),
				'expose_seo'    => ! empty( $tag['expose_seo'] ),
				'expose_design' => ! empty( $tag['expose_design'] ),
				'editable'      => true,
				'builtin'       => false,
				'context'       => 'site',
			);
		}
		return $rows;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function seo_rows(): array {
		SeoTagRegistry::boot();
		$rows = array();
		foreach ( SeoTagRegistry::catalog() as $tag ) {
			$rows[] = array(
				'id'          => 'seo:' . ( $tag['token'] ?? '' ),
				'token'       => (string) ( $tag['token'] ?? '' ),
				'invocation'  => (string) ( $tag['invocation'] ?? '' ),
				'invocations' => array( (string) ( $tag['invocation'] ?? '' ) ),
				'label'       => (string) ( $tag['label'] ?? '' ),
				'description' => (string) ( $tag['description'] ?? '' ),
				'group'       => (string) ( $tag['group'] ?? '' ),
				'editable'    => false,
				'builtin'     => true,
				'context'     => 'seo',
			);
		}
		return $rows;
	}

	/**
	 * @param array<int, string> $groups
	 * @return array<int, array<string, mixed>>
	 */
	private static function design_rows( array $groups ): array {
		$allowed = array_fill_keys( $groups, true );
		$rows    = array();
		foreach ( Placeholders::all() as $item ) {
			$group = (string) ( $item['group'] ?? '' );
			if ( ! isset( $allowed[ $group ] ) ) {
				continue;
			}
			// Skip seo_patterns — those live under SEO section.
			$token = (string) ( $item['token'] ?? '' );
			$rows[] = array(
				'id'          => 'design:' . $token,
				'token'       => $token,
				'invocation'  => $token,
				'invocations' => array( $token ),
				'label'       => (string) ( $item['label'] ?? $token ),
				'description' => (string) ( $item['description'] ?? '' ),
				'group'       => $group,
				'editable'    => false,
				'builtin'     => true,
				'context'     => 'design_' . $group,
			);
		}
		return $rows;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function discovered_field_rows(): array {
		$keys = self::discover_design_field_keys();
		$rows = array();
		foreach ( $keys as $key => $meta ) {
			$token = '{{fields.' . $key . '}}';
			$rows[] = array(
				'id'          => 'fields:' . $key,
				'token'       => $key,
				'invocation'  => $token,
				'invocations' => array( $token ),
				'label'       => (string) ( $meta['label'] ?? FieldDiscovery::label_for_key( $key ) ),
				'description' => sprintf(
					/* translators: %d: number of designs using this field */
					_n( 'Used in %d published design.', 'Used in %d published designs.', (int) $meta['count'], 'kpf-core' ),
					(int) $meta['count']
				),
				'editable'    => false,
				'builtin'     => false,
				'context'     => 'design_fields',
			);
		}
		return $rows;
	}

	/**
	 * @return array<string, array{label:string,count:int}>
	 */
	public static function discover_design_field_keys(): array {
		$query = new \WP_Query(
			array(
				'post_type'      => DesignsContentType::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => 100,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);

		$found = array();
		foreach ( $query->posts as $design_id ) {
			$meta = DesignsMeta::get_design( (int) $design_id );
			$html = (string) ( $meta['html'] ?? '' );
			foreach ( FieldDiscovery::from_html( $html ) as $field ) {
				$key = (string) ( $field['key'] ?? '' );
				if ( $key === '' ) {
					continue;
				}
				if ( ! isset( $found[ $key ] ) ) {
					$found[ $key ] = array(
						'label' => (string) ( $field['label'] ?? FieldDiscovery::label_for_key( $key ) ),
						'count' => 0,
					);
				}
				++$found[ $key ]['count'];
			}
		}

		ksort( $found );
		return $found;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function content_field_rows( string $post_type ): array {
		$map = array(
			'title'               => '%%title%%',
			'excerpt'             => '%%excerpt%%',
			'category'            => '%%category%%',
			'tag'                 => '%%tag%%',
			'author'              => '%%author%%',
			'date'                => '%%date%%',
			'seo.focus_keyphrase' => '%%focuskw%%',
			'seo.title'           => '%%title%%',
			'seo.description'     => '%%excerpt%%',
			'seo.canonical'       => '%%permalink%%',
		);

		$labels = array(
			'title'               => __( 'Title', 'kpf-core' ),
			'excerpt'             => __( 'Excerpt', 'kpf-core' ),
			'category'            => __( 'Primary category', 'kpf-core' ),
			'tag'                 => __( 'Primary topic / tag', 'kpf-core' ),
			'author'              => __( 'Author', 'kpf-core' ),
			'date'                => __( 'Published date', 'kpf-core' ),
			'seo.focus_keyphrase' => __( 'Focus keyphrase', 'kpf-core' ),
			'seo.title'           => __( 'SEO title pattern', 'kpf-core' ),
			'seo.description'     => __( 'SEO description pattern', 'kpf-core' ),
			'seo.canonical'       => __( 'Canonical URL', 'kpf-core' ),
		);

		$rows = array();
		foreach ( $map as $field => $invocation ) {
			$rows[] = array(
				'id'          => $post_type . ':' . $field,
				'token'       => $field,
				'invocation'  => $invocation,
				'invocations' => array( $invocation ),
				'label'       => $labels[ $field ] ?? $field,
				'description' => sprintf(
					/* translators: 1: post type, 2: field key */
					__( 'Editor chip for %1$s → %2$s', 'kpf-core' ),
					$post_type,
					$field
				),
				'editable'    => false,
				'builtin'     => true,
				'context'     => 'content_' . $post_type,
			);
		}
		return $rows;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function page_editor_rows(): array {
		$rows = array();
		foreach ( Placeholders::editor_field_tags() as $field => $token ) {
			$rows[] = array(
				'id'          => 'page:' . $field,
				'token'       => $field,
				'invocation'  => $token,
				'invocations' => array( $token ),
				'label'       => FieldDiscovery::label_for_key( str_replace( '.', ' ', $field ) ),
				'description' => __( 'Page editor design chip.', 'kpf-core' ),
				'editable'    => false,
				'builtin'     => true,
				'context'     => 'content_page',
			);
		}
		return $rows;
	}

	private static function updated_at(): ?string {
		$time = get_option( '_kpf_dynamic_content_tags_updated', null );
		return is_string( $time ) && $time !== '' ? $time : null;
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Design\Tokens;

use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Stylesheet\Meta as StylesheetMeta;

/**
 * Build a merged inventory of global + design-detected tokens.
 */
final class Scanner {
	/**
	 * @return array{
	 *   items: list<array<string, mixed>>,
	 *   counts: array{all: int, variables: int, classes: int, global: int, design: int, managed: int}
	 * }
	 */
	public static function inventory(): array {
		$registry   = Registry::get();
		$managed_v  = array();
		$managed_c  = array();
		foreach ( $registry['variables'] as $row ) {
			$managed_v[ $row['name'] ] = $row;
		}
		foreach ( $registry['classes'] as $row ) {
			$managed_c[ $row['name'] ] = $row;
		}

		/** @var array<string, array<string, mixed>> $bag */
		$bag = array();

		$sheet_id  = StylesheetMeta::ensure_stylesheet();
		$sheet_css = $sheet_id > 0 ? StylesheetMeta::get_css( $sheet_id ) : '';
		$outside   = Parser::strip_tokens_block( $sheet_css );
		$parsed_ss = Parser::extract_from_css( $sheet_css );

		foreach ( $parsed_ss['variables'] as $name => $value ) {
			self::touch(
				$bag,
				'variable',
				$name,
				$value,
				'',
				array(
					'type'  => 'stylesheet',
					'label' => __( 'Global stylesheet', 'kpf-core' ),
				)
			);
		}
		foreach ( $parsed_ss['classes'] as $name => $css ) {
			self::touch(
				$bag,
				'class',
				$name,
				'',
				$css,
				array(
					'type'  => 'stylesheet',
					'label' => __( 'Global stylesheet', 'kpf-core' ),
				)
			);
		}

		// Prefer registry values for managed items.
		foreach ( $managed_v as $name => $row ) {
			$key = 'variable:' . $name;
			if ( ! isset( $bag[ $key ] ) ) {
				self::touch(
					$bag,
					'variable',
					$name,
					$row['value'],
					'',
					array(
						'type'  => 'stylesheet',
						'label' => __( 'Global stylesheet', 'kpf-core' ),
					)
				);
			}
			$bag[ $key ]['value']   = $row['value'];
			$bag[ $key ]['note']    = $row['note'];
			$bag[ $key ]['managed'] = true;
		}
		foreach ( $managed_c as $name => $row ) {
			$key = 'class:' . $name;
			if ( ! isset( $bag[ $key ] ) ) {
				self::touch(
					$bag,
					'class',
					$name,
					'',
					$row['css'],
					array(
						'type'  => 'stylesheet',
						'label' => __( 'Global stylesheet', 'kpf-core' ),
					)
				);
			}
			$bag[ $key ]['css']     = $row['css'];
			$bag[ $key ]['note']    = $row['note'];
			$bag[ $key ]['managed'] = true;
		}

		foreach ( self::design_posts() as $post ) {
			$payload = DesignsMeta::sanitize_design( get_post_meta( (int) $post->ID, DesignsMeta::DESIGN_META, true ) );
			$loc     = array(
				'type'  => 'design',
				'id'    => (int) $post->ID,
				'label' => (string) $post->post_title,
				'url'   => admin_url( 'edit.php?post_type=page&page=kpf-designs' ),
			);
			$parsed  = Parser::extract_from_css( (string) ( $payload['css'] ?? '' ) );
			foreach ( $parsed['variables'] as $name => $value ) {
				self::touch( $bag, 'variable', $name, $value, '', $loc );
			}
			foreach ( $parsed['classes'] as $name => $css ) {
				self::touch( $bag, 'class', $name, '', $css, $loc );
			}
			foreach ( Parser::extract_classes_from_html( (string) ( $payload['html'] ?? '' ) ) as $name ) {
				self::touch( $bag, 'class', $name, '', '', $loc );
			}
		}

		$items = array_values( $bag );
		usort(
			$items,
			static function ( array $a, array $b ): int {
				$kind = strcmp( (string) $a['kind'], (string) $b['kind'] );
				return 0 !== $kind ? $kind : strcasecmp( (string) $a['name'], (string) $b['name'] );
			}
		);

		foreach ( $items as &$item ) {
			$in_ss     = false;
			$in_design = false;
			foreach ( $item['locations'] as $loc ) {
				if ( 'stylesheet' === ( $loc['type'] ?? '' ) ) {
					$in_ss = true;
				}
				if ( 'design' === ( $loc['type'] ?? '' ) ) {
					$in_design = true;
				}
			}
			if ( $in_ss && $in_design ) {
				$item['scope'] = 'both';
			} elseif ( $in_design ) {
				$item['scope'] = 'design';
			} else {
				$item['scope'] = 'global';
			}
			// Outside-block detections without registry still count as global if only in stylesheet.
			unset( $in_ss, $in_design );
		}
		unset( $item );

		$counts = array(
			'all'       => count( $items ),
			'variables' => 0,
			'classes'   => 0,
			'global'    => 0,
			'design'    => 0,
			'managed'   => 0,
		);
		foreach ( $items as $item ) {
			if ( 'variable' === $item['kind'] ) {
				++$counts['variables'];
			} else {
				++$counts['classes'];
			}
			if ( in_array( $item['scope'], array( 'global', 'both' ), true ) ) {
				++$counts['global'];
			}
			if ( in_array( $item['scope'], array( 'design', 'both' ), true ) ) {
				++$counts['design'];
			}
			if ( ! empty( $item['managed'] ) ) {
				++$counts['managed'];
			}
		}

		unset( $outside );

		return array(
			'items'  => $items,
			'counts' => $counts,
		);
	}

	/**
	 * @return list<\WP_Post>
	 */
	private static function design_posts(): array {
		$posts = get_posts(
			array(
				'post_type'      => DesignsContentType::POST_TYPE,
				'post_status'    => array( 'publish', 'draft', 'private' ),
				'posts_per_page' => 500,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		return is_array( $posts ) ? $posts : array();
	}

	/**
	 * @param array<string, array<string, mixed>> $bag
	 * @param array<string, mixed>                $location
	 */
	private static function touch(
		array &$bag,
		string $kind,
		string $name,
		string $value,
		string $css,
		array $location
	): void {
		$key = $kind . ':' . $name;
		if ( ! isset( $bag[ $key ] ) ) {
			$bag[ $key ] = array(
				'id'        => $key,
				'kind'      => $kind,
				'name'      => $name,
				'value'     => $value,
				'css'       => $css,
				'note'      => '',
				'managed'   => false,
				'scope'     => 'global',
				'locations' => array(),
			);
		}
		if ( '' !== $value && '' === (string) $bag[ $key ]['value'] ) {
			$bag[ $key ]['value'] = $value;
		}
		if ( '' !== $css && '' === (string) $bag[ $key ]['css'] ) {
			$bag[ $key ]['css'] = $css;
		}
		$bag[ $key ]['locations'][] = $location;
		// Dedupe locations.
		$uniq = array();
		$seen = array();
		foreach ( $bag[ $key ]['locations'] as $loc ) {
			$sig = ( $loc['type'] ?? '' ) . ':' . (string) ( $loc['id'] ?? '' ) . ':' . (string) ( $loc['label'] ?? '' );
			if ( isset( $seen[ $sig ] ) ) {
				continue;
			}
			$seen[ $sig ] = true;
			$uniq[]       = $loc;
		}
		$bag[ $key ]['locations'] = $uniq;
	}
}

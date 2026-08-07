<?php

declare(strict_types=1);

namespace KPF\Core\Design\Tokens;

use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Performance\Purge;
use KPF\Core\Stylesheet\Meta as StylesheetMeta;
use WP_Error;

/**
 * Persist token edits into registry, stylesheet, and design sources.
 */
final class Sync {
	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|WP_Error
	 */
	public static function upsert_variable( array $payload ) {
		$name  = Registry::sanitize_variable_name( $payload['name'] ?? '' );
		$value = Registry::sanitize_css_value( $payload['value'] ?? '' );
		$note  = substr( sanitize_text_field( (string) ( $payload['note'] ?? '' ) ), 0, 200 );
		$old   = Registry::sanitize_variable_name( $payload['oldName'] ?? $name );

		if ( '' === $name || '' === $value ) {
			return new WP_Error(
				'kpf_token_invalid_variable',
				__( 'Variable name and value are required.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$registry = Registry::get();
		$found    = false;
		foreach ( $registry['variables'] as &$row ) {
			if ( $row['name'] === $old || $row['name'] === $name ) {
				$row['name']  = $name;
				$row['value'] = $value;
				$row['note']  = $note;
				$found        = true;
			}
		}
		unset( $row );
		if ( ! $found ) {
			$registry['variables'][] = array(
				'name'  => $name,
				'value' => $value,
				'note'  => $note,
			);
		}
		$registry = Registry::save( $registry );

		if ( $old && $old !== $name ) {
			self::rename_variable_everywhere( $old, $name );
		}
		self::set_variable_value_everywhere( $name, $value );
		self::recompile_stylesheet( $registry );
		Purge::run( array( 'scope' => 'all' ) );

		return Scanner::inventory();
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|WP_Error
	 */
	public static function upsert_class( array $payload ) {
		$name = Registry::sanitize_class_name( $payload['name'] ?? '' );
		$css  = Registry::sanitize_declarations( $payload['css'] ?? '' );
		$note = substr( sanitize_text_field( (string) ( $payload['note'] ?? '' ) ), 0, 200 );
		$old  = Registry::sanitize_class_name( $payload['oldName'] ?? $name );

		if ( '' === $name ) {
			return new WP_Error(
				'kpf_token_invalid_class',
				__( 'Class name is required.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$registry = Registry::get();
		$found    = false;
		foreach ( $registry['classes'] as &$row ) {
			if ( $row['name'] === $old || $row['name'] === $name ) {
				$row['name'] = $name;
				$row['css']  = $css;
				$row['note'] = $note;
				$found       = true;
			}
		}
		unset( $row );
		if ( ! $found ) {
			$registry['classes'][] = array(
				'name' => $name,
				'css'  => $css,
				'note' => $note,
			);
		}
		$registry = Registry::save( $registry );

		if ( $old && $old !== $name ) {
			self::rename_class_everywhere( $old, $name );
		}
		self::set_class_css_everywhere( $name, $css );
		self::recompile_stylesheet( $registry );
		Purge::run( array( 'scope' => 'all' ) );

		return Scanner::inventory();
	}

	/**
	 * Update a detected (possibly unmanaged) token across its locations only.
	 *
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|WP_Error
	 */
	public static function update_detected( array $payload ) {
		$kind = (string) ( $payload['kind'] ?? '' );
		if ( 'variable' === $kind ) {
			$name  = Registry::sanitize_variable_name( $payload['name'] ?? '' );
			$value = Registry::sanitize_css_value( $payload['value'] ?? '' );
			$old   = Registry::sanitize_variable_name( $payload['oldName'] ?? $name );
			if ( '' === $name || '' === $value ) {
				return new WP_Error( 'kpf_token_invalid_variable', __( 'Variable name and value are required.', 'kpf-core' ), array( 'status' => 400 ) );
			}
			if ( $old && $old !== $name ) {
				self::rename_variable_everywhere( $old, $name );
			}
			self::set_variable_value_everywhere( $name, $value );
			// Keep registry in sync if managed.
			$registry = Registry::get();
			foreach ( $registry['variables'] as &$row ) {
				if ( $row['name'] === $old || $row['name'] === $name ) {
					$row['name']  = $name;
					$row['value'] = $value;
				}
			}
			unset( $row );
			Registry::save( $registry );
			self::recompile_stylesheet( Registry::get() );
			Purge::run( array( 'scope' => 'all' ) );
			return Scanner::inventory();
		}

		if ( 'class' === $kind ) {
			$name = Registry::sanitize_class_name( $payload['name'] ?? '' );
			$css  = Registry::sanitize_declarations( $payload['css'] ?? '' );
			$old  = Registry::sanitize_class_name( $payload['oldName'] ?? $name );
			if ( '' === $name ) {
				return new WP_Error( 'kpf_token_invalid_class', __( 'Class name is required.', 'kpf-core' ), array( 'status' => 400 ) );
			}
			if ( $old && $old !== $name ) {
				self::rename_class_everywhere( $old, $name );
			}
			if ( '' !== $css ) {
				self::set_class_css_everywhere( $name, $css );
			}
			$registry = Registry::get();
			foreach ( $registry['classes'] as &$row ) {
				if ( $row['name'] === $old || $row['name'] === $name ) {
					$row['name'] = $name;
					$row['css']  = $css;
				}
			}
			unset( $row );
			Registry::save( $registry );
			self::recompile_stylesheet( Registry::get() );
			Purge::run( array( 'scope' => 'all' ) );
			return Scanner::inventory();
		}

		return new WP_Error( 'kpf_token_bad_kind', __( 'Unknown token kind.', 'kpf-core' ), array( 'status' => 400 ) );
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|WP_Error
	 */
	public static function promote( array $payload ) {
		$kind = (string) ( $payload['kind'] ?? '' );
		if ( 'variable' === $kind ) {
			return self::upsert_variable(
				array(
					'name'  => $payload['name'] ?? '',
					'value' => $payload['value'] ?? '',
					'note'  => $payload['note'] ?? '',
				)
			);
		}
		if ( 'class' === $kind ) {
			return self::upsert_class(
				array(
					'name' => $payload['name'] ?? '',
					'css'  => $payload['css'] ?? '',
					'note' => $payload['note'] ?? '',
				)
			);
		}
		return new WP_Error( 'kpf_token_bad_kind', __( 'Unknown token kind.', 'kpf-core' ), array( 'status' => 400 ) );
	}

	/**
	 * @param array{variables: list<array{name: string, value: string, note: string}>, classes: list<array{name: string, css: string, note: string}>} $registry
	 */
	public static function recompile_stylesheet( array $registry ): void {
		$post_id = StylesheetMeta::ensure_stylesheet();
		if ( $post_id < 1 ) {
			return;
		}
		$current = StylesheetMeta::get_css( $post_id );
		$block   = Registry::compile_block( $registry );
		$next    = Parser::upsert_tokens_block( $current, $block );
		$next    = StylesheetMeta::sanitize_css( $next );
		if ( $next === $current ) {
			return;
		}
		wp_save_post_revision( $post_id );
		update_post_meta( $post_id, StylesheetMeta::CSS_META, $next );
		wp_update_post( array( 'ID' => $post_id ) );
		wp_save_post_revision( $post_id );
	}

	private static function set_variable_value_everywhere( string $name, string $value ): void {
		$post_id = StylesheetMeta::ensure_stylesheet();
		if ( $post_id > 0 ) {
			$css  = StylesheetMeta::get_css( $post_id );
			$next = Parser::replace_variable_value( $css, $name, $value );
			if ( $next !== $css ) {
				wp_save_post_revision( $post_id );
				update_post_meta( $post_id, StylesheetMeta::CSS_META, StylesheetMeta::sanitize_css( $next ) );
				wp_update_post( array( 'ID' => $post_id ) );
				wp_save_post_revision( $post_id );
			}
		}

		foreach ( self::design_ids() as $design_id ) {
			$payload = DesignsMeta::sanitize_design( get_post_meta( $design_id, DesignsMeta::DESIGN_META, true ) );
			$css     = (string) ( $payload['css'] ?? '' );
			$next    = Parser::replace_variable_value( $css, $name, $value );
			if ( $next === $css ) {
				continue;
			}
			$payload['css'] = $next;
			$payload        = DesignsMeta::sanitize_design( $payload );
			wp_save_post_revision( $design_id );
			update_post_meta( $design_id, DesignsMeta::DESIGN_META, $payload );
			wp_update_post( array( 'ID' => $design_id ) );
			wp_save_post_revision( $design_id );
		}
	}

	private static function rename_variable_everywhere( string $old, string $new ): void {
		$post_id = StylesheetMeta::ensure_stylesheet();
		if ( $post_id > 0 ) {
			$css  = StylesheetMeta::get_css( $post_id );
			$next = Parser::rename_variable( $css, $old, $new );
			if ( $next !== $css ) {
				wp_save_post_revision( $post_id );
				update_post_meta( $post_id, StylesheetMeta::CSS_META, StylesheetMeta::sanitize_css( $next ) );
				wp_update_post( array( 'ID' => $post_id ) );
				wp_save_post_revision( $post_id );
			}
		}

		foreach ( self::design_ids() as $design_id ) {
			$payload = DesignsMeta::sanitize_design( get_post_meta( $design_id, DesignsMeta::DESIGN_META, true ) );
			$html    = (string) ( $payload['html'] ?? '' );
			$css     = (string) ( $payload['css'] ?? '' );
			$next_css  = Parser::rename_variable( $css, $old, $new );
			$next_html = Parser::rename_variable( $html, $old, $new );
			if ( $next_css === $css && $next_html === $html ) {
				continue;
			}
			$payload['css']  = $next_css;
			$payload['html'] = $next_html;
			$payload         = DesignsMeta::sanitize_design( $payload );
			wp_save_post_revision( $design_id );
			update_post_meta( $design_id, DesignsMeta::DESIGN_META, $payload );
			wp_update_post( array( 'ID' => $design_id ) );
			wp_save_post_revision( $design_id );
		}
	}

	private static function set_class_css_everywhere( string $name, string $declarations ): void {
		$post_id = StylesheetMeta::ensure_stylesheet();
		if ( $post_id > 0 ) {
			$css  = StylesheetMeta::get_css( $post_id );
			$next = Parser::replace_class_declarations( $css, $name, $declarations );
			if ( $next !== $css ) {
				wp_save_post_revision( $post_id );
				update_post_meta( $post_id, StylesheetMeta::CSS_META, StylesheetMeta::sanitize_css( $next ) );
				wp_update_post( array( 'ID' => $post_id ) );
				wp_save_post_revision( $post_id );
			}
		}

		foreach ( self::design_ids() as $design_id ) {
			$payload = DesignsMeta::sanitize_design( get_post_meta( $design_id, DesignsMeta::DESIGN_META, true ) );
			$css     = (string) ( $payload['css'] ?? '' );
			$next    = Parser::replace_class_declarations( $css, $name, $declarations );
			if ( $next === $css ) {
				continue;
			}
			$payload['css'] = $next;
			$payload        = DesignsMeta::sanitize_design( $payload );
			wp_save_post_revision( $design_id );
			update_post_meta( $design_id, DesignsMeta::DESIGN_META, $payload );
			wp_update_post( array( 'ID' => $design_id ) );
			wp_save_post_revision( $design_id );
		}
	}

	private static function rename_class_everywhere( string $old, string $new ): void {
		$post_id = StylesheetMeta::ensure_stylesheet();
		if ( $post_id > 0 ) {
			$css  = StylesheetMeta::get_css( $post_id );
			$next = Parser::rename_class_in_css( $css, $old, $new );
			if ( $next !== $css ) {
				wp_save_post_revision( $post_id );
				update_post_meta( $post_id, StylesheetMeta::CSS_META, StylesheetMeta::sanitize_css( $next ) );
				wp_update_post( array( 'ID' => $post_id ) );
				wp_save_post_revision( $post_id );
			}
		}

		foreach ( self::design_ids() as $design_id ) {
			$payload   = DesignsMeta::sanitize_design( get_post_meta( $design_id, DesignsMeta::DESIGN_META, true ) );
			$html      = (string) ( $payload['html'] ?? '' );
			$css       = (string) ( $payload['css'] ?? '' );
			$next_css  = Parser::rename_class_in_css( $css, $old, $new );
			$next_html = Parser::rename_class_in_html( $html, $old, $new );
			if ( $next_css === $css && $next_html === $html ) {
				continue;
			}
			$payload['css']  = $next_css;
			$payload['html'] = $next_html;
			$payload         = DesignsMeta::sanitize_design( $payload );
			wp_save_post_revision( $design_id );
			update_post_meta( $design_id, DesignsMeta::DESIGN_META, $payload );
			wp_update_post( array( 'ID' => $design_id ) );
			wp_save_post_revision( $design_id );
		}
	}

	/**
	 * @return list<int>
	 */
	private static function design_ids(): array {
		$ids = get_posts(
			array(
				'post_type'      => DesignsContentType::POST_TYPE,
				'post_status'    => array( 'publish', 'draft', 'private' ),
				'posts_per_page' => 500,
				'fields'         => 'ids',
			)
		);
		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}
}

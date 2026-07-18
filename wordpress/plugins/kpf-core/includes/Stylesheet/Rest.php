<?php

declare(strict_types=1);

namespace KPF\Core\Stylesheet;

use KPF\Core\Performance\Purge;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-stylesheet/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/stylesheet',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'show' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'save' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/revisions',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'revisions' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/revisions/(?P<revision_id>\d+)/restore',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'restore' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				'args'                => array(
					'revision_id' => array(
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'settings' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'save_settings' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_theme_options' ),
				),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function show() {
		$post_id = Meta::ensure_stylesheet();
		return $post_id > 0
			? new WP_REST_Response( self::payload( $post_id ) )
			: self::create_error();
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save( WP_REST_Request $request ) {
		$post_id = Meta::ensure_stylesheet();
		if ( $post_id < 1 ) {
			return self::create_error();
		}

		$current  = Meta::get_css( $post_id );
		$revision = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $revision && ! hash_equals( Meta::revision( $current ), $revision ) ) {
			return new WP_Error(
				'kpf_stylesheet_edit_conflict',
				__( 'The stylesheet changed after you opened it. Reload before saving.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$raw = (string) $request->get_param( 'css' );
		if ( strlen( $raw ) > Meta::MAX_BYTES ) {
			return new WP_Error(
				'kpf_stylesheet_too_large',
				__( 'The stylesheet must be 1 MB or smaller.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$css = Meta::sanitize_css( $raw );
		if ( $css !== $current ) {
			wp_save_post_revision( $post_id );
			update_post_meta( $post_id, Meta::CSS_META, $css );
			wp_update_post( array( 'ID' => $post_id ) );
			wp_save_post_revision( $post_id );
			Purge::run( array( 'scope' => 'all' ) );
		}

		return new WP_REST_Response( self::payload( $post_id ) );
	}

	public static function revisions(): WP_REST_Response {
		$post_id = Meta::ensure_stylesheet();
		$items   = array();
		if ( $post_id > 0 ) {
			foreach ( wp_get_post_revisions( $post_id, array( 'posts_per_page' => -1 ) ) as $revision ) {
				if ( wp_is_post_autosave( $revision ) ) {
					continue;
				}
				$css     = Meta::get_css( (int) $revision->ID );
				$author  = get_userdata( (int) $revision->post_author );
				$summary = preg_replace( '/\s+/', ' ', $css ) ?: '';
				$items[] = array(
					'id'          => (int) $revision->ID,
					'date'        => mysql_to_rfc3339( (string) $revision->post_date ),
					'dateDisplay' => get_date_from_gmt(
						(string) $revision->post_date_gmt,
						get_option( 'date_format' ) . ' ' . get_option( 'time_format' )
					),
					'author'      => $author ? $author->display_name : __( 'Unknown user', 'kpf-core' ),
					'bytes'       => strlen( $css ),
					'summary'     => '' !== trim( $summary )
						? wp_html_excerpt( trim( $summary ), 140, '…' )
						: __( 'Empty stylesheet', 'kpf-core' ),
				);
			}
		}

		return new WP_REST_Response(
			array(
				'revisions' => $items,
				'limit'     => Meta::history_limit(),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function restore( WP_REST_Request $request ) {
		$post_id     = Meta::ensure_stylesheet();
		$revision_id = absint( $request['revision_id'] );
		$revision    = wp_get_post_revision( $revision_id );
		if ( $post_id < 1 || ! $revision || (int) $revision->post_parent !== $post_id ) {
			return new WP_Error(
				'kpf_stylesheet_revision_not_found',
				__( 'That stylesheet version could not be found.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$current      = Meta::get_css( $post_id );
		$client_token = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $client_token && ! hash_equals( Meta::revision( $current ), $client_token ) ) {
			return new WP_Error(
				'kpf_stylesheet_edit_conflict',
				__( 'The stylesheet changed after you opened it. Reload before restoring.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$restored = Meta::get_css( $revision_id );
		wp_save_post_revision( $post_id );
		update_post_meta( $post_id, Meta::CSS_META, $restored );
		wp_update_post( array( 'ID' => $post_id ) );
		wp_save_post_revision( $post_id );
		Purge::run( array( 'scope' => 'all' ) );

		return new WP_REST_Response(
			array(
				'ok'         => true,
				'stylesheet' => self::payload( $post_id ),
			)
		);
	}

	public static function settings(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'historyLimit' => Meta::history_limit(),
				'minimum'      => Meta::HISTORY_MIN,
				'maximum'      => Meta::HISTORY_MAX,
			)
		);
	}

	public static function save_settings( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'historyLimit' => Meta::set_history_limit( $request->get_param( 'historyLimit' ) ),
				'minimum'      => Meta::HISTORY_MIN,
				'maximum'      => Meta::HISTORY_MAX,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function payload( int $post_id ): array {
		$css = Meta::get_css( $post_id );
		return array(
			'id'       => $post_id,
			'css'      => $css,
			'bytes'    => strlen( $css ),
			'revision' => Meta::revision( $css ),
			'modified' => mysql_to_rfc3339( (string) get_post_field( 'post_modified', $post_id ) ),
		);
	}

	private static function create_error(): WP_Error {
		return new WP_Error(
			'kpf_stylesheet_create_failed',
			__( 'The global stylesheet could not be created.', 'kpf-core' ),
			array( 'status' => 500 )
		);
	}
}

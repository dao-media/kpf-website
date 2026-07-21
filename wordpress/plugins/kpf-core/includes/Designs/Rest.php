<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-designs/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/urls',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'urls' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/templates',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'templates' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'settings' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'save_settings' ),
					'permission_callback' => static fn(): bool => current_user_can( 'manage_options' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/page/(?P<id>\d+)/upload',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'upload' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'required'          => true,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/page/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'editor' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
					'args'                => self::page_args(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'save' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
					'args'                => self::page_args(),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/page/(?P<id>\d+)/revisions',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'revisions' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => self::page_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/page/(?P<id>\d+)/revisions/(?P<revision_id>\d+)/restore',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'restore_revision' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => array_merge(
					self::page_args(),
					array(
						'revision_id' => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
							'required'          => true,
						),
					)
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/page/(?P<id>\d+)/clear',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'clear' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'required'          => true,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/placeholders',
			array(
				'methods'             => 'GET',
				'callback'            => static fn(): WP_REST_Response => new WP_REST_Response(
					array( 'placeholders' => Placeholders::all() )
				),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
			)
		);

		$template_item = '(?P<post_type>[a-z0-9_-]+)/(?P<view>singular|archive)';
		$system_item   = '(?P<role>fallback|maintenance)';

		register_rest_route(
			self::NAMESPACE,
			'/public/maintenance',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'public_maintenance' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/system/' . $system_item . '/upload',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'upload_system' ),
				'permission_callback' => static fn(): bool => current_user_can( 'manage_options' ),
				'args'                => self::system_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/system/' . $system_item,
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'editor_system' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
					'args'                => self::system_args(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'save_system' ),
					'permission_callback' => static fn(): bool => current_user_can( 'manage_options' ),
					'args'                => self::system_args(),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/system/' . $system_item . '/revisions',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'revisions_system' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => self::system_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/system/' . $system_item . '/revisions/(?P<revision_id>\d+)/restore',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'restore_revision_system' ),
				'permission_callback' => static fn(): bool => current_user_can( 'manage_options' ),
				'args'                => array_merge(
					self::system_args(),
					array(
						'revision_id' => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
							'required'          => true,
						),
					)
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/system/' . $system_item . '/clear',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'clear_system' ),
				'permission_callback' => static fn(): bool => current_user_can( 'manage_options' ),
				'args'                => self::system_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/template/' . $template_item . '/upload',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'upload_template' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => self::template_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/template/' . $template_item,
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'editor_template' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
					'args'                => self::template_args(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'save_template' ),
					'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
					'args'                => self::template_args(),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/template/' . $template_item . '/revisions',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'revisions_template' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => self::template_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/template/' . $template_item . '/revisions/(?P<revision_id>\d+)/restore',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'restore_revision_template' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => array_merge(
					self::template_args(),
					array(
						'revision_id' => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
							'required'          => true,
						),
					)
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/template/' . $template_item . '/clear',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'clear_template' ),
				'permission_callback' => static fn(): bool => current_user_can( 'edit_pages' ),
				'args'                => self::template_args(),
			)
		);
	}

	public static function urls(): WP_REST_Response {
		return new WP_REST_Response( array( 'urls' => Admin::site_urls() ) );
	}

	public static function templates(): WP_REST_Response {
		return new WP_REST_Response( array( 'templates' => Templates::rows() ) );
	}

	public static function settings(): WP_REST_Response {
		return new WP_REST_Response( Settings::admin_payload() );
	}

	public static function save_settings( WP_REST_Request $request ): WP_REST_Response {
		if ( null !== $request->get_param( 'historyLimit' ) ) {
			Meta::set_history_limit( $request->get_param( 'historyLimit' ) );
		}

		$updates = array();
		if ( null !== $request->get_param( 'maintenanceEnabled' ) ) {
			$updates['maintenance_enabled'] = (bool) $request->get_param( 'maintenanceEnabled' );
		}
		if ( null !== $request->get_param( 'maintenancePath' ) ) {
			$updates['maintenance_path'] = (string) $request->get_param( 'maintenancePath' );
		}
		if ( null !== $request->get_param( 'maintenanceAllowlist' ) ) {
			$updates['maintenance_allowlist'] = (array) $request->get_param( 'maintenanceAllowlist' );
		}

		if ( $updates ) {
			Settings::update( $updates );
		}

		return new WP_REST_Response( Settings::admin_payload() );
	}

	public static function public_maintenance(): WP_REST_Response {
		$response = new WP_REST_Response( Settings::public_maintenance() );
		$response->header( 'Cache-Control', 'public, max-age=30' );
		return $response;
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function editor( WP_REST_Request $request ) {
		$page_id = absint( $request['id'] );
		$error   = self::validate_page( $page_id );
		if ( $error ) {
			return $error;
		}

		$design_id = (int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before opening the editor.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response( self::editor_payload( $page_id, $design_id ) );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save( WP_REST_Request $request ) {
		$page_id = absint( $request['id'] );
		$error   = self::validate_page( $page_id );
		if ( $error ) {
			return $error;
		}

		$design_id = (int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before saving code changes.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$current  = Meta::get_design( $design_id );
		$revision = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $revision && ! hash_equals( self::revision( $current ), $revision ) ) {
			return new WP_Error(
				'kpf_design_edit_conflict',
				__( 'This design changed after you opened it. Reload the editor before saving.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$html = (string) $request->get_param( 'html' );
		$css  = (string) $request->get_param( 'css' );
		if ( strlen( $html ) > Meta::MAX_SOURCE_BYTES || strlen( $css ) > Meta::MAX_SOURCE_BYTES ) {
			return new WP_Error(
				'kpf_design_source_too_large',
				__( 'HTML and CSS must each be 1 MB or smaller.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$next = Meta::sanitize_design(
			array(
				'html_filename' => $current['html_filename'] ?: 'design.html',
				'html'          => $html,
				'css_filename'  => $current['css_filename'] ?: ( '' !== trim( $css ) ? 'design.css' : '' ),
				'css'           => $css,
			)
		);
		if ( '' === trim( (string) $next['html'] ) ) {
			return new WP_Error(
				'kpf_design_html_empty',
				__( 'The HTML editor cannot be empty.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		update_post_meta( $design_id, Meta::DESIGN_META, $next );
		wp_update_post(
			array(
				'ID'          => $design_id,
				'post_status' => 'publish',
			)
		);
		wp_save_post_revision( $design_id );

		return new WP_REST_Response(
			array(
				'ok'     => true,
				'editor' => self::editor_payload( $page_id, $design_id ),
				'url'    => self::row_for_page( $page_id ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function revisions( WP_REST_Request $request ) {
		$page_id = absint( $request['id'] );
		$error   = self::validate_page( $page_id );
		if ( $error ) {
			return $error;
		}

		$design_id = (int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before viewing version history.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response(
			array(
				'revisions' => self::revision_items( $design_id ),
				'limit'     => Meta::history_limit(),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function restore_revision( WP_REST_Request $request ) {
		$page_id     = absint( $request['id'] );
		$revision_id = absint( $request['revision_id'] );
		$error       = self::validate_page( $page_id );
		if ( $error ) {
			return $error;
		}

		$design_id = (int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true );
		$revision  = wp_get_post_revision( $revision_id );
		if (
			$design_id < 1 ||
			! $revision ||
			(int) $revision->post_parent !== $design_id
		) {
			return new WP_Error(
				'kpf_design_revision_not_found',
				__( 'That design version could not be found.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$current       = Meta::get_design( $design_id );
		$client_source = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $client_source && ! hash_equals( self::revision( $current ), $client_source ) ) {
			return new WP_Error(
				'kpf_design_edit_conflict',
				__( 'This design changed after you opened it. Reload before restoring a version.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$restored = Meta::get_design( $revision_id );
		if ( '' === trim( (string) $restored['html'] ) ) {
			return new WP_Error(
				'kpf_design_revision_empty',
				__( 'That version does not contain restorable HTML.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		wp_save_post_revision( $design_id );
		update_post_meta( $design_id, Meta::DESIGN_META, $restored );
		wp_update_post( array( 'ID' => $design_id ) );
		wp_save_post_revision( $design_id );

		return new WP_REST_Response(
			array(
				'ok'     => true,
				'editor' => self::editor_payload( $page_id, $design_id ),
				'url'    => self::row_for_page( $page_id ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function upload( WP_REST_Request $request ) {
		$page_id = absint( $request['id'] );
		if ( 'page' !== get_post_type( $page_id ) || ! current_user_can( 'edit_post', $page_id ) ) {
			return new WP_Error(
				'kpf_design_invalid_page',
				__( 'That page could not be found or edited.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$files = $request->get_file_params();
		$html_file = is_array( $files['html'] ?? null ) ? $files['html'] : null;
		$css_file  = is_array( $files['css'] ?? null ) ? $files['css'] : null;

		if ( ! $html_file || (int) ( $html_file['error'] ?? UPLOAD_ERR_NO_FILE ) !== UPLOAD_ERR_OK ) {
			return new WP_Error(
				'kpf_design_html_required',
				__( 'Choose an HTML design file to upload.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$html = self::read_upload( $html_file, array( 'html', 'htm' ) );
		if ( is_wp_error( $html ) ) {
			return $html;
		}

		$css = array( 'contents' => '', 'filename' => '' );
		if ( $css_file && (int) ( $css_file['error'] ?? UPLOAD_ERR_NO_FILE ) === UPLOAD_ERR_OK ) {
			$css = self::read_upload( $css_file, array( 'css' ) );
			if ( is_wp_error( $css ) ) {
				return $css;
			}
		}

		$design_id = Meta::ensure_page_design( $page_id );
		if ( $design_id < 1 ) {
			return new WP_Error(
				'kpf_design_create_failed',
				__( 'The design record could not be created.', 'kpf-core' ),
				array( 'status' => 500 )
			);
		}

		$current = Meta::get_design( $design_id );
		$next    = Meta::sanitize_design(
			array(
				'html_filename' => $html['filename'],
				'html'          => $html['contents'],
				'css_filename'  => '' !== $css['filename'] ? $css['filename'] : $current['css_filename'],
				'css'           => '' !== $css['contents'] ? $css['contents'] : $current['css'],
			)
		);

		if ( '' === trim( $next['html'] ) ) {
			return new WP_Error(
				'kpf_design_html_empty',
				__( 'The uploaded HTML file is empty after sanitization.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		update_post_meta( $design_id, Meta::DESIGN_META, $next );
		wp_update_post(
			array(
				'ID'          => $design_id,
				'post_status' => 'publish',
			)
		);
		wp_save_post_revision( $design_id );

		return new WP_REST_Response(
			array(
				'ok'  => true,
				'url' => self::row_for_page( $page_id ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function clear( WP_REST_Request $request ) {
		$page_id = absint( $request['id'] );
		if ( 'page' !== get_post_type( $page_id ) || ! current_user_can( 'edit_post', $page_id ) ) {
			return new WP_Error(
				'kpf_design_invalid_page',
				__( 'That page could not be found or edited.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$design_id = (int) get_post_meta( $page_id, Meta::PAGE_DESIGN_META, true );
		delete_post_meta( $page_id, Meta::PAGE_DESIGN_META );
		if ( $design_id > 0 && ContentType::POST_TYPE === get_post_type( $design_id ) ) {
			wp_delete_post( $design_id, true );
		}

		return new WP_REST_Response(
			array(
				'ok'  => true,
				'url' => self::row_for_page( $page_id ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function editor_template( WP_REST_Request $request ) {
		$target = self::resolve_template( $request );
		if ( is_wp_error( $target ) ) {
			return $target;
		}

		$design_id = Meta::find_template_design_id( $target['postType'], $target['view'] );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before opening the editor.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response(
			self::editor_payload_for_row( Templates::row( $target['postType'], $target['view'] ), $design_id )
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_template( WP_REST_Request $request ) {
		$target = self::resolve_template( $request );
		if ( is_wp_error( $target ) ) {
			return $target;
		}

		$design_id = Meta::find_template_design_id( $target['postType'], $target['view'] );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before saving code changes.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$current  = Meta::get_design( $design_id );
		$revision = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $revision && ! hash_equals( self::revision( $current ), $revision ) ) {
			return new WP_Error(
				'kpf_design_edit_conflict',
				__( 'This design changed after you opened it. Reload the editor before saving.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$html = (string) $request->get_param( 'html' );
		$css  = (string) $request->get_param( 'css' );
		if ( strlen( $html ) > Meta::MAX_SOURCE_BYTES || strlen( $css ) > Meta::MAX_SOURCE_BYTES ) {
			return new WP_Error(
				'kpf_design_source_too_large',
				__( 'HTML and CSS must each be 1 MB or smaller.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$next = Meta::sanitize_design(
			array(
				'html_filename' => $current['html_filename'] ?: 'design.html',
				'html'          => $html,
				'css_filename'  => $current['css_filename'] ?: ( '' !== trim( $css ) ? 'design.css' : '' ),
				'css'           => $css,
			)
		);
		if ( '' === trim( (string) $next['html'] ) ) {
			return new WP_Error(
				'kpf_design_html_empty',
				__( 'The HTML editor cannot be empty.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		update_post_meta( $design_id, Meta::DESIGN_META, $next );
		wp_update_post(
			array(
				'ID'          => $design_id,
				'post_status' => 'publish',
			)
		);
		wp_save_post_revision( $design_id );

		$row = Templates::row( $target['postType'], $target['view'] );

		return new WP_REST_Response(
			array(
				'ok'     => true,
				'editor' => self::editor_payload_for_row( $row, $design_id ),
				'url'    => $row,
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function revisions_template( WP_REST_Request $request ) {
		$target = self::resolve_template( $request );
		if ( is_wp_error( $target ) ) {
			return $target;
		}

		$design_id = Meta::find_template_design_id( $target['postType'], $target['view'] );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before viewing version history.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response(
			array(
				'revisions' => self::revision_items( $design_id ),
				'limit'     => Meta::history_limit(),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function restore_revision_template( WP_REST_Request $request ) {
		$target = self::resolve_template( $request );
		if ( is_wp_error( $target ) ) {
			return $target;
		}

		$revision_id = absint( $request['revision_id'] );
		$design_id   = Meta::find_template_design_id( $target['postType'], $target['view'] );
		$revision    = wp_get_post_revision( $revision_id );
		if (
			$design_id < 1 ||
			! $revision ||
			(int) $revision->post_parent !== $design_id
		) {
			return new WP_Error(
				'kpf_design_revision_not_found',
				__( 'That design version could not be found.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$current       = Meta::get_design( $design_id );
		$client_source = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $client_source && ! hash_equals( self::revision( $current ), $client_source ) ) {
			return new WP_Error(
				'kpf_design_edit_conflict',
				__( 'This design changed after you opened it. Reload before restoring a version.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$restored = Meta::get_design( $revision_id );
		if ( '' === trim( (string) $restored['html'] ) ) {
			return new WP_Error(
				'kpf_design_revision_empty',
				__( 'That version does not contain restorable HTML.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		wp_save_post_revision( $design_id );
		update_post_meta( $design_id, Meta::DESIGN_META, $restored );
		wp_update_post( array( 'ID' => $design_id ) );
		wp_save_post_revision( $design_id );

		$row = Templates::row( $target['postType'], $target['view'] );

		return new WP_REST_Response(
			array(
				'ok'     => true,
				'editor' => self::editor_payload_for_row( $row, $design_id ),
				'url'    => $row,
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function upload_template( WP_REST_Request $request ) {
		$target = self::resolve_template( $request );
		if ( is_wp_error( $target ) ) {
			return $target;
		}

		$files     = $request->get_file_params();
		$html_file = is_array( $files['html'] ?? null ) ? $files['html'] : null;
		$css_file  = is_array( $files['css'] ?? null ) ? $files['css'] : null;

		if ( ! $html_file || (int) ( $html_file['error'] ?? UPLOAD_ERR_NO_FILE ) !== UPLOAD_ERR_OK ) {
			return new WP_Error(
				'kpf_design_html_required',
				__( 'Choose an HTML design file to upload.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$html = self::read_upload( $html_file, array( 'html', 'htm' ) );
		if ( is_wp_error( $html ) ) {
			return $html;
		}

		$css = array( 'contents' => '', 'filename' => '' );
		if ( $css_file && (int) ( $css_file['error'] ?? UPLOAD_ERR_NO_FILE ) === UPLOAD_ERR_OK ) {
			$css = self::read_upload( $css_file, array( 'css' ) );
			if ( is_wp_error( $css ) ) {
				return $css;
			}
		}

		$design_id = Meta::ensure_template_design( $target['postType'], $target['view'] );
		if ( $design_id < 1 ) {
			return new WP_Error(
				'kpf_design_create_failed',
				__( 'The design record could not be created.', 'kpf-core' ),
				array( 'status' => 500 )
			);
		}

		$current = Meta::get_design( $design_id );
		$next    = Meta::sanitize_design(
			array(
				'html_filename' => $html['filename'],
				'html'          => $html['contents'],
				'css_filename'  => '' !== $css['filename'] ? $css['filename'] : $current['css_filename'],
				'css'           => '' !== $css['contents'] ? $css['contents'] : $current['css'],
			)
		);

		if ( '' === trim( $next['html'] ) ) {
			return new WP_Error(
				'kpf_design_html_empty',
				__( 'The uploaded HTML file is empty after sanitization.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		update_post_meta( $design_id, Meta::DESIGN_META, $next );
		wp_update_post(
			array(
				'ID'          => $design_id,
				'post_status' => 'publish',
			)
		);
		wp_save_post_revision( $design_id );

		return new WP_REST_Response(
			array(
				'ok'  => true,
				'url' => Templates::row( $target['postType'], $target['view'] ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function clear_template( WP_REST_Request $request ) {
		$target = self::resolve_template( $request );
		if ( is_wp_error( $target ) ) {
			return $target;
		}

		$design_id = Meta::find_template_design_id( $target['postType'], $target['view'] );
		if ( $design_id > 0 && ContentType::POST_TYPE === get_post_type( $design_id ) ) {
			wp_delete_post( $design_id, true );
		}

		return new WP_REST_Response(
			array(
				'ok'  => true,
				'url' => Templates::row( $target['postType'], $target['view'] ),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function editor_system( WP_REST_Request $request ) {
		$role = self::resolve_system_role( $request );
		if ( is_wp_error( $role ) ) {
			return $role;
		}

		$design_id = Settings::design_id_for_role( $role );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before opening the editor.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response(
			self::editor_payload_for_row( Settings::system_row( $role ), $design_id )
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_system( WP_REST_Request $request ) {
		$role = self::resolve_system_role( $request );
		if ( is_wp_error( $role ) ) {
			return $role;
		}

		$design_id = Settings::design_id_for_role( $role );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before saving code changes.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$current  = Meta::get_design( $design_id );
		$revision = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $revision && ! hash_equals( self::revision( $current ), $revision ) ) {
			return new WP_Error(
				'kpf_design_edit_conflict',
				__( 'This design changed after you opened it. Reload the editor before saving.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$html = (string) $request->get_param( 'html' );
		$css  = (string) $request->get_param( 'css' );
		if ( strlen( $html ) > Meta::MAX_SOURCE_BYTES || strlen( $css ) > Meta::MAX_SOURCE_BYTES ) {
			return new WP_Error(
				'kpf_design_source_too_large',
				__( 'HTML and CSS must each be 1 MB or smaller.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$next = Meta::sanitize_design(
			array(
				'html_filename' => $current['html_filename'] ?: 'design.html',
				'html'          => $html,
				'css_filename'  => $current['css_filename'] ?: ( '' !== trim( $css ) ? 'design.css' : '' ),
				'css'           => $css,
			)
		);
		if ( '' === trim( (string) $next['html'] ) ) {
			return new WP_Error(
				'kpf_design_html_empty',
				__( 'The HTML editor cannot be empty.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		update_post_meta( $design_id, Meta::DESIGN_META, $next );
		wp_update_post(
			array(
				'ID'          => $design_id,
				'post_status' => 'publish',
			)
		);
		wp_save_post_revision( $design_id );

		$row = Settings::system_row( $role );

		return new WP_REST_Response(
			array(
				'ok'       => true,
				'editor'   => self::editor_payload_for_row( $row, $design_id ),
				'url'      => $row,
				'settings' => Settings::admin_payload(),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function revisions_system( WP_REST_Request $request ) {
		$role = self::resolve_system_role( $request );
		if ( is_wp_error( $role ) ) {
			return $role;
		}

		$design_id = Settings::design_id_for_role( $role );
		if ( $design_id < 1 || ContentType::POST_TYPE !== get_post_type( $design_id ) ) {
			return new WP_Error(
				'kpf_design_not_found',
				__( 'Upload an HTML design before viewing version history.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return new WP_REST_Response(
			array(
				'revisions' => self::revision_items( $design_id ),
				'limit'     => Meta::history_limit(),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function restore_revision_system( WP_REST_Request $request ) {
		$role = self::resolve_system_role( $request );
		if ( is_wp_error( $role ) ) {
			return $role;
		}

		$revision_id = absint( $request['revision_id'] );
		$design_id   = Settings::design_id_for_role( $role );
		$revision    = wp_get_post_revision( $revision_id );
		if (
			$design_id < 1 ||
			! $revision ||
			(int) $revision->post_parent !== $design_id
		) {
			return new WP_Error(
				'kpf_design_revision_not_found',
				__( 'That design version could not be found.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		$current       = Meta::get_design( $design_id );
		$client_source = sanitize_text_field( (string) $request->get_param( 'revision' ) );
		if ( '' !== $client_source && ! hash_equals( self::revision( $current ), $client_source ) ) {
			return new WP_Error(
				'kpf_design_edit_conflict',
				__( 'This design changed after you opened it. Reload before restoring a version.', 'kpf-core' ),
				array( 'status' => 409 )
			);
		}

		$restored = Meta::get_design( $revision_id );
		if ( '' === trim( (string) $restored['html'] ) ) {
			return new WP_Error(
				'kpf_design_revision_empty',
				__( 'That version does not contain restorable HTML.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		wp_save_post_revision( $design_id );
		update_post_meta( $design_id, Meta::DESIGN_META, $restored );
		wp_update_post( array( 'ID' => $design_id ) );
		wp_save_post_revision( $design_id );

		$row = Settings::system_row( $role );

		return new WP_REST_Response(
			array(
				'ok'       => true,
				'editor'   => self::editor_payload_for_row( $row, $design_id ),
				'url'      => $row,
				'settings' => Settings::admin_payload(),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function upload_system( WP_REST_Request $request ) {
		$role = self::resolve_system_role( $request );
		if ( is_wp_error( $role ) ) {
			return $role;
		}

		$files     = $request->get_file_params();
		$html_file = is_array( $files['html'] ?? null ) ? $files['html'] : null;
		$css_file  = is_array( $files['css'] ?? null ) ? $files['css'] : null;

		if ( ! $html_file || (int) ( $html_file['error'] ?? UPLOAD_ERR_NO_FILE ) !== UPLOAD_ERR_OK ) {
			return new WP_Error(
				'kpf_design_html_required',
				__( 'Choose an HTML design file to upload.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$html = self::read_upload( $html_file, array( 'html', 'htm' ) );
		if ( is_wp_error( $html ) ) {
			return $html;
		}

		$css = array( 'contents' => '', 'filename' => '' );
		if ( $css_file && (int) ( $css_file['error'] ?? UPLOAD_ERR_NO_FILE ) === UPLOAD_ERR_OK ) {
			$css = self::read_upload( $css_file, array( 'css' ) );
			if ( is_wp_error( $css ) ) {
				return $css;
			}
		}

		$design_id = Meta::ensure_system_design( $role );
		if ( $design_id < 1 ) {
			return new WP_Error(
				'kpf_design_create_failed',
				__( 'The design record could not be created.', 'kpf-core' ),
				array( 'status' => 500 )
			);
		}

		$current = Meta::get_design( $design_id );
		$next    = Meta::sanitize_design(
			array(
				'html_filename' => $html['filename'],
				'html'          => $html['contents'],
				'css_filename'  => '' !== $css['filename'] ? $css['filename'] : $current['css_filename'],
				'css'           => '' !== $css['contents'] ? $css['contents'] : $current['css'],
			)
		);

		if ( '' === trim( $next['html'] ) ) {
			return new WP_Error(
				'kpf_design_html_empty',
				__( 'The uploaded HTML file is empty after sanitization.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		update_post_meta( $design_id, Meta::DESIGN_META, $next );
		wp_update_post(
			array(
				'ID'          => $design_id,
				'post_status' => 'publish',
			)
		);
		wp_save_post_revision( $design_id );

		return new WP_REST_Response(
			array(
				'ok'       => true,
				'url'      => Settings::system_row( $role ),
				'settings' => Settings::admin_payload(),
			)
		);
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public static function clear_system( WP_REST_Request $request ) {
		$role = self::resolve_system_role( $request );
		if ( is_wp_error( $role ) ) {
			return $role;
		}

		$design_id = Settings::design_id_for_role( $role );
		Settings::set_design_id_for_role( $role, 0 );
		if ( $design_id > 0 && ContentType::POST_TYPE === get_post_type( $design_id ) ) {
			wp_delete_post( $design_id, true );
		}

		return new WP_REST_Response(
			array(
				'ok'       => true,
				'url'      => Settings::system_row( $role ),
				'settings' => Settings::admin_payload(),
			)
		);
	}

	/**
	 * @param array{name?: string, tmp_name?: string, size?: int, error?: int} $file
	 * @param array<int, string>                                              $extensions
	 * @return array{contents: string, filename: string}|WP_Error
	 */
	private static function read_upload( array $file, array $extensions ) {
		$filename  = sanitize_file_name( (string) ( $file['name'] ?? '' ) );
		$extension = strtolower( (string) pathinfo( $filename, PATHINFO_EXTENSION ) );
		$size      = (int) ( $file['size'] ?? 0 );
		$tmp       = (string) ( $file['tmp_name'] ?? '' );

		if ( ! in_array( $extension, $extensions, true ) ) {
			return new WP_Error(
				'kpf_design_invalid_extension',
				sprintf(
					/* translators: %s: comma-separated list of file extensions */
					__( 'Upload a file ending in: %s', 'kpf-core' ),
					implode( ', ', array_map( static fn( string $ext ): string => '.' . $ext, $extensions ) )
				),
				array( 'status' => 400 )
			);
		}

		if ( $size < 1 || $size > Meta::MAX_SOURCE_BYTES || '' === $tmp || ! is_uploaded_file( $tmp ) ) {
			return new WP_Error(
				'kpf_design_invalid_upload',
				__( 'The uploaded file is missing, empty, or larger than 1 MB.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$contents = file_get_contents( $tmp );
		if ( false === $contents ) {
			return new WP_Error(
				'kpf_design_read_failed',
				__( 'The uploaded file could not be read.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		return array(
			'contents' => $contents,
			'filename' => $filename,
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private static function page_args(): array {
		return array(
			'id' => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'required'          => true,
			),
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private static function template_args(): array {
		return array(
			'post_type' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'required'          => true,
			),
			'view'      => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'required'          => true,
			),
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private static function system_args(): array {
		return array(
			'role' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'required'          => true,
			),
		);
	}

	private static function validate_page( int $page_id ): ?WP_Error {
		if ( 'page' !== get_post_type( $page_id ) || ! current_user_can( 'edit_post', $page_id ) ) {
			return new WP_Error(
				'kpf_design_invalid_page',
				__( 'That page could not be found or edited.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return null;
	}

	/**
	 * @return array{postType: string, view: string}|WP_Error
	 */
	private static function resolve_template( WP_REST_Request $request ) {
		$post_type = sanitize_key( (string) $request['post_type'] );
		$view      = sanitize_key( (string) $request['view'] );

		if ( ! Templates::is_valid_post_type( $post_type ) || ! Templates::is_valid_view( $view ) ) {
			return new WP_Error(
				'kpf_design_invalid_template',
				__( 'That dynamic template could not be found.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return array(
			'postType' => $post_type,
			'view'     => $view,
		);
	}

	/**
	 * @return string|WP_Error
	 */
	private static function resolve_system_role( WP_REST_Request $request ) {
		$role = sanitize_key( (string) $request['role'] );
		if ( ! Settings::is_valid_role( $role ) ) {
			return new WP_Error(
				'kpf_design_invalid_system',
				__( 'That system design could not be found.', 'kpf-core' ),
				array( 'status' => 404 )
			);
		}

		return $role;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function editor_payload( int $page_id, int $design_id ): array {
		return self::editor_payload_for_row( self::row_for_page( $page_id ), $design_id );
	}

	/**
	 * @param array<string, mixed> $row Page or template row.
	 * @return array<string, mixed>
	 */
	private static function editor_payload_for_row( array $row, int $design_id ): array {
		$design = Meta::get_design( $design_id );

		return array(
			'page'         => $row,
			'designId'     => $design_id,
			'htmlFilename' => (string) $design['html_filename'],
			'cssFilename'  => (string) $design['css_filename'],
			'html'         => (string) $design['html'],
			'css'          => (string) $design['css'],
			'revision'     => self::revision( $design ),
		);
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function revision_items( int $design_id ): array {
		$items = array();
		foreach ( wp_get_post_revisions( $design_id, array( 'posts_per_page' => -1 ) ) as $revision ) {
			if ( wp_is_post_autosave( $revision ) ) {
				continue;
			}

			$design = Meta::get_design( (int) $revision->ID );
			if ( '' === trim( (string) $design['html'] ) ) {
				continue;
			}

			$author = get_userdata( (int) $revision->post_author );
			$copy   = preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $design['html'] ) ) ?: '';
			$items[] = array(
				'id'           => (int) $revision->ID,
				'date'         => mysql_to_rfc3339( (string) $revision->post_date ),
				'dateDisplay'  => get_date_from_gmt(
					(string) $revision->post_date_gmt,
					get_option( 'date_format' ) . ' ' . get_option( 'time_format' )
				),
				'author'       => $author ? $author->display_name : __( 'Unknown user', 'kpf-core' ),
				'htmlFilename' => (string) $design['html_filename'],
				'cssFilename'  => (string) $design['css_filename'],
				'summary'      => wp_html_excerpt( trim( $copy ), 140, '…' ),
			);
		}

		return $items;
	}

	/**
	 * @param array<string, mixed> $design Design metadata.
	 */
	private static function revision( array $design ): string {
		return hash( 'sha256', (string) $design['html'] . "\0" . (string) $design['css'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function row_for_page( int $page_id ): array {
		foreach ( Admin::site_urls() as $row ) {
			if ( (int) $row['id'] === $page_id ) {
				return $row;
			}
		}

		return array(
			'kind'   => 'page',
			'id'     => $page_id,
			'ready'  => false,
			'title'  => get_the_title( $page_id ),
			'path'   => '/',
			'url'    => get_permalink( $page_id ),
			'status' => get_post_status( $page_id ),
		);
	}
}

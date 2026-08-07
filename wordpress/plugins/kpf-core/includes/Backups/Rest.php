<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public const NAMESPACE = 'kpf-backups/v1';

	public static function register(): void {
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
	}

	public static function routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'get_settings' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( self::class, 'update_settings' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/status',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_status' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/backups',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'list_backups' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'create_backup' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/jobs',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'start_job' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/jobs/active',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'active_job' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/jobs/(?P<id>[a-f0-9]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_job' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/jobs/(?P<id>[a-f0-9]+)/step',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'step_job' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/backups/(?P<id>[a-f0-9]+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'get_backup' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'PUT,PATCH',
					'callback'            => array( self::class, 'update_backup' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( self::class, 'delete_backup' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/backups/(?P<id>[a-f0-9]+)/restore',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'restore_backup' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/backups/(?P<id>[a-f0-9]+)/download',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'download_backup' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);
	}

	public static function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	public static function get_settings(): WP_REST_Response {
		return new WP_REST_Response( Settings::get(), 200 );
	}

	public static function update_settings( WP_REST_Request $request ): WP_REST_Response {
		$settings = $request->get_json_params();
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		return new WP_REST_Response( Settings::update( $settings ), 200 );
	}

	public static function get_status(): WP_REST_Response {
		Job::clear_stale_lock();

		return new WP_REST_Response(
			array(
				'schedule'   => Scheduler::status(),
				'disk'       => Storage::disk_status(),
				'busy'       => Job::is_locked(),
				'active_job' => Job::active(),
				'zip'        => class_exists( \ZipArchive::class ),
				'components' => Components::definitions(),
			),
			200
		);
	}

	public static function list_backups(): WP_REST_Response {
		return new WP_REST_Response( array( 'backups' => Storage::catalog() ), 200 );
	}

	public static function get_backup( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$record = Storage::find( sanitize_key( (string) $request['id'] ) );
		if ( null === $record ) {
			return new WP_Error( 'kpf_backups_missing', __( 'Backup not found.', 'kpf-core' ), array( 'status' => 404 ) );
		}
		return new WP_REST_Response( $record, 200 );
	}

	public static function update_backup( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = array();
		}

		$fields = array();
		if ( array_key_exists( 'label', $params ) ) {
			$fields['label'] = (string) $params['label'];
		}
		if ( array_key_exists( 'note', $params ) ) {
			$fields['note'] = (string) $params['note'];
		}
		if ( array_key_exists( 'tags', $params ) ) {
			$fields['tags'] = $params['tags'];
		}

		if ( empty( $fields ) ) {
			return new WP_Error(
				'kpf_backups_empty_update',
				__( 'Provide a label, note, or tags to update.', 'kpf-core' ),
				array( 'status' => 400 )
			);
		}

		$record = Storage::update_record( sanitize_key( (string) $request['id'] ), $fields );
		if ( null === $record ) {
			return new WP_Error( 'kpf_backups_missing', __( 'Backup not found.', 'kpf-core' ), array( 'status' => 404 ) );
		}

		return new WP_REST_Response( $record, 200 );
	}

	public static function create_backup( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = array();
		}

		$result = Exporter::create(
			array(
				'components' => is_array( $params['components'] ?? null ) ? $params['components'] : null,
				'label'      => (string) ( $params['label'] ?? '' ),
				'note'       => (string) ( $params['note'] ?? '' ),
				'tags'       => $params['tags'] ?? array(),
				'trigger'    => 'manual',
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 201 );
	}

	public static function start_job( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = array();
		}

		$result = Job::start(
			array(
				'components' => is_array( $params['components'] ?? null ) ? $params['components'] : null,
				'label'      => (string) ( $params['label'] ?? '' ),
				'note'       => (string) ( $params['note'] ?? '' ),
				'tags'       => $params['tags'] ?? array(),
				'trigger'    => 'manual',
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 201 );
	}

	public static function active_job(): WP_REST_Response {
		$active = Job::active();
		return new WP_REST_Response(
			array(
				'job' => $active,
			),
			200
		);
	}

	public static function get_job( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$result = Job::view( sanitize_key( (string) $request['id'] ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new WP_REST_Response( $result, 200 );
	}

	public static function step_job( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$result = Job::step( sanitize_key( (string) $request['id'] ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new WP_REST_Response( $result, 200 );
	}

	public static function delete_backup( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = sanitize_key( (string) $request['id'] );
		if ( ! Storage::remove_record( $id ) ) {
			return new WP_Error( 'kpf_backups_missing', __( 'Backup not found.', 'kpf-core' ), array( 'status' => 404 ) );
		}
		return new WP_REST_Response( array( 'deleted' => true, 'id' => $id ), 200 );
	}

	public static function restore_backup( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = array();
		}

		$components = $params['components'] ?? null;
		if ( is_array( $components ) ) {
			$components = array_values( array_map( 'sanitize_key', $components ) );
		} else {
			$components = null;
		}

		$result = Restorer::restore(
			sanitize_key( (string) $request['id'] ),
			array(
				'components'        => $components,
				'skip_pre_restore'  => ! empty( $params['skip_pre_restore'] ),
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * Stream a backup file to the browser.
	 *
	 * @return WP_REST_Response|WP_Error|null
	 */
	public static function download_backup( WP_REST_Request $request ) {
		$record = Storage::find( sanitize_key( (string) $request['id'] ) );
		if ( null === $record ) {
			return new WP_Error( 'kpf_backups_missing', __( 'Backup not found.', 'kpf-core' ), array( 'status' => 404 ) );
		}

		$path = Storage::path_for( (string) $record['file'] );
		if ( ! is_readable( $path ) ) {
			return new WP_Error( 'kpf_backups_file', __( 'Backup file is missing on disk.', 'kpf-core' ), array( 'status' => 404 ) );
		}

		nocache_headers();
		header( 'Content-Type: application/zip' );
		header( 'Content-Disposition: attachment; filename="' . basename( (string) $record['file'] ) . '"' );
		header( 'Content-Length: ' . (string) filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
		readfile( $path );
		exit;
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;
use WP_Error;
use ZipArchive;

final class Restorer {
	/**
	 * @param array{
	 *   components?: list<string>|null,
	 *   skip_pre_restore?: bool
	 * } $args
	 * @return array<string, mixed>|WP_Error
	 */
	public static function restore( string $id, array $args = array() ) {
		if ( get_transient( Exporter::LOCK_KEY ) ) {
			return new WP_Error( 'kpf_backups_busy', __( 'A backup or restore is already running.', 'kpf-core' ), array( 'status' => 409 ) );
		}

		$record = Storage::find( $id );
		if ( null === $record ) {
			return new WP_Error( 'kpf_backups_missing', __( 'Backup not found.', 'kpf-core' ), array( 'status' => 404 ) );
		}

		$path = Storage::path_for( (string) $record['file'] );
		if ( ! is_readable( $path ) ) {
			return new WP_Error( 'kpf_backups_file', __( 'Backup file is missing on disk.', 'kpf-core' ), array( 'status' => 404 ) );
		}

		$expected = (string) ( $record['checksum'] ?? '' );
		if ( '' !== $expected ) {
			$actual = hash_file( 'sha256', $path );
			if ( ! hash_equals( $expected, (string) $actual ) ) {
				return new WP_Error( 'kpf_backups_checksum', __( 'Backup checksum verification failed.', 'kpf-core' ), array( 'status' => 400 ) );
			}
		}

		if ( ! class_exists( ZipArchive::class ) ) {
			return new WP_Error( 'kpf_backups_zip', __( 'PHP ZipArchive is required to restore backups.', 'kpf-core' ), array( 'status' => 500 ) );
		}

		$settings = Settings::get();
		if ( ! empty( $settings['create_pre_restore'] ) && empty( $args['skip_pre_restore'] ) ) {
			$pre = Exporter::create(
				array(
					'trigger'    => 'pre_restore',
					'label'      => __( 'Safety backup before restore', 'kpf-core' ),
					'note'       => sprintf( 'Created before restoring %s', $id ),
					'skip_prune' => true,
				)
			);
			if ( is_wp_error( $pre ) ) {
				return $pre;
			}
		}

		set_transient( Exporter::LOCK_KEY, time(), 30 * MINUTE_IN_SECONDS );
		@set_time_limit( 0 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( function_exists( 'wp_raise_memory_limit' ) ) {
			wp_raise_memory_limit( 'admin' );
		}

		$temp_dir = trailingslashit( get_temp_dir() ) . 'kpf-restore-' . $id;

		try {

			self::rrmdir( $temp_dir );
			if ( ! wp_mkdir_p( $temp_dir ) ) {
				throw new \RuntimeException( __( 'Could not create a restore workspace.', 'kpf-core' ) );
			}

			$zip = new ZipArchive();
			if ( true !== $zip->open( $path ) ) {
				throw new \RuntimeException( __( 'Could not open the backup archive.', 'kpf-core' ) );
			}
			$zip->extractTo( $temp_dir );
			$zip->close();

			$manifest_file = $temp_dir . '/manifest.json';
			$manifest      = array();
			if ( is_readable( $manifest_file ) ) {
				$decoded = json_decode( (string) file_get_contents( $manifest_file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
				if ( is_array( $decoded ) ) {
					$manifest = $decoded;
				}
			}

			$available = is_array( $manifest['components'] ?? null )
				? array_values( array_map( 'strval', $manifest['components'] ) )
				: (array) ( $record['components'] ?? array() );

			$requested = $args['components'] ?? null;
			if ( is_array( $requested ) && ! empty( $requested ) ) {
				$to_restore = array_values( array_intersect( $available, array_map( 'strval', $requested ) ) );
			} else {
				$to_restore = $available;
			}

			if ( empty( $to_restore ) ) {
				throw new \RuntimeException( __( 'No matching components available to restore.', 'kpf-core' ) );
			}

			$restored = array();
			foreach ( $to_restore as $component ) {
				self::restore_component( $component, $temp_dir );
				$restored[] = $component;
			}

			flush_rewrite_rules( false );
			wp_cache_flush();

			return array(
				'id'        => $id,
				'restored'  => $restored,
				'message'   => __( 'Restore completed successfully.', 'kpf-core' ),
			);
		} catch ( \Throwable $e ) {
			return new WP_Error( 'kpf_backups_restore_failed', $e->getMessage(), array( 'status' => 500 ) );
		} finally {
			self::rrmdir( $temp_dir );
			delete_transient( Exporter::LOCK_KEY );
		}
	}

	private static function restore_component( string $component, string $temp_dir ): void {
		switch ( $component ) {
			case 'database':
				self::restore_database( $temp_dir . '/database.sql.gz' );
				break;
			case 'media':
				self::mirror_tree( $temp_dir . '/files/uploads', wp_upload_dir()['basedir'] ?? '' );
				break;
			case 'plugins':
				self::mirror_tree( $temp_dir . '/files/plugins', WP_PLUGIN_DIR );
				break;
			case 'themes':
				self::mirror_tree( $temp_dir . '/files/themes', get_theme_root() );
				break;
			case 'config':
				self::restore_config( $temp_dir . '/config' );
				break;
		}
	}

	private static function restore_database( string $gz_path ): void {
		global $wpdb;

		if ( ! is_readable( $gz_path ) ) {
			throw new \RuntimeException( __( 'Database dump missing from backup.', 'kpf-core' ) );
		}

		$gz = file_get_contents( $gz_path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$sql = gzdecode( (string) $gz );
		if ( false === $sql ) {
			throw new \RuntimeException( __( 'Could not decompress the database dump.', 'kpf-core' ) );
		}

		$statements = self::split_sql( (string) $sql );
		foreach ( $statements as $statement ) {
			$statement = trim( $statement );
			if ( '' === $statement || str_starts_with( $statement, '--' ) ) {
				continue;
			}
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$result = $wpdb->query( $statement );
			if ( false === $result && ! empty( $wpdb->last_error ) ) {
				throw new \RuntimeException(
					sprintf(
						/* translators: %s: database error */
						__( 'Database restore error: %s', 'kpf-core' ),
						$wpdb->last_error
					)
				);
			}
		}
	}

	/**
	 * @return list<string>
	 */
	private static function split_sql( string $sql ): array {
		$statements = array();
		$buffer     = '';
		$in_string  = false;
		$quote      = '';
		$length     = strlen( $sql );

		for ( $i = 0; $i < $length; $i++ ) {
			$char = $sql[ $i ];
			$prev = $i > 0 ? $sql[ $i - 1 ] : '';

			if ( $in_string ) {
				$buffer .= $char;
				if ( $char === $quote && '\\' !== $prev ) {
					$in_string = false;
				}
				continue;
			}

			if ( "'" === $char || '"' === $char ) {
				$in_string = true;
				$quote     = $char;
				$buffer   .= $char;
				continue;
			}

			if ( ';' === $char ) {
				$statements[] = $buffer;
				$buffer       = '';
				continue;
			}

			$buffer .= $char;
		}

		if ( '' !== trim( $buffer ) ) {
			$statements[] = $buffer;
		}

		return $statements;
	}

	private static function restore_config( string $source ): void {
		if ( ! is_dir( $source ) ) {
			return;
		}

		$map = array(
			'wp-config.php' => ABSPATH . 'wp-config.php',
			'.htaccess'     => ABSPATH . '.htaccess',
			'web.config'    => ABSPATH . 'web.config',
		);
		foreach ( $map as $name => $dest ) {
			$src = $source . '/' . $name;
			if ( is_readable( $src ) ) {
				copy( $src, $dest );
			}
		}

		$mu_src = $source . '/mu-plugins';
		$mu_dst = defined( 'WPMU_PLUGIN_DIR' ) ? WPMU_PLUGIN_DIR : trailingslashit( WP_CONTENT_DIR ) . 'mu-plugins';
		if ( is_dir( $mu_src ) ) {
			self::mirror_tree( $mu_src, $mu_dst );
		}

		$drop_src = $source . '/drop-ins';
		if ( is_dir( $drop_src ) ) {
			foreach ( scandir( $drop_src ) ?: array() as $file ) {
				if ( '.' === $file || '..' === $file ) {
					continue;
				}
				$src = $drop_src . '/' . $file;
				if ( is_file( $src ) ) {
					copy( $src, trailingslashit( WP_CONTENT_DIR ) . $file );
				}
			}
		}
	}

	private static function mirror_tree( string $source, string $dest ): void {
		if ( '' === $source || ! is_dir( $source ) || '' === $dest ) {
			return;
		}
		wp_mkdir_p( $dest );

		$iterator = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $source, RecursiveDirectoryIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::SELF_FIRST
		);

		/** @var SplFileInfo $file */
		foreach ( $iterator as $file ) {
			$rel    = ltrim( substr( wp_normalize_path( $file->getPathname() ), strlen( wp_normalize_path( $source ) ) ), '/' );
			$target = trailingslashit( $dest ) . $rel;
			if ( $file->isDir() ) {
				wp_mkdir_p( $target );
				continue;
			}
			wp_mkdir_p( dirname( $target ) );
			copy( $file->getPathname(), $target );
		}
	}

	private static function rrmdir( string $dir ): void {
		if ( '' === $dir || ! is_dir( $dir ) ) {
			return;
		}
		$items = scandir( $dir );
		if ( ! is_array( $items ) ) {
			return;
		}
		foreach ( $items as $item ) {
			if ( '.' === $item || '..' === $item ) {
				continue;
			}
			$path = $dir . '/' . $item;
			if ( is_dir( $path ) ) {
				self::rrmdir( $path );
			} else {
				wp_delete_file( $path );
			}
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir
		rmdir( $dir );
	}
}

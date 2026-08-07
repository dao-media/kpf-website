<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

use KPF\Core\Support\SiteDateTime;
use WP_Error;

final class Storage {
	public const CATALOG_OPTION = 'kpf_backups_catalog';
	public const DIR_NAME       = 'kpf-backups';

	public static function directory(): string {
		return trailingslashit( WP_CONTENT_DIR ) . self::DIR_NAME;
	}

	/**
	 * @return true|WP_Error
	 */
	public static function ensure() {
		$dir = self::directory();
		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return new WP_Error( 'kpf_backups_dir', __( 'Could not create the backups directory.', 'kpf-core' ) );
		}

		$htaccess = $dir . '/.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $htaccess, "Require all denied\nDeny from all\n" );
		}

		$index = $dir . '/index.php';
		if ( ! file_exists( $index ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}

		$webconfig = $dir . '/web.config';
		if ( ! file_exists( $webconfig ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents(
				$webconfig,
				"<configuration><system.webServer><authorization><deny users=\"*\" /></authorization></system.webServer></configuration>\n"
			);
		}

		return true;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function catalog(): array {
		$catalog = get_option( self::CATALOG_OPTION, array() );
		if ( ! is_array( $catalog ) ) {
			return array();
		}

		$out = array();
		foreach ( $catalog as $item ) {
			if ( ! is_array( $item ) || empty( $item['id'] ) || empty( $item['file'] ) ) {
				continue;
			}
			$path           = self::path_for( (string) $item['file'] );
			$item['exists'] = is_readable( $path );
			$item['size']   = $item['exists'] ? (int) filesize( $path ) : (int) ( $item['size'] ?? 0 );
			$out[]          = self::normalize_record( $item );
		}

		usort(
			$out,
			static function ( array $a, array $b ): int {
				return (int) ( $b['created_at'] ?? 0 ) <=> (int) ( $a['created_at'] ?? 0 );
			}
		);

		return $out;
	}

	/**
	 * @param array<string, mixed> $record
	 */
	public static function add_record( array $record ): void {
		$catalog   = self::catalog_raw();
		$catalog[] = self::normalize_record( $record, false );
		self::save_catalog( $catalog );
	}

	/**
	 * Update editable metadata on a stored backup.
	 *
	 * @param array{label?:string,note?:string,tags?:mixed} $fields
	 * @return array<string, mixed>|null
	 */
	public static function update_record( string $id, array $fields ): ?array {
		$catalog = self::catalog_raw();
		$found   = false;

		foreach ( $catalog as $index => $item ) {
			if ( (string) ( $item['id'] ?? '' ) !== $id ) {
				continue;
			}
			$found = true;
			if ( array_key_exists( 'label', $fields ) ) {
				$item['label'] = sanitize_text_field( (string) $fields['label'] );
			}
			if ( array_key_exists( 'note', $fields ) ) {
				$item['note'] = sanitize_textarea_field( (string) $fields['note'] );
			}
			if ( array_key_exists( 'tags', $fields ) ) {
				$item['tags'] = self::sanitize_tags( $fields['tags'] );
			}
			$catalog[ $index ] = $item;
			break;
		}

		if ( ! $found ) {
			return null;
		}

		self::save_catalog( $catalog );
		return self::find( $id );
	}

	public static function remove_record( string $id ): bool {
		$catalog = self::catalog_raw();
		$kept    = array();
		$found   = false;
		foreach ( $catalog as $item ) {
			if ( (string) ( $item['id'] ?? '' ) === $id ) {
				$found = true;
				$file  = (string) ( $item['file'] ?? '' );
				if ( '' !== $file ) {
					$path = self::path_for( $file );
					if ( is_file( $path ) ) {
						wp_delete_file( $path );
					}
				}
				continue;
			}
			$kept[] = $item;
		}
		if ( $found ) {
			self::save_catalog( $kept );
		}
		return $found;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function find( string $id ): ?array {
		foreach ( self::catalog() as $item ) {
			if ( (string) ( $item['id'] ?? '' ) === $id ) {
				return $item;
			}
		}
		return null;
	}

	/**
	 * Human label used when none was provided.
	 */
	public static function stamp_label( int $created_at ): string {
		return SiteDateTime::format( $created_at );
	}

	/**
	 * @param array<string, mixed> $record
	 */
	public static function display_label( array $record ): string {
		$label = trim( (string) ( $record['label'] ?? '' ) );
		if ( '' !== $label ) {
			return $label;
		}
		return self::stamp_label( (int) ( $record['created_at'] ?? 0 ) );
	}

	/**
	 * @param mixed $tags
	 * @return list<string>
	 */
	public static function sanitize_tags( $tags ): array {
		if ( is_string( $tags ) ) {
			$tags = preg_split( '/[,]+/', $tags ) ?: array();
		}
		if ( ! is_array( $tags ) ) {
			return array();
		}

		$out = array();
		foreach ( $tags as $tag ) {
			$clean = trim( sanitize_text_field( (string) $tag ) );
			if ( '' === $clean ) {
				continue;
			}
			if ( function_exists( 'mb_substr' ) ) {
				$clean = mb_substr( $clean, 0, 40 );
			} else {
				$clean = substr( $clean, 0, 40 );
			}
			$key = strtolower( $clean );
			if ( isset( $out[ $key ] ) ) {
				continue;
			}
			$out[ $key ] = $clean;
			if ( count( $out ) >= 20 ) {
				break;
			}
		}

		return array_values( $out );
	}

	public static function path_for( string $filename ): string {
		$filename = basename( $filename );
		return trailingslashit( self::directory() ) . $filename;
	}

	public static function prune( int $keep ): int {
		$keep    = max( 1, $keep );
		$catalog = self::catalog_raw();
		$removed = 0;
		usort(
			$catalog,
			static function ( array $a, array $b ): int {
				return (int) ( $b['created_at'] ?? 0 ) <=> (int) ( $a['created_at'] ?? 0 );
			}
		);
		if ( count( $catalog ) <= $keep ) {
			return 0;
		}

		$kept = array_slice( $catalog, 0, $keep );
		$drop = array_slice( $catalog, $keep );
		foreach ( $drop as $item ) {
			$file = (string) ( $item['file'] ?? '' );
			if ( '' !== $file ) {
				$path = self::path_for( $file );
				if ( is_file( $path ) ) {
					wp_delete_file( $path );
					++$removed;
				}
			}
		}
		self::save_catalog( $kept );
		return $removed;
	}

	/**
	 * @return array{free_bytes:int|null,used_bytes:int,backup_count:int,directory:string}
	 */
	public static function disk_status(): array {
		$dir  = self::directory();
		$used = 0;
		foreach ( self::catalog() as $item ) {
			$used += (int) ( $item['size'] ?? 0 );
		}

		$free = null;
		if ( function_exists( 'disk_free_space' ) ) {
			$space = @disk_free_space( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( false !== $space ) {
				$free = (int) $space;
			}
		}

		return array(
			'free_bytes'   => $free,
			'used_bytes'   => $used,
			'backup_count' => count( self::catalog() ),
			'directory'    => $dir,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private static function catalog_raw(): array {
		$catalog = get_option( self::CATALOG_OPTION, array() );
		if ( ! is_array( $catalog ) ) {
			return array();
		}

		$out = array();
		foreach ( $catalog as $item ) {
			if ( ! is_array( $item ) || empty( $item['id'] ) || empty( $item['file'] ) ) {
				continue;
			}
			unset( $item['exists'], $item['display_label'], $item['created_at_label'] );
			$out[] = $item;
		}
		return $out;
	}

	/**
	 * @param array<string, mixed> $record
	 * @return array<string, mixed>
	 */
	private static function normalize_record( array $record, bool $for_display = true ): array {
		$created = (int) ( $record['created_at'] ?? 0 );
		$label   = sanitize_text_field( (string) ( $record['label'] ?? '' ) );
		$note    = sanitize_textarea_field( (string) ( $record['note'] ?? '' ) );
		$tags    = self::sanitize_tags( $record['tags'] ?? array() );

		$record['created_at'] = $created;
		$record['label']      = $label;
		$record['note']       = $note;
		$record['tags']       = $tags;
		$record['size']       = (int) ( $record['size'] ?? 0 );
		$record['components'] = is_array( $record['components'] ?? null )
			? array_values( array_map( 'sanitize_key', $record['components'] ) )
			: array();
		$record['trigger']    = sanitize_key( (string) ( $record['trigger'] ?? 'manual' ) );

		if ( $for_display ) {
			$record['display_label']    = self::display_label( $record );
			$record['created_at_label'] = self::stamp_label( $created );
		}

		return $record;
	}

	/**
	 * @param list<array<string, mixed>> $catalog
	 */
	private static function save_catalog( array $catalog ): void {
		$clean = array();
		foreach ( $catalog as $item ) {
			if ( ! is_array( $item ) || empty( $item['id'] ) || empty( $item['file'] ) ) {
				continue;
			}
			unset( $item['exists'], $item['display_label'], $item['created_at_label'] );
			$item['label'] = sanitize_text_field( (string) ( $item['label'] ?? '' ) );
			$item['note']  = sanitize_textarea_field( (string) ( $item['note'] ?? '' ) );
			$item['tags']  = self::sanitize_tags( $item['tags'] ?? array() );
			$clean[]       = $item;
		}
		update_option( self::CATALOG_OPTION, $clean, false );
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Performance;

use WP_Error;

/**
 * Image optimization: editor engine, quality, modern formats, regenerate.
 */
final class Images {
	public const META_VARIANTS = '_kpf_image_variants';
	public const META_STATS    = '_kpf_image_optimize';

	public static function register(): void {
		add_action( 'init', array( self::class, 'boot' ), 25 );
	}

	public static function boot(): void {
		$media = Settings::get()['media'] ?? array();
		if ( empty( $media['enabled'] ) ) {
			return;
		}

		add_filter( 'wp_image_editors', array( self::class, 'filter_editors' ) );
		add_filter( 'jpeg_quality', array( self::class, 'filter_quality' ), 20, 2 );
		add_filter( 'wp_editor_set_quality', array( self::class, 'filter_quality' ), 20, 2 );
		add_filter( 'big_image_size_threshold', array( self::class, 'filter_big_image_threshold' ), 20 );

		if ( ! empty( $media['optimize_on_upload'] ) ) {
			add_filter( 'wp_handle_upload', array( self::class, 'optimize_upload' ), 20 );
			add_filter( 'wp_generate_attachment_metadata', array( self::class, 'after_generate_metadata' ), 20, 2 );
		}
	}

	/**
	 * @return array{
	 *   imagick:bool,
	 *   gd:bool,
	 *   webp:bool,
	 *   avif:bool,
	 *   active_editor:string,
	 *   recommended_quality:int
	 * }
	 */
	public static function capabilities(): array {
		$editors = array();
		if ( class_exists( 'Imagick', false ) || extension_loaded( 'imagick' ) ) {
			$editors[] = 'WP_Image_Editor_Imagick';
		}
		if ( function_exists( 'imagecreatetruecolor' ) ) {
			$editors[] = 'WP_Image_Editor_GD';
		}

		$webp = false;
		$avif = false;
		if ( class_exists( 'Imagick', false ) ) {
			try {
				$formats = array_map( 'strtoupper', \Imagick::queryFormats() );
				$webp    = in_array( 'WEBP', $formats, true );
				$avif    = in_array( 'AVIF', $formats, true );
			} catch ( \Throwable $e ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
			}
		}
		if ( function_exists( 'imagewebp' ) ) {
			$webp = true;
		}
		if ( function_exists( 'imageavif' ) ) {
			$avif = true;
		}

		$active = '';
		if ( function_exists( '_wp_image_editor_choose' ) ) {
			$chosen = _wp_image_editor_choose();
			$active = is_string( $chosen ) ? $chosen : '';
		}

		return array(
			'imagick'             => class_exists( 'Imagick', false ) || extension_loaded( 'imagick' ),
			'gd'                  => function_exists( 'imagecreatetruecolor' ),
			'webp'                => $webp,
			'avif'                => $avif,
			'active_editor'       => $active,
			'recommended_quality' => 85,
			'attachment_count'    => self::count_images(),
		);
	}

	/**
	 * @param array<int, string> $editors
	 * @return array<int, string>
	 */
	public static function filter_editors( array $editors ): array {
		$engine = (string) ( Settings::get()['media']['editor_engine'] ?? 'auto' );

		if ( 'imagick' === $engine ) {
			return array( 'WP_Image_Editor_Imagick', 'WP_Image_Editor_GD' );
		}
		if ( 'gd' === $engine ) {
			return array( 'WP_Image_Editor_GD', 'WP_Image_Editor_Imagick' );
		}

		// Prefer ImageMagick when available.
		return array( 'WP_Image_Editor_Imagick', 'WP_Image_Editor_GD' );
	}

	/**
	 * @param int    $quality
	 * @param string $context
	 */
	public static function filter_quality( $quality, $context = '' ): int {
		$media = Settings::get()['media'] ?? array();
		if ( empty( $media['enabled'] ) ) {
			return (int) $quality;
		}

		return self::clamp_quality( $media['quality'] ?? 85 );
	}

	/**
	 * @param int|false $threshold
	 * @return int|false
	 */
	public static function filter_big_image_threshold( $threshold ) {
		$media = Settings::get()['media'] ?? array();
		if ( empty( $media['enabled'] ) ) {
			return $threshold;
		}

		$value = absint( $media['big_image_threshold'] ?? 2560 );
		return $value > 0 ? $value : false;
	}

	/**
	 * Compress / resize the original file right after upload.
	 *
	 * @param array<string, mixed> $upload
	 * @return array<string, mixed>
	 */
	public static function optimize_upload( array $upload ): array {
		if ( ! empty( $upload['error'] ) || empty( $upload['file'] ) || empty( $upload['type'] ) ) {
			return $upload;
		}

		if ( ! self::is_optimizable_mime( (string) $upload['type'] ) ) {
			return $upload;
		}

		$result = self::optimize_file( (string) $upload['file'], (string) $upload['type'] );
		if ( is_wp_error( $result ) ) {
			return $upload;
		}

		return $upload;
	}

	/**
	 * @param array<string, mixed> $metadata
	 * @return array<string, mixed>
	 */
	public static function after_generate_metadata( array $metadata, int $attachment_id ): array {
		$media = Settings::get()['media'] ?? array();
		if ( empty( $media['enabled'] ) ) {
			return $metadata;
		}

		self::generate_variants( $attachment_id, $metadata );

		return $metadata;
	}

	/**
	 * @return array{ok:bool,message:string,variants?:int}|WP_Error
	 */
	public static function regenerate_attachment( int $attachment_id ) {
		if ( ! function_exists( 'wp_generate_attachment_metadata' ) ) {
			require_once ABSPATH . 'wp-admin/includes/image.php';
		}

		$file = get_attached_file( $attachment_id );
		if ( ! $file || ! file_exists( $file ) ) {
			return new WP_Error( 'kpf_missing_file', __( 'Attachment file not found.', 'kpf-core' ) );
		}

		$mime = (string) get_post_mime_type( $attachment_id );
		if ( self::is_optimizable_mime( $mime ) ) {
			self::optimize_file( $file, $mime );
		}

		$metadata = wp_generate_attachment_metadata( $attachment_id, $file );
		if ( ! is_array( $metadata ) || $metadata === array() ) {
			return new WP_Error( 'kpf_regenerate_failed', __( 'Could not regenerate image sizes.', 'kpf-core' ) );
		}

		wp_update_attachment_metadata( $attachment_id, $metadata );
		$variants = self::generate_variants( $attachment_id, $metadata );

		return array(
			'ok'       => true,
			'message'  => __( 'Thumbnails regenerated.', 'kpf-core' ),
			'variants' => $variants,
		);
	}

	/**
	 * @return array{processed:int,total:int,done:bool,errors:array<int,string>}
	 */
	public static function regenerate_batch( int $offset = 0, int $limit = 10 ): array {
		$ids   = self::image_attachment_ids();
		$total = count( $ids );
		$slice = array_slice( $ids, max( 0, $offset ), max( 1, min( 50, $limit ) ) );
		$errors = array();
		$processed = 0;

		foreach ( $slice as $id ) {
			$result = self::regenerate_attachment( (int) $id );
			++$processed;
			if ( is_wp_error( $result ) ) {
				$errors[ (int) $id ] = $result->get_error_message();
			}
		}

		$next = $offset + $processed;

		return array(
			'processed' => $processed,
			'offset'    => $next,
			'total'     => $total,
			'done'      => $next >= $total,
			'errors'    => $errors,
		);
	}

	/**
	 * @param array<string, mixed> $metadata
	 */
	public static function generate_variants( int $attachment_id, array $metadata ): int {
		$media = Settings::get()['media'] ?? array();
		$want_webp = ! empty( $media['generate_webp'] ) || ! empty( $media['prefer_webp'] );
		$want_avif = ! empty( $media['generate_avif'] ) || ! empty( $media['prefer_avif'] );
		$caps      = self::capabilities();

		if ( ! $want_webp && ! $want_avif ) {
			return 0;
		}

		$uploads = wp_get_upload_dir();
		$base_dir = trailingslashit( (string) ( $uploads['basedir'] ?? '' ) );
		$file     = get_attached_file( $attachment_id );
		if ( ! $file || ! file_exists( $file ) ) {
			return 0;
		}

		$relative_dir = '';
		if ( ! empty( $metadata['file'] ) ) {
			$relative_dir = trailingslashit( dirname( (string) $metadata['file'] ) );
		}

		$sources = array( 'full' => $file );
		if ( ! empty( $metadata['sizes'] ) && is_array( $metadata['sizes'] ) ) {
			foreach ( $metadata['sizes'] as $size => $info ) {
				if ( empty( $info['file'] ) ) {
					continue;
				}
				$path = $base_dir . $relative_dir . $info['file'];
				if ( file_exists( $path ) ) {
					$sources[ (string) $size ] = $path;
				}
			}
		}

		$quality  = self::clamp_quality( $media['quality'] ?? 85 );
		$variants = array();
		$count    = 0;

		foreach ( $sources as $size => $path ) {
			$row = array();
			if ( $want_webp && ! empty( $caps['webp'] ) ) {
				$out = self::convert_to_format( $path, 'webp', $quality );
				if ( $out ) {
					$row['webp'] = self::path_to_relative( $out, $base_dir );
					++$count;
				}
			}
			if ( $want_avif && ! empty( $caps['avif'] ) ) {
				$out = self::convert_to_format( $path, 'avif', $quality );
				if ( $out ) {
					$row['avif'] = self::path_to_relative( $out, $base_dir );
					++$count;
				}
			}
			if ( $row !== array() ) {
				$variants[ $size ] = $row;
			}
		}

		if ( $variants !== array() ) {
			update_post_meta( $attachment_id, self::META_VARIANTS, $variants );
		}

		update_post_meta(
			$attachment_id,
			self::META_STATS,
			array(
				'quality'   => $quality,
				'engine'    => (string) ( $media['editor_engine'] ?? 'auto' ),
				'variants'  => $count,
				'optimized' => time(),
			)
		);

		return $count;
	}

	/**
	 * @return true|WP_Error
	 */
	public static function optimize_file( string $file, string $mime ) {
		if ( ! file_exists( $file ) || ! self::is_optimizable_mime( $mime ) ) {
			return true;
		}

		$media   = Settings::get()['media'] ?? array();
		$quality = self::clamp_quality( $media['quality'] ?? 85 );
		$max_w   = absint( $media['max_width'] ?? 0 );
		$max_h   = absint( $media['max_height'] ?? 0 );

		$editor = wp_get_image_editor( $file );
		if ( is_wp_error( $editor ) ) {
			return $editor;
		}

		$size = $editor->get_size();
		$w    = (int) ( $size['width'] ?? 0 );
		$h    = (int) ( $size['height'] ?? 0 );

		if ( ( $max_w > 0 && $w > $max_w ) || ( $max_h > 0 && $h > $max_h ) ) {
			$editor->resize(
				$max_w > 0 ? $max_w : null,
				$max_h > 0 ? $max_h : null,
				false
			);
		}

		$editor->set_quality( $quality );

		if ( ! empty( $media['strip_exif'] ) && method_exists( $editor, 'strip_image' ) ) {
			// Imagick editor supports strip via save options in some WP versions.
		}

		$saved = $editor->save( $file );
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}

		if ( ! empty( $media['strip_exif'] ) ) {
			self::strip_exif_file( $file );
		}

		return true;
	}

	public static function strip_exif_file( string $file ): void {
		if ( ! class_exists( 'Imagick', false ) || ! file_exists( $file ) ) {
			return;
		}

		try {
			$image = new \Imagick( $file );
			$image->stripImage();
			$image->writeImage( $file );
			$image->clear();
			$image->destroy();
		} catch ( \Throwable $e ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
		}
	}

	/**
	 * @return string|null Absolute path of converted file.
	 */
	public static function convert_to_format( string $source, string $format, int $quality ): ?string {
		$format = strtolower( $format );
		if ( ! in_array( $format, array( 'webp', 'avif' ), true ) || ! file_exists( $source ) ) {
			return null;
		}

		$dest = preg_replace( '/\.[^.]+$/', '.' . $format, $source );
		if ( ! is_string( $dest ) || $dest === $source ) {
			$dest = $source . '.' . $format;
		}

		if ( class_exists( 'Imagick', false ) ) {
			try {
				$image = new \Imagick( $source );
				$image->setImageFormat( $format );
				$image->setImageCompressionQuality( $quality );
				$image->stripImage();
				$image->writeImage( $dest );
				$image->clear();
				$image->destroy();
				return file_exists( $dest ) ? $dest : null;
			} catch ( \Throwable $e ) {
				// Fall through to GD.
			}
		}

		$info = @getimagesize( $source ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( ! is_array( $info ) ) {
			return null;
		}

		$mime = $info['mime'] ?? '';
		$src_image = null;
		if ( 'image/jpeg' === $mime ) {
			$src_image = @imagecreatefromjpeg( $source ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		} elseif ( 'image/png' === $mime ) {
			$src_image = @imagecreatefrompng( $source ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		} elseif ( 'image/webp' === $mime && function_exists( 'imagecreatefromwebp' ) ) {
			$src_image = @imagecreatefromwebp( $source ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}

		if ( ! $src_image ) {
			return null;
		}

		$ok = false;
		if ( 'webp' === $format && function_exists( 'imagewebp' ) ) {
			$ok = @imagewebp( $src_image, $dest, $quality ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		} elseif ( 'avif' === $format && function_exists( 'imageavif' ) ) {
			$ok = @imageavif( $src_image, $dest, $quality ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}

		imagedestroy( $src_image );

		return $ok && file_exists( $dest ) ? $dest : null;
	}

	public static function is_optimizable_mime( string $mime ): bool {
		return in_array(
			strtolower( $mime ),
			array( 'image/jpeg', 'image/jpg', 'image/png', 'image/webp' ),
			true
		);
	}

	public static function clamp_quality( $value ): int {
		return max( 0, min( 100, absint( $value ) ) );
	}

	/**
	 * @return array<int, int>
	 */
	public static function image_attachment_ids(): array {
		$query = new \WP_Query(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'post_mime_type' => array( 'image/jpeg', 'image/png', 'image/webp', 'image/jpg' ),
			)
		);

		return array_map( 'intval', $query->posts );
	}

	public static function count_images(): int {
		return count( self::image_attachment_ids() );
	}

	private static function path_to_relative( string $absolute, string $basedir ): string {
		$basedir = trailingslashit( $basedir );
		if ( str_starts_with( $absolute, $basedir ) ) {
			return ltrim( substr( $absolute, strlen( $basedir ) ), '/' );
		}
		return basename( $absolute );
	}
}

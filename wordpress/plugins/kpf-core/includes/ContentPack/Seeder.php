<?php

declare(strict_types=1);

namespace KPF\Core\ContentPack;

use KPF\Core\Events\ContentType as EventType;
use KPF\Core\Events\Meta as EventMeta;
use KPF\Core\Forms\ContentType as FormType;
use KPF\Core\Forms\Definition as FormDefinition;
use KPF\Core\Forms\Meta as FormMeta;
use KPF\Core\Grantees\ContentType as GranteeType;
use KPF\Core\Grantees\Meta as GranteeMeta;
use KPF\Core\Grants\ContentType as GrantType;
use KPF\Core\Grants\Meta as GrantMeta;
use KPF\Core\Kevin\ContentType as KevinType;
use KPF\Core\Scrapbook\ContentType as ScrapbookType;
use KPF\Core\Scrapbook\Meta as ScrapbookMeta;

/**
 * Seeds published library content from data/content-pack when a site is empty
 * (fresh InstaWP / staging). Existing posts are left alone.
 */
final class Seeder {
	public static function register(): void {
		add_action( 'init', array( self::class, 'maybe_seed' ), 40 );
	}

	public static function maybe_seed(): void {
		if ( wp_installing() ) {
			return;
		}
		$pack = self::pack();
		if ( ! $pack ) {
			return;
		}
		if ( get_transient( 'kpf_content_pack_seeding' ) ) {
			return;
		}

		$needed = self::missing_types( $pack );
		if ( ! $needed ) {
			return;
		}

		set_transient( 'kpf_content_pack_seeding', 1, 5 * MINUTE_IN_SECONDS );
		try {
			self::import( $pack, $needed );
		} finally {
			delete_transient( 'kpf_content_pack_seeding' );
		}
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public static function pack(): ?array {
		$path = KPF_CORE_PATH . 'data/content-pack/manifest.json';
		if ( ! is_readable( $path ) ) {
			return null;
		}
		$decoded = json_decode( (string) file_get_contents( $path ), true );
		return is_array( $decoded ) ? $decoded : null;
	}

	/**
	 * @param array<string, mixed> $pack
	 * @return array<int, string>
	 */
	private static function missing_types( array $pack ): array {
		$needed = array();
		if ( ! empty( $pack['forms'] ) && ! FormDefinition::find_by_slug( 'contact' ) ) {
			$needed[] = 'forms';
		}
		if ( ! empty( $pack['grantees'] ) && self::count_type( GranteeType::POST_TYPE ) < 1 ) {
			$needed[] = 'grantees';
		}
		if ( ! empty( $pack['grants'] ) && self::count_type( GrantType::POST_TYPE ) < 1 ) {
			$needed[] = 'grants';
		}
		if ( ! empty( $pack['scrapbook'] ) && self::count_type( ScrapbookType::POST_TYPE ) < 1 ) {
			$needed[] = 'scrapbook';
		}
		if ( ! empty( $pack['kevin'] ) && self::count_type( KevinType::POST_TYPE ) < 1 ) {
			$needed[] = 'kevin';
		}
		if ( ! empty( $pack['hosts'] ) && taxonomy_exists( EventType::HOST_TAXONOMY ) && self::count_hosts() < 1 ) {
			$needed[] = 'hosts';
		}
		if ( ! empty( $pack['events'] ) && self::count_type( EventType::POST_TYPE ) < 1 ) {
			$needed[] = 'events';
		}
		if ( ! empty( $pack['posts'] ) && self::count_type( 'post' ) < 1 ) {
			$needed[] = 'posts';
		}
		return $needed;
	}

	/**
	 * @param array<string, mixed> $pack
	 * @param array<int, string>   $needed
	 */
	private static function import( array $pack, array $needed ): void {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$media   = is_array( $pack['media'] ?? null ) ? $pack['media'] : array();
		$cache   = array();
		$grantee = array();
		$hosts   = array();

		if ( in_array( 'forms', $needed, true ) ) {
			foreach ( (array) $pack['forms'] as $row ) {
				self::import_form( is_array( $row ) ? $row : array() );
			}
		}
		if ( in_array( 'grantees', $needed, true ) ) {
			foreach ( (array) $pack['grantees'] as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$id = self::import_grantee( $row, $media, $cache );
				if ( $id && ! empty( $row['slug'] ) ) {
					$grantee[ (string) $row['slug'] ] = $id;
				}
			}
		} else {
			foreach ( get_posts( array( 'post_type' => GranteeType::POST_TYPE, 'post_status' => 'any', 'posts_per_page' => -1 ) ) as $post ) {
				$grantee[ $post->post_name ] = (int) $post->ID;
			}
		}
		if ( in_array( 'grants', $needed, true ) ) {
			foreach ( (array) $pack['grants'] as $row ) {
				if ( is_array( $row ) ) {
					self::import_grant( $row, $grantee, $media, $cache );
				}
			}
		}
		if ( in_array( 'scrapbook', $needed, true ) ) {
			foreach ( (array) $pack['scrapbook'] as $row ) {
				if ( is_array( $row ) ) {
					self::import_scrapbook( $row, $media, $cache );
				}
			}
		}
		if ( in_array( 'kevin', $needed, true ) ) {
			foreach ( (array) $pack['kevin'] as $row ) {
				if ( is_array( $row ) ) {
					self::import_kevin( $row, $media, $cache );
				}
			}
		}
		if ( in_array( 'hosts', $needed, true ) ) {
			foreach ( (array) $pack['hosts'] as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$id = self::import_host( $row, $media, $cache );
				if ( $id && ! empty( $row['slug'] ) ) {
					$hosts[ (string) $row['slug'] ] = $id;
				}
			}
		} elseif ( taxonomy_exists( EventType::HOST_TAXONOMY ) ) {
			$terms = get_terms( array( 'taxonomy' => EventType::HOST_TAXONOMY, 'hide_empty' => false ) );
			if ( ! is_wp_error( $terms ) ) {
				foreach ( $terms as $term ) {
					$hosts[ $term->slug ] = (int) $term->term_id;
				}
			}
		}
		if ( in_array( 'events', $needed, true ) ) {
			foreach ( (array) $pack['events'] as $row ) {
				if ( is_array( $row ) ) {
					self::import_event( $row, $hosts, $media, $cache );
				}
			}
		}
		if ( in_array( 'posts', $needed, true ) ) {
			foreach ( (array) $pack['posts'] as $row ) {
				if ( is_array( $row ) ) {
					self::import_post( $row, $media, $cache );
				}
			}
		}
	}

	/**
	 * @param array<string, mixed> $row
	 */
	private static function import_form( array $row ): void {
		$slug = sanitize_title( (string) ( $row['slug'] ?? 'contact' ) );
		if ( FormDefinition::find_by_slug( $slug ) ) {
			return;
		}
		$id = wp_insert_post(
			array(
				'post_type'   => FormType::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => sanitize_text_field( (string) ( $row['title'] ?? 'Contact' ) ),
				'post_name'   => $slug,
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return;
		}
		FormMeta::update( (int) $id, is_array( $row['definition'] ?? null ) ? $row['definition'] : array() );
	}

	/**
	 * @param array<string, mixed>             $row
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                  $cache
	 */
	private static function import_grantee( array $row, array $media, array &$cache ): int {
		$id = wp_insert_post(
			array(
				'post_type'    => GranteeType::POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => sanitize_text_field( (string) ( $row['title'] ?? '' ) ),
				'post_name'    => sanitize_title( (string) ( $row['slug'] ?? '' ) ),
				'post_content' => wp_kses_post( (string) ( $row['content'] ?? '' ) ),
				'menu_order'   => (int) ( $row['menu_order'] ?? 0 ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return 0;
		}
		update_post_meta( (int) $id, GranteeMeta::META_KEY, GranteeMeta::sanitize( $row['meta'] ?? array() ) );
		$thumb = self::attachment( $media, (int) ( $row['thumbnail_id'] ?? 0 ), $cache );
		if ( $thumb ) {
			set_post_thumbnail( (int) $id, $thumb );
		}
		return (int) $id;
	}

	/**
	 * @param array<string, mixed>                    $row
	 * @param array<string, int>                      $grantees
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                         $cache
	 */
	private static function import_grant( array $row, array $grantees, array $media, array &$cache ): void {
		$meta              = is_array( $row['meta'] ?? null ) ? $row['meta'] : array();
		$grantee_slug      = sanitize_title( (string) ( $row['grantee_slug'] ?? '' ) );
		$meta['grantee_id'] = (int) ( $grantees[ $grantee_slug ] ?? 0 );
		$meta['check_photo_id'] = self::attachment( $media, (int) ( $meta['check_photo_id'] ?? 0 ), $cache );

		$id = wp_insert_post(
			array(
				'post_type'   => GrantType::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => sanitize_text_field( (string) ( $row['title'] ?? '' ) ),
				'post_name'   => sanitize_title( (string) ( $row['slug'] ?? '' ) ),
				'menu_order'  => (int) ( $row['menu_order'] ?? 0 ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return;
		}
		GrantMeta::save( (int) $id, $meta );
		$thumb = self::attachment( $media, (int) ( $row['thumbnail_id'] ?? 0 ), $cache );
		if ( $thumb ) {
			set_post_thumbnail( (int) $id, $thumb );
		}
	}

	/**
	 * @param array<string, mixed>                    $row
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                         $cache
	 */
	private static function import_scrapbook( array $row, array $media, array &$cache ): void {
		$meta   = is_array( $row['meta'] ?? null ) ? $row['meta'] : array();
		$images = array();
		foreach ( (array) ( $meta['images'] ?? array() ) as $image ) {
			if ( ! is_array( $image ) ) {
				continue;
			}
			$attachment = self::attachment( $media, (int) ( $image['attachment_id'] ?? 0 ), $cache );
			if ( $attachment < 1 ) {
				continue;
			}
			$image['attachment_id'] = $attachment;
			$images[]               = $image;
		}
		$meta['images'] = $images;

		$id = wp_insert_post(
			array(
				'post_type'    => ScrapbookType::POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => sanitize_text_field( (string) ( $row['title'] ?? '' ) ),
				'post_name'    => sanitize_title( (string) ( $row['slug'] ?? '' ) ),
				'post_content' => wp_kses_post( (string) ( $row['content'] ?? '' ) ),
				'menu_order'   => (int) ( $row['menu_order'] ?? 0 ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return;
		}
		update_post_meta( (int) $id, ScrapbookMeta::META_KEY, ScrapbookMeta::sanitize( $meta ) );
		$thumb = self::attachment( $media, (int) ( $row['thumbnail_id'] ?? 0 ), $cache );
		if ( ! $thumb && ! empty( $images[0]['attachment_id'] ) ) {
			$thumb = (int) $images[0]['attachment_id'];
		}
		if ( $thumb ) {
			set_post_thumbnail( (int) $id, $thumb );
		}
	}

	/**
	 * @param array<string, mixed>                    $row
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                         $cache
	 */
	private static function import_kevin( array $row, array $media, array &$cache ): void {
		$id = wp_insert_post(
			array(
				'post_type'    => KevinType::POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => sanitize_text_field( (string) ( $row['title'] ?? '' ) ),
				'post_name'    => sanitize_title( (string) ( $row['slug'] ?? '' ) ),
				'post_content' => wp_kses_post( (string) ( $row['content'] ?? '' ) ),
				'menu_order'   => (int) ( $row['menu_order'] ?? 0 ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return;
		}
		$thumb = self::attachment( $media, (int) ( $row['thumbnail_id'] ?? 0 ), $cache );
		if ( $thumb ) {
			set_post_thumbnail( (int) $id, $thumb );
		}
	}

	/**
	 * @param array<string, mixed>                    $row
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                         $cache
	 */
	private static function import_host( array $row, array $media, array &$cache ): int {
		$slug = sanitize_title( (string) ( $row['slug'] ?? '' ) );
		if ( '' === $slug || ! taxonomy_exists( EventType::HOST_TAXONOMY ) ) {
			return 0;
		}
		$existing = get_term_by( 'slug', $slug, EventType::HOST_TAXONOMY );
		if ( $existing && ! is_wp_error( $existing ) ) {
			return (int) $existing->term_id;
		}
		$created = wp_insert_term(
			sanitize_text_field( (string) ( $row['name'] ?? $slug ) ),
			EventType::HOST_TAXONOMY,
			array(
				'slug'        => $slug,
				'description' => wp_kses_post( (string) ( $row['description'] ?? '' ) ),
			)
		);
		if ( is_wp_error( $created ) ) {
			return 0;
		}
		$term_id = (int) $created['term_id'];
		$logo    = self::attachment( $media, (int) ( $row['logo_id'] ?? 0 ), $cache );
		if ( $logo ) {
			update_term_meta( $term_id, EventType::HOST_LOGO_META, $logo );
		}
		return $term_id;
	}

	/**
	 * @param array<string, mixed>                    $row
	 * @param array<string, int>                      $hosts
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                         $cache
	 */
	private static function import_event( array $row, array $hosts, array $media, array &$cache ): void {
		$meta = is_array( $row['meta'] ?? null ) ? $row['meta'] : array();
		$ids  = array();
		foreach ( (array) ( $row['host_slugs'] ?? array() ) as $slug ) {
			$slug = sanitize_title( (string) $slug );
			if ( isset( $hosts[ $slug ] ) ) {
				$ids[] = (int) $hosts[ $slug ];
			}
		}
		$meta['host_term_ids'] = $ids;

		$id = wp_insert_post(
			array(
				'post_type'    => EventType::POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => sanitize_text_field( (string) ( $row['title'] ?? '' ) ),
				'post_name'    => sanitize_title( (string) ( $row['slug'] ?? '' ) ),
				'post_content' => wp_kses_post( (string) ( $row['content'] ?? '' ) ),
				'menu_order'   => (int) ( $row['menu_order'] ?? 0 ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return;
		}
		update_post_meta( (int) $id, EventMeta::META_KEY, EventMeta::sanitize( $meta ) );
		$thumb = self::attachment( $media, (int) ( $row['thumbnail_id'] ?? 0 ), $cache );
		if ( $thumb ) {
			set_post_thumbnail( (int) $id, $thumb );
		}
		wp_set_object_terms( (int) $id, $ids, EventType::HOST_TAXONOMY, false );
	}

	/**
	 * @param array<string, mixed>                    $row
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                         $cache
	 */
	private static function import_post( array $row, array $media, array &$cache ): void {
		$id = wp_insert_post(
			array(
				'post_type'    => 'post',
				'post_status'  => 'publish',
				'post_title'   => sanitize_text_field( (string) ( $row['title'] ?? '' ) ),
				'post_name'    => sanitize_title( (string) ( $row['slug'] ?? '' ) ),
				'post_content' => wp_kses_post( (string) ( $row['content'] ?? '' ) ),
				'post_excerpt' => sanitize_textarea_field( (string) ( $row['excerpt'] ?? '' ) ),
				'post_date'    => sanitize_text_field( (string) ( $row['date'] ?? '' ) ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return;
		}
		$thumb = self::attachment( $media, (int) ( $row['thumbnail_id'] ?? 0 ), $cache );
		if ( $thumb ) {
			set_post_thumbnail( (int) $id, $thumb );
		}
	}

	/**
	 * @param array<int|string, array<string, mixed>> $media
	 * @param array<int, int>                         $cache
	 */
	private static function attachment( array $media, int $old_id, array &$cache ): int {
		if ( $old_id < 1 ) {
			return 0;
		}
		if ( isset( $cache[ $old_id ] ) ) {
			return $cache[ $old_id ];
		}
		$info = $media[ (string) $old_id ] ?? $media[ $old_id ] ?? null;
		if ( ! is_array( $info ) || empty( $info['file'] ) ) {
			return 0;
		}
		$source = KPF_CORE_PATH . 'data/content-pack/media/' . basename( (string) $info['file'] );
		if ( ! is_readable( $source ) ) {
			return 0;
		}

		$tmp = wp_tempnam( basename( $source ) );
		if ( ! $tmp || ! copy( $source, $tmp ) ) {
			return 0;
		}

		$file = array(
			'name'     => basename( (string) $info['file'] ),
			'tmp_name' => $tmp,
			'error'    => 0,
			'size'     => filesize( $tmp ) ?: 0,
		);
		$id   = media_handle_sideload(
			$file,
			0,
			sanitize_text_field( (string) ( $info['title'] ?? '' ) )
		);
		if ( is_wp_error( $id ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			return 0;
		}
		$alt = sanitize_text_field( (string) ( $info['alt'] ?? '' ) );
		if ( '' !== $alt ) {
			update_post_meta( (int) $id, '_wp_attachment_image_alt', $alt );
		}
		$cache[ $old_id ] = (int) $id;
		return (int) $id;
	}

	private static function count_type( string $type ): int {
		if ( ! post_type_exists( $type ) ) {
			return 0;
		}
		$q = new \WP_Query(
			array(
				'post_type'      => $type,
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => false,
			)
		);
		return (int) $q->found_posts;
	}

	private static function count_hosts(): int {
		$terms = get_terms(
			array(
				'taxonomy'   => EventType::HOST_TAXONOMY,
				'hide_empty' => false,
				'number'     => 1,
			)
		);
		return is_wp_error( $terms ) ? 0 : count( $terms );
	}
}

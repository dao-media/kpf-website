<?php

declare(strict_types=1);

namespace KPF\Core\Scaffold;

/**
 * Named media attachments for Faust page scaffolds (Home / About / Events / Contact).
 * Keys are stable; attachment IDs are resolved from the Media Library by filename.
 */
final class Media {
	public const OPTION = 'kpf_scaffold_media_ids';

	/**
	 * @return array<string, string> key => expected attachment basename
	 */
	public static function catalog(): array {
		return array(
			'home.hero'           => 'hero.jpg',
			'home.kevin'          => 'kevin.jpg',
			'home.kevinDad'       => 'kevin-with-dad.png',
			'home.kevinRunner'    => 'kevin-runner.png',
			'home.kevinAlumni'    => 'kevin-alumni.png',
			'home.kevinDoubleExposure' => 'kevin-double-exposure.png',
			'home.programs'       => 'programs.jpg',
			'home.dunes'          => 'dunes.png',
			'home.programsCollageBeach' => 'programs-collage-beach.jpg',
			'home.programsCollageBbq'   => 'programs-collage-bbq.jpg',
			'about.tampaBay'      => 'tampa-bay.png',
			'about.heroFrame'     => 'hero-frame.png',
			'about.historyFront'  => 'history-front.png',
			'about.history1'      => 'history-1.png',
			'about.history2'      => 'history-2.png',
			'about.historyBack'   => 'history-back.png',
			'about.galleryFeatured' => 'Beach_wheelchair.png',
			'about.heroBeach'     => '2_transparent.webp',
			'events.hero'         => 'hero.jpg', // WP may rename duplicate → hero-1.jpg
			'events.featured'     => 'featured.jpg',
			'events.featured1'    => 'featured-1.jpg',
			'events.featured2'    => 'featured-2.jpg',
			'events.featured3'    => 'featured-3.jpg',
			'events.featured4'    => 'featured-4.jpg',
			'events.library1'     => 'library-1.jpg',
			'events.cardMark'     => '50-badge.png',
			'partners.freedom'    => 'Freedom_Riding_Academy.jpg',
			'partners.warriors'   => 'My_Warriors_Place.jpg',
			'partners.dunes'      => 'Other_Side_of_the_Dunes.jpg',
			'partners.stano'      => 'The_Stano_Foundation.png',
			'partners.relief'     => 'Wounded_Veterans_Relief_Fund.jpg',
			'partners.ranch'      => 'Wounded_Warriors_Abilities_Ranch.webp',
			'cigar.image'         => 'Cigar.png',
			'cigar.smoke'         => 'smoke.mp4',
			'cta.flag'            => 'kpf-flag.mp4',
		);
	}

	/**
	 * Fallback basenames when WP did not rename duplicates.
	 *
	 * @return array<string, list<string>>
	 */
	public static function filename_aliases(): array {
		return array(
			'home.kevinDoubleExposure' => array( 'kevin-double-exposure.webp', 'kevin-double-exposure.png' ),
			'events.hero'  => array( 'hero-1.jpg', 'hero.jpg', 'hero.webp' ),
			'events.featured1' => array( 'featured-1.webp', 'featured-1.jpg' ),
			'events.featured2' => array( 'featured-2.webp', 'featured-2.jpg' ),
			'events.featured3' => array( 'featured-3.webp', 'featured-3.jpg' ),
			'events.featured4' => array( 'featured-4.webp', 'featured-4.jpg' ),
			'events.cardMark' => array( '50-badge.png', 'brandmark.png' ),
			'about.galleryFeatured' => array( 'Beach_wheelchair.png', 'Beach wheelchair.png' ),
			'about.heroBeach' => array( '2_transparent.webp', '2_transparent.png' ),
			'cigar.image' => array( 'Cigar.png', 'cigar.png' ),
			'cigar.smoke' => array( 'smoke.mp4', 'smoke.webm' ),
			'cta.flag' => array( 'kpf-flag.mp4', 'flag.mp4' ),
		);
	}

	/**
	 * @param list<string> $basenames
	 */
	public static function find_id( array $basenames ): int {
		return self::find_attachment_id( $basenames );
	}

	public static function register(): void {
		// Intentionally empty — GraphQL registers separately; option filled by seed.
	}

	/**
	 * @return array<string, int>
	 */
	public static function id_map(): array {
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();
		$out    = array();

		foreach ( self::catalog() as $key => $basename ) {
			$id = absint( $stored[ $key ] ?? 0 );
			if ( $id > 0 && get_post( $id ) ) {
				$out[ $key ] = $id;
				continue;
			}
			$candidates = self::filename_aliases()[ $key ] ?? array( $basename );
			$found      = self::find_attachment_id( $candidates );
			if ( $found > 0 ) {
				$out[ $key ] = $found;
			}
		}

		return $out;
	}

	/**
	 * Persist discovered IDs for faster GraphQL resolves.
	 *
	 * @return array<string, int>
	 */
	public static function sync_option(): array {
		$map = self::id_map();
		update_option( self::OPTION, $map, false );
		return $map;
	}

	/**
	 * @return list<array{key: string, databaseId: int, sourceUrl: string, altText: string, title: string}>
	 */
	public static function resolve_items(): array {
		$items = array();
		foreach ( self::id_map() as $key => $id ) {
			$url = wp_get_attachment_url( $id );
			if ( ! is_string( $url ) || '' === $url ) {
				continue;
			}
			$items[] = array(
				'key'        => $key,
				'databaseId' => $id,
				'sourceUrl'  => $url,
				'altText'    => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
				'title'      => get_the_title( $id ) ?: '',
			);
		}
		return $items;
	}

	/**
	 * @param list<string> $basenames
	 */
	private static function find_attachment_id( array $basenames ): int {
		global $wpdb;

		foreach ( $basenames as $basename ) {
			$basename = sanitize_file_name( $basename );
			if ( '' === $basename ) {
				continue;
			}
			$like = '%' . $wpdb->esc_like( '/' . $basename );
			$id   = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'attachment' AND guid LIKE %s ORDER BY ID DESC LIMIT 1",
					$like
				)
			);
			if ( $id > 0 ) {
				return $id;
			}

			// Also match _wp_attached_file meta (relative path).
			$id = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file' AND meta_value LIKE %s ORDER BY post_id DESC LIMIT 1",
					'%' . $wpdb->esc_like( $basename )
				)
			);
			if ( $id > 0 ) {
				return $id;
			}
		}

		return 0;
	}
}

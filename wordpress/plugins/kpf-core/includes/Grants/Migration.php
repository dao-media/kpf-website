<?php

declare(strict_types=1);

namespace KPF\Core\Grants;

use KPF\Core\Grantees\ContentType as GranteeContentType;
use KPF\Core\Grantees\Meta as GranteeMeta;
use WP_Post;

/**
 * Split legacy kpf_grantee posts (org + award) into canonical grantees + grants.
 */
final class Migration {
	public const OPTION_KEY = 'kpf_grants_split_v1';

	public static function run(): void {
		if ( get_option( self::OPTION_KEY ) ) {
			return;
		}

		$posts = get_posts(
			array(
				'post_type'              => GranteeContentType::POST_TYPE,
				'post_status'            => array( 'publish', 'draft', 'private', 'pending' ),
				'posts_per_page'         => -1,
				'orderby'                => 'ID',
				'order'                  => 'ASC',
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		if ( empty( $posts ) ) {
			update_option( self::OPTION_KEY, gmdate( 'c' ), false );
			return;
		}

		/** @var array<string, list<WP_Post>> $groups */
		$groups = array();
		foreach ( $posts as $post ) {
			if ( ! $post instanceof WP_Post ) {
				continue;
			}
			$key = self::normalize_title( $post->post_title );
			if ( '' === $key ) {
				$key = 'id:' . $post->ID;
			}
			$groups[ $key ][] = $post;
		}

		foreach ( $groups as $group ) {
			self::migrate_group( $group );
		}

		update_option( self::OPTION_KEY, gmdate( 'c' ), false );
	}

	/**
	 * @param list<WP_Post> $group
	 */
	private static function migrate_group( array $group ): void {
		$canonical = self::pick_canonical( $group );

		// Snapshot award rows before org meta is rewritten (which drops award keys).
		$awards = array();
		foreach ( $group as $post ) {
			$legacy = get_post_meta( (int) $post->ID, GranteeMeta::META_KEY, true );
			$legacy = is_array( $legacy ) ? $legacy : array();
			$awards[] = array(
				'post'   => $post,
				'amount' => (float) ( $legacy['grant_amount'] ?? 0 ),
				'month'  => (int) ( $legacy['awarded_month'] ?? 0 ),
				'year'   => (int) ( $legacy['awarded_year'] ?? 0 ),
				'check'  => (int) ( $legacy['check_photo_id'] ?? 0 ),
			);
		}

		$org_meta = self::merge_org_meta( $group );
		update_post_meta( (int) $canonical->ID, GranteeMeta::META_KEY, $org_meta );

		$canonical_thumb = (int) get_post_thumbnail_id( $canonical->ID );
		if ( $canonical_thumb < 1 ) {
			foreach ( $group as $post ) {
				$thumb = (int) get_post_thumbnail_id( $post->ID );
				if ( $thumb > 0 ) {
					set_post_thumbnail( $canonical->ID, $thumb );
					break;
				}
			}
		}

		foreach ( $awards as $award ) {
			$amount   = $award['amount'];
			$month    = $award['month'];
			$year     = $award['year'];
			$check_id = $award['check'];
			$post     = $award['post'];

			if ( $amount <= 0 && $year < 1 && $check_id < 1 ) {
				continue;
			}

			$grant_meta = Meta::sanitize(
				array(
					'grantee_id'     => (int) $canonical->ID,
					'recipient_name' => $canonical->post_title,
					'grant_amount'   => $amount,
					'check_photo_id' => $check_id,
					'awarded_month'  => $month,
					'awarded_year'   => $year,
				)
			);

			$grant_id = wp_insert_post(
				array(
					'post_type'   => ContentType::POST_TYPE,
					'post_status' => 'publish' === $post->post_status ? 'publish' : $post->post_status,
					'post_title'  => Meta::compose_title( $grant_meta ),
				),
				true
			);

			if ( is_wp_error( $grant_id ) || $grant_id < 1 ) {
				continue;
			}

			Meta::save( (int) $grant_id, $grant_meta );
		}

		foreach ( $group as $post ) {
			if ( (int) $post->ID === (int) $canonical->ID ) {
				continue;
			}
			wp_trash_post( (int) $post->ID );
		}
	}

	/**
	 * @param list<WP_Post> $group
	 */
	private static function pick_canonical( array $group ): WP_Post {
		$best       = $group[0];
		$best_score = self::canonical_score( $best );
		foreach ( $group as $post ) {
			$score = self::canonical_score( $post );
			if ( $score > $best_score || ( $score === $best_score && $post->ID < $best->ID ) ) {
				$best       = $post;
				$best_score = $score;
			}
		}
		return $best;
	}

	private static function canonical_score( WP_Post $post ): int {
		$score = 0;
		if ( (int) get_post_thumbnail_id( $post->ID ) > 0 ) {
			$score += 8;
		}
		$meta = get_post_meta( (int) $post->ID, GranteeMeta::META_KEY, true );
		if ( ! is_array( $meta ) ) {
			return $score;
		}
		if ( ! empty( $meta['website'] ) ) {
			$score += 4;
		}
		if ( ! empty( $meta['blurb'] ) ) {
			$score += 2;
		}
		if ( ! empty( $meta['contact_name'] ) ) {
			$score += 1;
		}
		return $score;
	}

	/**
	 * @param list<WP_Post> $group
	 * @return array<string, mixed>
	 */
	private static function merge_org_meta( array $group ): array {
		$contact = '';
		$website = '';
		$blurb   = '';

		foreach ( $group as $post ) {
			$meta = get_post_meta( (int) $post->ID, GranteeMeta::META_KEY, true );
			if ( ! is_array( $meta ) ) {
				continue;
			}
			if ( '' === $contact && ! empty( $meta['contact_name'] ) ) {
				$contact = (string) $meta['contact_name'];
			}
			if ( '' === $website && ! empty( $meta['website'] ) ) {
				$website = (string) $meta['website'];
			}
			if ( '' === $blurb && ! empty( $meta['blurb'] ) ) {
				$blurb = (string) $meta['blurb'];
			}
		}

		return GranteeMeta::sanitize(
			array(
				'contact_name' => $contact,
				'website'      => $website,
				'blurb'        => $blurb,
			)
		);
	}

	private static function normalize_title( string $title ): string {
		$title = strtolower( trim( wp_strip_all_tags( $title ) ) );
		$title = preg_replace( '/\s+/', ' ', $title ) ?? $title;
		return $title;
	}
}

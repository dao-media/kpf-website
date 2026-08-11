<?php

declare(strict_types=1);

namespace KPF\Core\Grantees;

use KPF\Core\Grants\ContentType as GrantContentType;
use KPF\Core\Grants\Meta as GrantMeta;

final class GraphQL {
	private const GRAPHQL_TYPE = 'Grantee';

	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_object_type' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfGranteeDetails',
			array(
				'description' => 'Contact, website, blurb, and logo for a grantee organization.',
				'fields'      => array(
					'contactName'   => array( 'type' => 'String' ),
					'website'       => array( 'type' => 'String' ),
					'blurb'         => array( 'type' => 'String' ),
					'organization'  => array( 'type' => 'String' ),
					'logoUrl'       => array( 'type' => 'String' ),
					'logoMediaItem' => array(
						'type'    => 'MediaItem',
						'resolve' => static function ( array $details, array $args, $context ) {
							unset( $args );
							$attachment_id = (int) ( $details['logoAttachmentId'] ?? 0 );
							if ( $attachment_id < 1 || ! class_exists( '\WPGraphQL\Data\DataSource' ) ) {
								return null;
							}
							return \WPGraphQL\Data\DataSource::resolve_post_object( $attachment_id, $context );
						},
					),
				),
			)
		);

		register_graphql_object_type(
			'KpfPartnerGrantee',
			array(
				'description' => 'Public partner-slider chip for a published grantee organization (one per org).',
				'fields'      => array(
					'databaseId' => array( 'type' => 'Int' ),
					'name'       => array( 'type' => 'String' ),
					'website'    => array( 'type' => 'String' ),
					'logoUrl'    => array( 'type' => 'String' ),
					'logoAlt'    => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_field(
			self::GRAPHQL_TYPE,
			'granteeDetails',
			array(
				'type'        => 'KpfGranteeDetails',
				'description' => 'Structured grantee fields for the partners slider.',
				'resolve'     => static function ( $source ): array {
					$post_id = isset( $source->databaseId )
						? (int) $source->databaseId
						: (int) ( $source->ID ?? 0 );
					return self::details( $post_id );
				},
			)
		);

		// CPT is not publicly_queryable, so the default `grantees` connection is empty
		// for anonymous headless clients. Expose an explicit public list for chrome.
		register_graphql_field(
			'RootQuery',
			'kpfPartnerGrantees',
			array(
				'type'        => array( 'list_of' => 'KpfPartnerGrantee' ),
				'description' => 'Unique published grantee organizations for the homepage partners slider (never one row per grant).',
				'args'        => array(
					'first' => array(
						'type'        => 'Int',
						'description' => 'Max grantees to return (default 24, max 50).',
					),
				),
				'resolve'     => static function ( $source, array $args ): array {
					unset( $source );
					$first = isset( $args['first'] ) ? (int) $args['first'] : 24;
					return self::partner_list( $first );
				},
			)
		);
	}

	/**
	 * Unique grantee orgs for the partners slider.
	 * Prefer distinct recipients of published grants (so multi-grant orgs appear once),
	 * then fall back to published grantee posts with logos.
	 *
	 * @return list<array<string, mixed>>
	 */
	public static function partner_list( int $first = 24 ): array {
		$first = max( 1, min( 50, $first > 0 ? $first : 24 ) );

		$grantee_ids = self::unique_grant_recipient_ids();
		if ( empty( $grantee_ids ) ) {
			$grantee_ids = self::published_grantee_ids();
		}

		$items      = array();
		$seen_names = array();

		foreach ( $grantee_ids as $grantee_id ) {
			$chip = self::partner_chip( $grantee_id );
			if ( null === $chip ) {
				continue;
			}
			$name_key = self::normalize_name( (string) $chip['name'] );
			if ( '' !== $name_key && isset( $seen_names[ $name_key ] ) ) {
				continue;
			}
			if ( '' !== $name_key ) {
				$seen_names[ $name_key ] = true;
			}
			$items[] = $chip;
		}

		usort(
			$items,
			static function ( array $a, array $b ): int {
				return strcasecmp( (string) $a['name'], (string) $b['name'] );
			}
		);

		return array_slice( $items, 0, $first );
	}

	/**
	 * Distinct published grantee IDs referenced by published grants.
	 *
	 * @return list<int>
	 */
	private static function unique_grant_recipient_ids(): array {
		$grant_ids = get_posts(
			array(
				'post_type'              => GrantContentType::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		$ids  = array();
		$seen = array();
		foreach ( $grant_ids as $grant_id ) {
			$meta       = GrantMeta::get( (int) $grant_id );
			$grantee_id = (int) ( $meta['grantee_id'] ?? 0 );
			if ( $grantee_id < 1 || isset( $seen[ $grantee_id ] ) ) {
				continue;
			}
			if ( ContentType::POST_TYPE !== get_post_type( $grantee_id ) ) {
				continue;
			}
			if ( 'publish' !== get_post_status( $grantee_id ) ) {
				continue;
			}
			$seen[ $grantee_id ] = true;
			$ids[]               = $grantee_id;
		}

		return $ids;
	}

	/**
	 * @return list<int>
	 */
	private static function published_grantee_ids(): array {
		$ids = get_posts(
			array(
				'post_type'              => ContentType::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'orderby'                => array(
					'title' => 'ASC',
					'ID'    => 'ASC',
				),
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		return array_map( 'intval', $ids );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private static function partner_chip( int $post_id ): ?array {
		$details = self::details( $post_id );
		$logo    = (string) ( $details['logoUrl'] ?? '' );
		if ( '' === $logo ) {
			return null;
		}

		$name = html_entity_decode(
			(string) ( $details['organization'] ?: get_the_title( $post_id ) ),
			ENT_QUOTES | ENT_HTML5,
			'UTF-8'
		);
		$name = trim( $name );
		if ( '' === $name ) {
			return null;
		}

		return array(
			'databaseId' => $post_id,
			'name'       => $name,
			'website'    => (string) ( $details['website'] ?? '' ),
			'logoUrl'    => $logo,
			'logoAlt'    => html_entity_decode(
				(string) ( $details['logoAlt'] ?? '' ),
				ENT_QUOTES | ENT_HTML5,
				'UTF-8'
			),
		);
	}

	private static function normalize_name( string $name ): string {
		$name = html_entity_decode( $name, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$name = strtolower( trim( $name ) );
		$name = preg_replace( '/[^a-z0-9]+/', '', $name ) ?? '';
		return $name;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function details( int $post_id ): array {
		$meta          = Meta::get( $post_id );
		$attachment_id = (int) get_post_thumbnail_id( $post_id );
		$logo_url      = '';
		$logo_alt      = '';

		if ( $attachment_id > 0 ) {
			$logo_url = (string) (
				wp_get_attachment_image_url( $attachment_id, 'medium' )
				?: wp_get_attachment_image_url( $attachment_id, 'full' )
			);
			$logo_alt = (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
			if ( '' === $logo_alt ) {
				$logo_alt = get_the_title( $post_id ) ?: '';
			}
		}

		return array(
			'contactName'      => (string) ( $meta['contact_name'] ?? '' ),
			'website'          => (string) ( $meta['website'] ?? '' ),
			'blurb'            => (string) ( $meta['blurb'] ?? '' ),
			'organization'     => get_the_title( $post_id ) ?: '',
			'logoUrl'          => $logo_url ?: null,
			'logoAlt'          => $logo_alt,
			'logoAttachmentId' => $attachment_id,
		);
	}
}

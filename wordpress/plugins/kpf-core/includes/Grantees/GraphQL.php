<?php

declare(strict_types=1);

namespace KPF\Core\Grantees;

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
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function details( int $post_id ): array {
		$meta          = Meta::get( $post_id );
		$attachment_id = (int) get_post_thumbnail_id( $post_id );
		$logo_url      = $attachment_id > 0 ? (string) wp_get_attachment_image_url( $attachment_id, 'full' ) : '';

		return array(
			'contactName'      => (string) ( $meta['contact_name'] ?? '' ),
			'website'          => (string) ( $meta['website'] ?? '' ),
			'blurb'            => (string) ( $meta['blurb'] ?? '' ),
			'organization'     => get_the_title( $post_id ) ?: '',
			'logoUrl'          => $logo_url ?: null,
			'logoAttachmentId' => $attachment_id,
		);
	}
}

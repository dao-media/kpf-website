<?php

declare(strict_types=1);

namespace KPF\Core\Grants;

final class GraphQL {
	private const GRAPHQL_TYPE = 'Grant';

	public static function register(): void {
		add_action( 'graphql_register_types', array( self::class, 'register_types' ) );
	}

	public static function register_types(): void {
		if ( ! function_exists( 'register_graphql_object_type' ) ) {
			return;
		}

		register_graphql_object_type(
			'KpfGrantDetails',
			array(
				'description' => 'Recipient, amount, award date, and check photo for a Foundation grant.',
				'fields'      => array(
					'granteeId'           => array( 'type' => 'Int' ),
					'recipientName'       => array( 'type' => 'String' ),
					'grantAmount'         => array( 'type' => 'Float' ),
					'grantAmountLabel'    => array( 'type' => 'String' ),
					'awardedMonth'        => array( 'type' => 'Int' ),
					'awardedYear'         => array( 'type' => 'Int' ),
					'awardedLabel'        => array( 'type' => 'String' ),
					'checkPhotoUrl'       => array( 'type' => 'String' ),
					'checkPhotoMediaItem' => array(
						'type'    => 'MediaItem',
						'resolve' => static function ( array $details, array $args, $context ) {
							unset( $args );
							$attachment_id = (int) ( $details['checkPhotoAttachmentId'] ?? 0 );
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
			'KpfGrantsTotal',
			array(
				'description' => 'Sum of published KPF grant amounts (%%grants_total%% / {{grants.total}}).',
				'fields'      => array(
					'amount' => array( 'type' => 'Float' ),
					'label'  => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_field(
			self::GRAPHQL_TYPE,
			'grantDetails',
			array(
				'type'        => 'KpfGrantDetails',
				'description' => 'Structured grant fields for headless pages.',
				'resolve'     => static function ( $source ): array {
					$post_id = isset( $source->databaseId )
						? (int) $source->databaseId
						: (int) ( $source->ID ?? 0 );
					return self::details( $post_id );
				},
			)
		);

		if ( function_exists( 'register_graphql_field' ) ) {
			register_graphql_field(
				'RootQuery',
				'kpfGrantsTotal',
				array(
					'type'        => 'KpfGrantsTotal',
					'description' => 'Formatted total of published grant amounts for copy and tags.',
					'resolve'     => static fn(): array => Totals::payload(),
				)
			);
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function details( int $post_id ): array {
		$meta      = Meta::get( $post_id );
		$check_id  = (int) ( $meta['check_photo_id'] ?? 0 );
		$check_url = \KPF\Core\Media\PublicUrls::image_url( $check_id, 'full' );

		return array(
			'granteeId'              => (int) ( $meta['grantee_id'] ?? 0 ),
			'recipientName'          => (string) ( $meta['recipient_name'] ?? '' ),
			'grantAmount'            => (float) ( $meta['grant_amount'] ?? 0 ),
			'grantAmountLabel'       => Meta::format_grant_amount( $meta ),
			'awardedMonth'           => (int) ( $meta['awarded_month'] ?? 0 ),
			'awardedYear'            => (int) ( $meta['awarded_year'] ?? 0 ),
			'awardedLabel'           => Meta::format_awarded( $meta ),
			'checkPhotoUrl'          => $check_url ?: null,
			'checkPhotoAttachmentId' => $check_id,
		);
	}
}

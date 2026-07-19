<?php

declare(strict_types=1);

namespace KPF\Core\Team;

final class GraphQL {
	public static function register(): void {
		add_action('graphql_register_types', array( self::class, 'register_types' ));
	}

	public static function register_types(): void {
		if (! function_exists('register_graphql_object_type')) {
			return;
		}

		register_graphql_object_type(
			'KpfTeamSocialLink',
			array(
				'fields' => array(
					'type'  => array( 'type' => 'String' ),
					'url'   => array( 'type' => 'String' ),
					'label' => array( 'type' => 'String' ),
				),
			)
		);

		register_graphql_object_type(
			'KpfTeamDetails',
			array(
				'description' => 'Profile details for a team member.',
				'fields'      => array(
					'jobTitle'     => array( 'type' => 'String' ),
					'shortSummary' => array( 'type' => 'String' ),
					'email'        => array( 'type' => 'String' ),
					'phone'        => array( 'type' => 'String' ),
					'socialLinks'  => array( 'type' => array( 'list_of' => 'KpfTeamSocialLink' ) ),
				),
			)
		);

		register_graphql_field(
			'TeamMember',
			'teamDetails',
			array(
				'type'        => 'KpfTeamDetails',
				'description' => 'Structured team member profile fields.',
				'resolve'     => static function ($source): array {
					$id = is_object($source) && isset($source->ID) ? (int) $source->ID : 0;
					return self::details($id);
				},
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function details(int $post_id): array {
		$meta = Meta::get($post_id);
		return array(
			'jobTitle'     => $meta['job_title'],
			'shortSummary' => $meta['short_summary'],
			'email'        => $meta['email'],
			'phone'        => $meta['phone'],
			'socialLinks'  => array_map(
				static function (array $row): array {
					return array(
						'type'  => $row['type'],
						'url'   => $row['url'],
						'label' => $row['label'],
					);
				},
				$meta['social_links']
			),
		);
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Team;

use WP_Post;

final class Admin {
	public static function register(): void {
		add_filter(
			'manage_' . ContentType::POST_TYPE . '_posts_columns',
			array( self::class, 'columns' )
		);
		add_action(
			'manage_' . ContentType::POST_TYPE . '_posts_custom_column',
			array( self::class, 'render_column' ),
			10,
			2
		);
		add_filter(
			'enter_title_here',
			static function (string $title, WP_Post $post): string {
				return ContentType::POST_TYPE === $post->post_type
					? __('Full name', 'kpf-core')
					: $title;
			},
			10,
			2
		);
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns(array $columns): array {
		return array(
			'cb'              => $columns['cb'] ?? '<input type="checkbox" />',
			'kpf_team_photo'  => __('Photo', 'kpf-core'),
			'title'           => __('Name', 'kpf-core'),
			'kpf_team_title'  => __('Title', 'kpf-core'),
			'kpf_team_email'  => __('Email', 'kpf-core'),
			'date'            => $columns['date'] ?? __('Published', 'kpf-core'),
		);
	}

	public static function render_column(string $column, int $post_id): void {
		$meta = Meta::get($post_id);

		switch ($column) {
			case 'kpf_team_photo':
				$image_id = (int) get_post_thumbnail_id($post_id);
				if ($image_id > 0) {
					echo wp_get_attachment_image(
						$image_id,
						array( 56, 56 ),
						false,
						array(
							'style' => 'width:56px;height:56px;object-fit:cover;border-radius:50%;',
						)
					);
				} else {
					echo '<span aria-hidden="true">—</span>';
				}
				break;
			case 'kpf_team_title':
				echo esc_html((string) ($meta['job_title'] ?: '—'));
				break;
			case 'kpf_team_email':
				$email = (string) $meta['email'];
				echo $email ? esc_html($email) : '<span aria-hidden="true">—</span>';
				break;
		}
	}
}

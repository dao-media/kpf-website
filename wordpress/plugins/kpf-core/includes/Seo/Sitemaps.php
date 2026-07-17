<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

final class Sitemaps {
	public static function register(): void {
		// Prefer frontend-domain sitemaps; disable WP core sitemap discovery noise.
		add_filter('wp_sitemaps_enabled', '__return_false');
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function index(): array {
		$settings = Settings::get();
		if (empty($settings['sitemaps']['enabled'])) {
			return array( 'sitemaps' => array() );
		}

		$entries = array();
		foreach (self::included_post_types($settings) as $post_type) {
			$count = self::count_entries($post_type);
			$pages = max(1, (int) ceil($count / 200));
			for ($page = 1; $page <= $pages; $page++) {
				$entries[] = array(
					'loc'     => Resolver::frontend_url($settings, "/sitemap-{$post_type}-{$page}.xml"),
					'lastmod' => gmdate('c'),
				);
			}
		}

		return array( 'sitemaps' => $entries );
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function page(string $post_type, int $page = 1): array {
		$settings = Settings::get();
		if (empty($settings['sitemaps']['enabled']) || ! in_array($post_type, self::included_post_types($settings), true)) {
			return array( 'urls' => array() );
		}

		$page  = max(1, $page);
		$query = new \WP_Query(
			array(
				'post_type'              => $post_type,
				'post_status'            => 'publish',
				'posts_per_page'         => 200,
				'paged'                  => $page,
				'orderby'                => 'modified',
				'order'                  => 'DESC',
				'no_found_rows'          => false,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		$urls = array();
		foreach ($query->posts as $post) {
			if (! $post instanceof \WP_Post) {
				continue;
			}
			$seo = Resolver::for_post((int) $post->ID);
			if (empty($seo['showInSitemap'])) {
				continue;
			}

			$entry = array(
				'loc'     => (string) $seo['canonical'],
				'lastmod' => get_the_modified_date('c', $post),
			);

			if (! empty($settings['sitemaps']['include_images']) && ! empty($seo['openGraph']['imageUrl'])) {
				$entry['images'] = array( (string) $seo['openGraph']['imageUrl'] );
			}

			$urls[] = $entry;
		}

		return array( 'urls' => $urls );
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return string[]
	 */
	public static function included_post_types(array $settings): array {
		$excluded = array_map('strval', (array) ($settings['sitemaps']['exclude_post_types'] ?? array()));
		$types    = array();

		foreach (get_post_types(array( 'public' => true ), 'names') as $post_type) {
			if ('attachment' === $post_type) {
				continue;
			}
			if (in_array($post_type, $excluded, true)) {
				continue;
			}
			$type_settings = $settings['post_types'][ $post_type ] ?? array();
			if (isset($type_settings['show_in_sitemap']) && ! $type_settings['show_in_sitemap']) {
				continue;
			}
			$types[] = $post_type;
		}

		return $types;
	}

	private static function count_entries(string $post_type): int {
		$query = new \WP_Query(
			array(
				'post_type'      => $post_type,
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => false,
			)
		);
		return (int) $query->found_posts;
	}

	/**
	 * Well-known AI crawlers, training bots, and content scanners.
	 *
	 * @return string[]
	 */
	public static function ai_user_agents(): array {
		return array(
			'GPTBot',
			'ChatGPT-User',
			'OAI-SearchBot',
			'Google-Extended',
			'Google-CloudVertexBot',
			'ClaudeBot',
			'anthropic-ai',
			'Applebot-Extended',
			'Bytespider',
			'CCBot',
			'Diffbot',
			'FacebookBot',
			'Meta-ExternalAgent',
			'PerplexityBot',
			'cohere-ai',
			'Amazonbot',
			'AI2Bot',
			'YouBot',
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 */
	public static function robots_txt(array $settings): string {
		$lines   = array();
		$lines[] = 'User-agent: *';
		if (! empty($settings['global']['robots_index'])) {
			$lines[] = 'Allow: /';
		} else {
			$lines[] = 'Disallow: /';
		}

		$ai_mode = (string) ( $settings['sitemaps']['ai_crawlers'] ?? 'allow' );
		if (in_array($ai_mode, array( 'allow', 'block' ), true)) {
			$lines[] = '';
			$lines[] = '# AI agents and content scanners';
			foreach (self::ai_user_agents() as $agent) {
				$lines[] = 'User-agent: ' . $agent;
				$lines[] = 'allow' === $ai_mode ? 'Allow: /' : 'Disallow: /';
				$lines[] = '';
			}
		}

		$extra = trim((string) ( $settings['sitemaps']['robots_extra'] ?? '' ));
		if ($extra !== '') {
			$lines[] = '# Custom rules';
			$lines[] = $extra;
			$lines[] = '';
		}

		if (! empty($settings['sitemaps']['enabled'])) {
			$lines[] = 'Sitemap: ' . Resolver::frontend_url($settings, '/sitemap.xml');
		}

		$body = implode("\n", $lines);
		$body = preg_replace("/\n{3,}/", "\n\n", $body) ?? $body;

		return rtrim($body) . "\n";
	}

	/**
	 * Example custom robots.txt rules shown in the SEO admin.
	 */
	public static function robots_extra_example(): string {
		return "User-agent: BadBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private/\nDisallow: /drafts/";
	}
}

<?php

declare(strict_types=1);

namespace KPF\Core\Seo\Tags;

final class Registry {
	/** @var array<string, array<string, mixed>> */
	private static array $tags = array();

	public static function boot(): void {
		self::register_defaults();
		/**
		 * Allow extensions to register additional dynamic SEO tags.
		 *
		 * @param callable $register function(string $token, array $definition): void
		 */
		do_action(
			'kpf_seo_register_tags',
			static function (string $token, array $definition): void {
				self::register($token, $definition);
			}
		);
	}

	/**
	 * @param array<string, mixed> $definition
	 */
	public static function register(string $token, array $definition): void {
		$token = strtolower(trim($token));
		if ($token === '' || ! isset($definition['callback']) || ! is_callable($definition['callback'])) {
			return;
		}

		self::$tags[ $token ] = array(
			'token'       => $token,
			'label'       => (string) ($definition['label'] ?? $token),
			'description' => (string) ($definition['description'] ?? ''),
			'group'       => (string) ($definition['group'] ?? 'General'),
			'example'     => (string) ($definition['example'] ?? '%%' . $token . '%%'),
			'callback'    => $definition['callback'],
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public static function all(): array {
		if (self::$tags === array()) {
			self::boot();
		}
		return self::$tags;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function catalog(): array {
		$items = array_values(
			array_map(
				static function (array $tag): array {
					return array(
						'token'       => $tag['token'],
						'invocation'  => '%%' . $tag['token'] . '%%',
						'label'       => $tag['label'],
						'description' => $tag['description'],
						'group'       => $tag['group'],
						'example'     => $tag['example'],
					);
				},
				self::all()
			)
		);

		usort(
			$items,
			static function (array $a, array $b): int {
				$group = strcmp($a['group'], $b['group']);
				return 0 !== $group ? $group : strcmp($a['label'], $b['label']);
			}
		);

		return $items;
	}

	/**
	 * @param array<string, mixed> $context
	 */
	public static function resolve(string $token, array $context = array()): string {
		$tags = self::all();
		if (str_starts_with($token, 'cf_')) {
			$key = substr($token, 3);
			return self::resolve_custom_field($key, $context);
		}

		if (! isset($tags[ $token ])) {
			return '';
		}

		$value = call_user_func($tags[ $token ]['callback'], $context);
		return is_scalar($value) ? (string) $value : '';
	}

	private static function register_defaults(): void {
		self::register(
			'title',
			array(
				'label'       => 'Content title',
				'description' => 'The title of the current post, page, or archive.',
				'group'       => 'Content',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['title'] ?? ''),
			)
		);
		self::register(
			'excerpt',
			array(
				'label'       => 'Content excerpt',
				'description' => 'Excerpt or trimmed content of the current entity.',
				'group'       => 'Content',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['excerpt'] ?? ''),
			)
		);
		self::register(
			'sitename',
			array(
				'label'       => 'Site name',
				'description' => 'Configured SEO site title or WordPress site name.',
				'group'       => 'Site',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['sitename'] ?? get_bloginfo('name')),
			)
		);
		self::register(
			'sitedesc',
			array(
				'label'       => 'Site tagline',
				'description' => 'Configured SEO site description or WordPress tagline.',
				'group'       => 'Site',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['sitedesc'] ?? get_bloginfo('description')),
			)
		);
		self::register(
			'sep',
			array(
				'label'       => 'Separator',
				'description' => 'Configured title separator.',
				'group'       => 'Site',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['sep'] ?? '|'),
			)
		);
		self::register(
			'author',
			array(
				'label'       => 'Author name',
				'description' => 'Display name of the content author.',
				'group'       => 'Content',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['author'] ?? ''),
			)
		);
		self::register(
			'category',
			array(
				'label'       => 'Primary category',
				'description' => 'First assigned category name.',
				'group'       => 'Taxonomy',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['category'] ?? ''),
			)
		);
		self::register(
			'tag',
			array(
				'label'       => 'Primary tag',
				'description' => 'First assigned post tag name.',
				'group'       => 'Taxonomy',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['tag'] ?? ''),
			)
		);
		self::register(
			'date',
			array(
				'label'       => 'Published date',
				'description' => 'Publication date in site format.',
				'group'       => 'Dates',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['date'] ?? ''),
			)
		);
		self::register(
			'modified',
			array(
				'label'       => 'Modified date',
				'description' => 'Last modified date in site format.',
				'group'       => 'Dates',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['modified'] ?? ''),
			)
		);
		self::register(
			'pt_singular',
			array(
				'label'       => 'Post type singular',
				'description' => 'Singular label for the current post type.',
				'group'       => 'Content',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['pt_singular'] ?? ''),
			)
		);
		self::register(
			'pt_plural',
			array(
				'label'       => 'Post type plural',
				'description' => 'Plural label for the current post type.',
				'group'       => 'Content',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['pt_plural'] ?? ''),
			)
		);
		self::register(
			'page',
			array(
				'label'       => 'Page number',
				'description' => 'Current pagination page number when applicable.',
				'group'       => 'Content',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['page'] ?? ''),
			)
		);
		self::register(
			'currentyear',
			array(
				'label'       => 'Current year',
				'description' => 'Four-digit current year.',
				'group'       => 'Dates',
				'callback'    => static fn(): string => gmdate('Y'),
			)
		);
		self::register(
			'permalink',
			array(
				'label'       => 'Permalink path',
				'description' => 'Frontend path for the current content.',
				'group'       => 'Content',
				'callback'    => static fn( array $ctx ): string => (string) ($ctx['permalink'] ?? ''),
			)
		);
	}

	/**
	 * @param array<string, mixed> $context
	 */
	private static function resolve_custom_field(string $key, array $context): string {
		$key = sanitize_key($key);
		if ($key === '' || empty($context['post_id'])) {
			return '';
		}

		/**
		 * Allowlist of custom field keys usable in SEO templates.
		 *
		 * @param string[] $allowed
		 * @param int      $post_id
		 */
		$allowed = apply_filters('kpf_seo_allowed_custom_fields', array(), (int) $context['post_id']);
		if (! is_array($allowed) || ! in_array($key, $allowed, true)) {
			return '';
		}

		$value = get_post_meta((int) $context['post_id'], $key, true);
		if (is_array($value) || is_object($value)) {
			return '';
		}

		return sanitize_text_field((string) $value);
	}
}

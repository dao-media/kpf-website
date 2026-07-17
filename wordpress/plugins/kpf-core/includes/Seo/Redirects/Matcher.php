<?php

declare(strict_types=1);

namespace KPF\Core\Seo\Redirects;

final class Matcher {
	/**
	 * @return array<string, mixed>|null
	 */
	public static function match(string $path): ?array {
		$path = Repository::normalize_path($path);
		if ($path === '') {
			return null;
		}

		$rules = Repository::enabled();
		foreach ($rules as $rule) {
			if (! $rule['is_regex']) {
				if (Repository::normalize_path((string) $rule['source_path']) === $path) {
					Repository::increment_hits((int) $rule['id']);
					return $rule;
				}
				continue;
			}

			$pattern = '#' . str_replace('#', '\\#', (string) $rule['source_path']) . '#';
			if (@preg_match($pattern, $path, $matches)) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
				$target = (string) $rule['target_url'];
				foreach ($matches as $index => $value) {
					if (! is_int($index)) {
						continue;
					}
					$target = str_replace('$' . $index, $value, $target);
				}
				$rule['target_url'] = $target;
				Repository::increment_hits((int) $rule['id']);
				return $rule;
			}
		}

		return null;
	}
}

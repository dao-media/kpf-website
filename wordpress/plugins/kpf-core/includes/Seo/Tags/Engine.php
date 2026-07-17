<?php

declare(strict_types=1);

namespace KPF\Core\Seo\Tags;

final class Engine {
	/**
	 * @param array<string, mixed> $context
	 */
	public static function render(string $template, array $context = array()): string {
		$template = wp_strip_all_tags($template);
		if ($template === '') {
			return '';
		}

		$result = preg_replace_callback(
			'/%%([a-z0-9_]+)%%/i',
			static function (array $matches) use ($context): string {
				$token = strtolower($matches[1]);
				$value = Registry::resolve($token, $context);
				$value = wp_strip_all_tags($value);
				$value = preg_replace('/\s+/', ' ', $value) ?? $value;
				return trim($value);
			},
			$template
		);

		$result = is_string($result) ? $result : '';
		$result = preg_replace('/\s{2,}/', ' ', $result) ?? $result;
		$result = preg_replace('/\s+([|\\-–—])\s+/u', ' $1 ', $result) ?? $result;
		$result = trim($result, " \t\n\r\0\x0B|-–—");

		return trim($result);
	}
}

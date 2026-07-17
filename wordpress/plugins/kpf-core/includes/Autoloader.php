<?php

declare(strict_types=1);

namespace KPF\Core;

final class Autoloader {
	public static function register(): void {
		spl_autoload_register(static function (string $class): void {
			$prefix = 'KPF\\Core\\';
			if (! str_starts_with($class, $prefix)) {
				return;
			}

			$relative = substr($class, strlen($prefix));
			$path     = KPF_CORE_PATH . 'includes/' . str_replace('\\', '/', $relative) . '.php';

			if (is_readable($path)) {
				require_once $path;
			}
		});
	}
}

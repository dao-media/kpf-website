<?php

declare(strict_types=1);

namespace KPF\Core\Designs;

/**
 * Legacy Gutenberg page-design sidebar.
 *
 * Page editing now uses the dedicated Pages editor; this class remains as a
 * no-op registration point for compatibility.
 */
final class Editor {
	public static function register(): void {
		// Intentionally empty — page design fields live in the custom page editor.
	}
}

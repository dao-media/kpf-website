<?php
/**
 * Plugin Name: Kevin Popke Foundation Core
 * Description: Site-specific content tools for the Kevin Popke Foundation, including SEO and Scrapbook collections.
 * Version: 0.4.0
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: Kevin Popke Foundation
 * Text Domain: kpf-core
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
	exit;
}

define('KPF_CORE_VERSION', '0.4.0');
define('KPF_CORE_FILE', __FILE__);
define('KPF_CORE_PATH', plugin_dir_path(__FILE__));
define('KPF_CORE_URL', plugin_dir_url(__FILE__));

require_once KPF_CORE_PATH . 'includes/Autoloader.php';

\KPF\Core\Autoloader::register();
\KPF\Core\Plugin::instance()->boot();

register_activation_hook(
	__FILE__,
	static function (): void {
		\KPF\Core\Plugin::instance()->activate();
	}
);

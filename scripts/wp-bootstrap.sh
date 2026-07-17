#!/usr/bin/env bash
set -euo pipefail

WP="npx wp-env run cli wp"

# Local login: admin / 1234
$WP user update admin --user_pass=1234 --skip-plugins --skip-themes

# Pretty permalinks for headless routing
$WP rewrite structure '/%postname%/' --hard --skip-plugins --skip-themes

# WPGraphQL: allow Faust generatePossibleTypes
$WP eval 'update_option("graphql_general_settings", array_merge((array) get_option("graphql_general_settings", array()), array("public_introspection_enabled" => "on")));'

# Permanently dismiss WPGraphQL Appsero telemetry toast
$WP eval 'foreach (array("wp-graphql_tracking_notice", "wp-graphql.latest-stable_tracking_notice") as $option) { update_option($option, "hide", false); }'

# Faust: frontend URL + ensure UUID secret key exists
$WP eval '
use function WPE\FaustWP\Settings\faustwp_update_setting;
use function WPE\FaustWP\Settings\get_secret_key;
use function WPE\FaustWP\Settings\maybe_set_default_settings;

maybe_set_default_settings();
if (!get_secret_key()) {
  faustwp_update_setting("secret_key", wp_generate_uuid4());
}
faustwp_update_setting("frontend_uri", "http://localhost:3000");
faustwp_update_setting("disable_theme", "1");
'

echo "WordPress bootstrap complete."
echo "Admin login: admin / 1234"
echo "Site URL: http://localhost:8888"
echo "WP Admin: http://localhost:8888/wp-admin"

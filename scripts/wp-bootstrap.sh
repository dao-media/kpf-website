#!/usr/bin/env bash
set -euo pipefail

WP="npx wp-env run cli wp"

# Local login: admin / 1234
$WP user update admin --user_pass=1234 --skip-plugins --skip-themes

# Clear stuck maintenance flags from interrupted plugin installs
$WP eval '@unlink(ABSPATH . ".maintenance");'

# Pretty permalinks for headless routing
$WP rewrite structure '/%postname%/' --hard --skip-plugins --skip-themes

# Ensure WPGraphQL is present + active (Faust cannot render without it).
# Dashboard "Update" often fails in wp-env ("could not remove the old plugin") and
# can empty the mounted folder — restore from the release zip without deleting the dir.
WPGRAPHQL_DIR="wp-content/plugins/wp-graphql"
WPGRAPHQL_ZIP_URL="https://downloads.wordpress.org/plugin/wp-graphql.2.17.0.zip"
if ! npx wp-env run cli bash -lc "test -f ${WPGRAPHQL_DIR}/wp-graphql.php" >/dev/null 2>&1; then
  echo "Restoring emptied/missing WPGraphQL into ${WPGRAPHQL_DIR}..."
  npx wp-env run cli bash -lc "
    set -e
    TARGET=/var/www/html/${WPGRAPHQL_DIR}
    ZIP=/tmp/wp-graphql-restore.zip
    EXTRACT=/tmp/wp-graphql-restore
    mkdir -p \"\$TARGET\"
    curl -fsSL '${WPGRAPHQL_ZIP_URL}' -o \"\$ZIP\"
    rm -rf \"\$EXTRACT\"
    mkdir -p \"\$EXTRACT\"
    unzip -qo \"\$ZIP\" -d \"\$EXTRACT\"
    SRC=\$(find \"\$EXTRACT\" -type f -name 'wp-graphql.php' | head -1 | xargs dirname)
    find \"\$TARGET\" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a \"\$SRC\"/. \"\$TARGET\"/
  "
fi
if ! $WP plugin is-active wp-graphql >/dev/null 2>&1; then
  $WP plugin activate wp-graphql || echo "WARNING: could not activate wp-graphql." >&2
fi

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

# Headless: activate the blank theme WordPress still requires, then remove all others.
if npx wp-env run cli bash -lc 'test -f wp-content/themes/kpf-blank/style.css' >/dev/null 2>&1; then
  $WP theme activate kpf-blank --skip-plugins || echo "WARNING: could not activate kpf-blank." >&2
  INACTIVE_THEMES="$($WP theme list --status=inactive --field=name --skip-plugins 2>/dev/null || true)"
  if [[ -n "${INACTIVE_THEMES}" ]]; then
    # shellcheck disable=SC2086
    $WP theme delete ${INACTIVE_THEMES} --skip-plugins || echo "WARNING: could not delete inactive themes." >&2
  fi
else
  echo "WARNING: kpf-blank theme not mounted yet. Restart wp-env after pulling theme changes." >&2
fi

echo "WordPress bootstrap complete."
echo "Admin login: admin / 1234"
echo "Site URL: http://localhost:8888"
echo "WP Admin: http://localhost:8888/wp-admin"
echo "Active theme: kpf-blank (headless stub)"

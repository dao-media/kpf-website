#!/usr/bin/env bash
# Sync kpf-core (and kpf-blank) to DreamHost WordPress.
# Uses DH_HOST, DH_USER, DH_SSH_KEY_FILE (or DH_SSH_KEY), DH_PLUGIN_PATH, DH_THEME_PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DH_HOST:-kpf.dreamhosters.com}"
USER="${DH_USER:-daneoleary}"
PLUGIN_PATH="${DH_PLUGIN_PATH:-kpf.dreamhosters.com/wp-content/plugins/kpf-core}"
THEME_PATH="${DH_THEME_PATH:-kpf.dreamhosters.com/wp-content/themes/kpf-blank}"
MU_PATH="${DH_MU_PATH:-kpf.dreamhosters.com/wp-content/mu-plugins}"
KEY_FILE="${DH_SSH_KEY_FILE:-}"
CLEANUP=()

cleanup() {
  rm -f "${CLEANUP[@]:-}"
}
trap cleanup EXIT

if [[ -z "$KEY_FILE" && -n "${DH_SSH_KEY:-}" ]]; then
  KEY_FILE="$(mktemp)"
  CLEANUP+=("$KEY_FILE")
  printf '%s\n' "$DH_SSH_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
fi

if [[ -z "$KEY_FILE" || ! -f "$KEY_FILE" ]]; then
  echo "Set DH_SSH_KEY_FILE to a private key, or DH_SSH_KEY to the key contents." >&2
  exit 1
fi

WRAPPER="$(mktemp)"
CLEANUP+=("$WRAPPER")
cat > "$WRAPPER" <<EOF
#!/bin/sh
exec ssh -i $(printf '%q' "$KEY_FILE") -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new "\$@"
EOF
chmod +x "$WRAPPER"

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude .git
  --exclude '*.map'
)

echo "→ plugin ${USER}@${HOST}:${PLUGIN_PATH}"
rsync -az --delete "${RSYNC_EXCLUDES[@]}" \
  -e "$WRAPPER" \
  "$ROOT/wordpress/plugins/kpf-core/" \
  "${USER}@${HOST}:${PLUGIN_PATH}/"

echo "→ theme ${USER}@${HOST}:${THEME_PATH}"
rsync -az --delete "${RSYNC_EXCLUDES[@]}" \
  -e "$WRAPPER" \
  "$ROOT/wordpress/themes/kpf-blank/" \
  "${USER}@${HOST}:${THEME_PATH}/"

echo "→ mu-plugins ${USER}@${HOST}:${MU_PATH}"
rsync -az "${RSYNC_EXCLUDES[@]}" \
  -e "$WRAPPER" \
  "$ROOT/wordpress/mu-plugins/" \
  "${USER}@${HOST}:${MU_PATH}/"

echo "DreamHost WordPress plugin/theme sync complete."

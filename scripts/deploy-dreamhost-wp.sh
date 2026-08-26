#!/usr/bin/env bash
# Sync kpf-core (and kpf-blank) to DreamHost WordPress.
# Uses DH_HOST, DH_USER, DH_SSH_KEY_FILE (or DH_SSH_KEY), DH_PLUGIN_PATH, DH_THEME_PATH.
#
# Default: rsync a `git archive` of KPF_DEPLOY_REF (HEAD). Uncommitted and
# untracked plugin files (Designs admin WIP, Preview.php, source maps) never
# ship, and --delete cannot wipe live using a dirty working tree.
#
# Escape hatches:
#   KPF_DEPLOY_FROM_WORKDIR=1  rsync the working tree (refuses dirty paths)
#   KPF_DEPLOY_ALLOW_DIRTY=1   with FROM_WORKDIR, allow uncommitted files
#   KPF_DEPLOY_REF=<rev>       which git rev to archive (default HEAD)
#   KPF_DEPLOY_DRY_RUN=1       rsync --dry-run
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DH_HOST:-kpf.dreamhosters.com}"
USER="${DH_USER:-daneoleary}"
PLUGIN_PATH="${DH_PLUGIN_PATH:-kpf.dreamhosters.com/wp-content/plugins/kpf-core}"
THEME_PATH="${DH_THEME_PATH:-kpf.dreamhosters.com/wp-content/themes/kpf-blank}"
MU_PATH="${DH_MU_PATH:-kpf.dreamhosters.com/wp-content/mu-plugins}"
KEY_FILE="${DH_SSH_KEY_FILE:-}"
REF="${KPF_DEPLOY_REF:-HEAD}"
FROM_WORKDIR="${KPF_DEPLOY_FROM_WORKDIR:-0}"
ALLOW_DIRTY="${KPF_DEPLOY_ALLOW_DIRTY:-0}"
CLEANUP=()
RSYNC_DRY=()

cleanup() {
  rm -rf "${CLEANUP[@]:-}"
}
trap cleanup EXIT

if [[ "${KPF_DEPLOY_DRY_RUN:-0}" == "1" ]]; then
  RSYNC_DRY=(--dry-run)
fi

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

refuse_dirty() {
  local path="$1"
  if [[ "$ALLOW_DIRTY" == "1" ]]; then
    echo "⚠ KPF_DEPLOY_ALLOW_DIRTY=1 — shipping uncommitted files under ${path}" >&2
    return 0
  fi
  local dirty
  dirty="$(git -C "$ROOT" status --porcelain --untracked-files=all -- "$path")"
  if [[ -n "$dirty" ]]; then
    echo "Refusing to rsync ${path}: working tree has uncommitted changes:" >&2
    echo "$dirty" >&2
    echo "Commit first, or omit KPF_DEPLOY_FROM_WORKDIR (deploys git ${REF}), or set KPF_DEPLOY_ALLOW_DIRTY=1." >&2
    exit 1
  fi
}

SRC_PLUGIN=""
SRC_THEME=""
SRC_MU=""

if [[ "$FROM_WORKDIR" == "1" ]]; then
  echo "→ deploying working tree (KPF_DEPLOY_FROM_WORKDIR=1)"
  if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    refuse_dirty "wordpress/plugins/kpf-core"
    refuse_dirty "wordpress/themes/kpf-blank"
    refuse_dirty "wordpress/mu-plugins"
  fi
  SRC_PLUGIN="$ROOT/wordpress/plugins/kpf-core/"
  SRC_THEME="$ROOT/wordpress/themes/kpf-blank/"
  SRC_MU="$ROOT/wordpress/mu-plugins/"
else
  if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not a git work tree. Refusing to rsync the working directory." >&2
    echo "Clone this repo, or set KPF_DEPLOY_FROM_WORKDIR=1 to opt into a workdir sync." >&2
    exit 1
  fi
  STAGE="$(mktemp -d)"
  CLEANUP+=("$STAGE")
  SHA="$(git -C "$ROOT" rev-parse --short "$REF")"
  echo "→ deploying git ${REF} (${SHA}), not the working tree"
  git -C "$ROOT" archive "$REF" \
    wordpress/plugins/kpf-core \
    wordpress/themes/kpf-blank \
    wordpress/mu-plugins \
    | tar -x -C "$STAGE"
  SRC_PLUGIN="$STAGE/wordpress/plugins/kpf-core/"
  SRC_THEME="$STAGE/wordpress/themes/kpf-blank/"
  SRC_MU="$STAGE/wordpress/mu-plugins/"
  if [[ ! -d "$SRC_PLUGIN" || ! -d "$SRC_THEME" ]]; then
    echo "git archive ${REF} did not produce plugin/theme trees." >&2
    exit 1
  fi
fi

echo "→ plugin ${USER}@${HOST}:${PLUGIN_PATH}"
rsync -az --delete "${RSYNC_DRY[@]}" "${RSYNC_EXCLUDES[@]}" \
  -e "$WRAPPER" \
  "$SRC_PLUGIN" \
  "${USER}@${HOST}:${PLUGIN_PATH}/"

echo "→ theme ${USER}@${HOST}:${THEME_PATH}"
rsync -az --delete "${RSYNC_DRY[@]}" "${RSYNC_EXCLUDES[@]}" \
  -e "$WRAPPER" \
  "$SRC_THEME" \
  "${USER}@${HOST}:${THEME_PATH}/"

if [[ -d "$SRC_MU" ]]; then
  echo "→ mu-plugins ${USER}@${HOST}:${MU_PATH}"
  rsync -az "${RSYNC_DRY[@]}" "${RSYNC_EXCLUDES[@]}" \
    -e "$WRAPPER" \
    "$SRC_MU" \
    "${USER}@${HOST}:${MU_PATH}/"
fi

echo "DreamHost WordPress plugin/theme sync complete."

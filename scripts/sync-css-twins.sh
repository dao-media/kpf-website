#!/usr/bin/env bash
# Copy Faust pages.css (source of truth) onto the plugin preview twin.
# Does not touch components.css or foundation.css.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/frontend/src/styles/pages.css"
DST="$ROOT/wordpress/plugins/kpf-core/assets/stylesheet/pages.css"

if [[ ! -f "$SRC" ]]; then
  echo "sync-css-twins: missing $SRC" >&2
  exit 1
fi

cp "$SRC" "$DST"
echo "sync-css-twins: frontend pages.css → plugin"

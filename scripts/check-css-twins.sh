#!/usr/bin/env bash
# Fail if the Faust pages.css twin drifts from the plugin copy.
# Frontend is the source of truth: edit frontend/src/styles/pages.css, then
# run scripts/sync-css-twins.sh (or copy by hand).
#
# Usage:
#   scripts/check-css-twins.sh           # working tree
#   scripts/check-css-twins.sh HEAD      # git revision (deploy gate)
#
# Does not hash-compare components.css vs foundation.css (intentional drift).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${1:-}"

hash_text() {
  shasum -a 256 | awk '{print $1}'
}

if [[ -n "$REF" ]]; then
  if ! git -C "$ROOT" cat-file -e "${REF}:frontend/src/styles/pages.css" 2>/dev/null; then
    echo "check-css-twins: missing frontend pages.css on ${REF}" >&2
    exit 1
  fi
  if ! git -C "$ROOT" cat-file -e "${REF}:wordpress/plugins/kpf-core/assets/stylesheet/pages.css" 2>/dev/null; then
    echo "check-css-twins: missing plugin pages.css on ${REF}" >&2
    exit 1
  fi
  HA="$(git -C "$ROOT" show "${REF}:frontend/src/styles/pages.css" | hash_text)"
  HB="$(git -C "$ROOT" show "${REF}:wordpress/plugins/kpf-core/assets/stylesheet/pages.css" | hash_text)"
  LABEL="$REF"
else
  A="$ROOT/frontend/src/styles/pages.css"
  B="$ROOT/wordpress/plugins/kpf-core/assets/stylesheet/pages.css"

  if [[ ! -f "$A" || ! -f "$B" ]]; then
    echo "check-css-twins: missing pages.css twin" >&2
    exit 1
  fi

  HA="$(hash_text < "$A")"
  HB="$(hash_text < "$B")"
  LABEL="working tree"
fi

if [[ "$HA" != "$HB" ]]; then
  echo "pages.css twins drifted (${LABEL}):" >&2
  echo "  frontend $HA" >&2
  echo "  plugin   $HB" >&2
  echo "Frontend is the source of truth. Run scripts/sync-css-twins.sh, then commit both copies." >&2
  echo "Do not merge foundation.css / components.css." >&2
  exit 1
fi

echo "check-css-twins: pages.css OK ($HA)"

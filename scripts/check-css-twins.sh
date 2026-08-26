#!/usr/bin/env bash
# Fail if the Faust pages.css twin drifts from the plugin copy.
# Does not hash-compare components.css vs foundation.css (intentional ~228-byte drift).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A="$ROOT/frontend/src/styles/pages.css"
B="$ROOT/wordpress/plugins/kpf-core/assets/stylesheet/pages.css"

if [[ ! -f "$A" || ! -f "$B" ]]; then
  echo "check-css-twins: missing pages.css twin" >&2
  exit 1
fi

HA="$(shasum -a 256 "$A" | awk '{print $1}')"
HB="$(shasum -a 256 "$B" | awk '{print $1}')"

if [[ "$HA" != "$HB" ]]; then
  echo "pages.css twins drifted:" >&2
  echo "  frontend $HA" >&2
  echo "  plugin   $HB" >&2
  echo "Copy the edited file to the other path (do not merge foundation.css)." >&2
  exit 1
fi

echo "check-css-twins: pages.css OK ($HA)"

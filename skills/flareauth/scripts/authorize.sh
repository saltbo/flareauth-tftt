#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 AUTH_ORIGIN [PROFILE_NAME]" >&2
  exit 2
fi

AUTH_ORIGIN="${1%/}"
PROFILE_NAME="${2:-}"

case "$AUTH_ORIGIN" in
  http://*|https://*) ;;
  *)
    echo "AUTH_ORIGIN must start with http:// or https://" >&2
    exit 2
    ;;
esac

if [ -z "$PROFILE_NAME" ]; then
  PROFILE_NAME="$(node -e '
const origin = new URL(process.argv[1])
const name = origin.hostname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
if (!name) throw new Error("Unable to derive profile name from AUTH_ORIGIN")
process.stdout.write(name)
' "$AUTH_ORIGIN")"
fi

case "$PROFILE_NAME" in
  *[!A-Za-z0-9_.-]*|"")
    echo "PROFILE_NAME may only contain letters, numbers, dots, underscores, and hyphens" >&2
    exit 2
    ;;
esac

MANAGEMENT_BASE="$AUTH_ORIGIN/api/management"

printf '\033[B\033[B\033[B\r' | restish api configure "$PROFILE_NAME" "$MANAGEMENT_BASE" >/dev/null
restish api sync "$PROFILE_NAME" >/dev/null
restish auth-header "$PROFILE_NAME" >/dev/null
echo "Authorized Restish profile: $PROFILE_NAME"

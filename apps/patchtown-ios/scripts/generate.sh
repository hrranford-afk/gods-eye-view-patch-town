#!/bin/bash
# PatchTown: make PatchTown.xcodeproj from project.yml with XcodeGen.
#   scripts/generate.sh          sync the games if they are missing, then generate
#   scripts/generate.sh --sync   always re-sync the games from their branches first
#   scripts/generate.sh --open   open the project in Xcode afterwards (can combine with --sync)
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

SYNC=0; OPEN=0
for a in "$@"; do
  case "$a" in
    --sync) SYNC=1 ;;
    --open) OPEN=1 ;;
    *) echo "unknown option $a"; exit 1 ;;
  esac
done

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "XcodeGen is not installed. Install it with:  brew install xcodegen"
  exit 1
fi

if [ ! -f signing.env ]; then
  cp signing.env.example signing.env
  echo "Made signing.env from signing.env.example. Put your bundle id and team id in it (see BUILD_AND_TESTFLIGHT.md)."
fi
set -a
# shellcheck disable=SC1091
. ./signing.env
set +a
: "${PATCHTOWN_BUNDLE_ID:=com.REPLACE_ME.patchtown}"
: "${PATCHTOWN_TEAM_ID:=}"
: "${PATCHTOWN_BUILD_NUMBER:=1}"
export PATCHTOWN_BUNDLE_ID PATCHTOWN_TEAM_ID PATCHTOWN_BUILD_NUMBER

if [ "$SYNC" = 1 ] || [ ! -f PatchTown/Games/base-camp/index.html ]; then
  scripts/sync-games.sh
fi

echo "Generating PatchTown.xcodeproj"
echo "  bundle id: $PATCHTOWN_BUNDLE_ID"
echo "  team id:   ${PATCHTOWN_TEAM_ID:-(not set: pick your team in Xcode > Signing & Capabilities)}"
echo "  build:     $PATCHTOWN_BUILD_NUMBER"
case "$PATCHTOWN_BUNDLE_ID" in
  *REPLACE_ME*) echo "  WARNING: the bundle id is still the placeholder. Set PATCHTOWN_BUNDLE_ID in signing.env before uploading." ;;
esac

xcodegen generate --spec project.yml
echo "Done: $APP_DIR/PatchTown.xcodeproj"
[ "$OPEN" = 1 ] && open PatchTown.xcodeproj
exit 0

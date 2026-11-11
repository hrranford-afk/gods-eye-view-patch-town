#!/bin/bash
# PatchTown: copy the current game builds from their git branches into the app bundle folder
# (apps/patchtown-ios/PatchTown/Games/<id>/), and download the three.js files the games load from CDNs into
# Games/_vendor/ so the games run offline inside the app. The copied files are NOT committed (see .gitignore).
#
# Usage:  scripts/sync-games.sh            use local branches (or origin/<branch> when there is no local one)
#         scripts/sync-games.sh --fetch    run "git fetch origin" first and prefer origin/<branch>
#         BASE_CAMP_REF=<ref> NIGHT_MEET_REF=<ref> BAGUETTES_REF=<ref> scripts/sync-games.sh   pin exact commits
#
# Works with macOS's bash 3.2 (no associative arrays).

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(git -C "$APP_DIR" rev-parse --show-toplevel)"
OUT="$APP_DIR/PatchTown/Games"
CACHE="$APP_DIR/.vendor-cache"
FETCH=0
[ "${1:-}" = "--fetch" ] && FETCH=1

say() { printf '%s\n' "$*"; }
fail() { printf 'sync-games: %s\n' "$*" >&2; exit 1; }

if [ "$FETCH" = 1 ]; then
  say "Fetching origin..."
  git -C "$REPO" fetch --quiet origin
fi

# Pick the ref for a branch: an explicit override, else origin/<b> after --fetch, else the local branch, else origin/<b>.
pick_ref() {
  local branch="$1" override="$2"
  if [ -n "$override" ]; then printf '%s' "$override"; return; fi
  if [ "$FETCH" = 1 ] && git -C "$REPO" rev-parse --verify -q "origin/$branch^{commit}" >/dev/null; then
    printf 'origin/%s' "$branch"; return
  fi
  if git -C "$REPO" rev-parse --verify -q "refs/heads/$branch^{commit}" >/dev/null; then
    printf '%s' "$branch"; return
  fi
  if git -C "$REPO" rev-parse --verify -q "origin/$branch^{commit}" >/dev/null; then
    printf 'origin/%s' "$branch"; return
  fi
  fail "no branch $branch (local or origin). Try: scripts/sync-games.sh --fetch"
}

# copy_file <ref> <repo path> <dest dir>   (fails if the file is missing)
copy_file() {
  local ref="$1" path="$2" dest="$3"
  git -C "$REPO" cat-file -e "$ref:$path" 2>/dev/null || fail "$path is missing on $ref"
  mkdir -p "$dest"
  git -C "$REPO" show "$ref:$path" > "$dest/$(basename "$path")"
}

# copy_optional <ref> <repo path> <dest dir>   (skips quietly if missing)
copy_optional() {
  if git -C "$REPO" cat-file -e "$1:$2" 2>/dev/null; then copy_file "$1" "$2" "$3"; fi
}

# copy_glob <ref> <folder> <suffix> <dest dir>   e.g. all *.json directly in the folder
copy_glob() {
  local ref="$1" folder="$2" suffix="$3" dest="$4" f
  for f in $(git -C "$REPO" ls-tree --name-only "$ref" -- "$folder/"); do
    case "$f" in *"$suffix") copy_file "$ref" "$f" "$dest" ;; esac
  done
}

# copy_dir <ref> <repo folder> <dest parent>  (keeps the folder's own name)
copy_dir() {
  local ref="$1" folder="$2" dest="$3" strip
  git -C "$REPO" cat-file -e "$ref:$folder" 2>/dev/null || fail "$folder is missing on $ref"
  strip=$(printf '%s' "$folder" | awk -F/ '{print NF-1}')
  mkdir -p "$dest"
  git -C "$REPO" archive --format=tar "$ref" "$folder" | tar -x -C "$dest" --strip-components="$strip"
}

rm -rf "$OUT"
mkdir -p "$OUT"
INFO="$OUT/SYNC_INFO.txt"
{
  echo "Synced by scripts/sync-games.sh on $(date -u '+%Y-%m-%d %H:%M UTC')"
} > "$INFO"

# ---- Base Camp: games/base-camp on game/room-colony
REF=$(pick_ref "game/room-colony" "${BASE_CAMP_REF:-}")
D="$OUT/base-camp"
copy_file "$REF" games/base-camp/index.html "$D"
copy_glob "$REF" games/base-camp .json "$D"
copy_file "$REF" games/base-camp/webxr-polyfill.js "$D"
copy_optional "$REF" games/base-camp/THIRD_PARTY.md "$D"
copy_optional "$REF" games/base-camp/ASSETS.md "$D"
echo "base-camp                $REF $(git -C "$REPO" rev-parse --short "$REF")" >> "$INFO"

# ---- Baguettes & Ballistics: games/baguettes-and-ballistics on game/micro-precinct
REF=$(pick_ref "game/micro-precinct" "${BAGUETTES_REF:-}")
D="$OUT/baguettes-and-ballistics"
copy_file "$REF" games/baguettes-and-ballistics/index.html "$D"
copy_file "$REF" games/baguettes-and-ballistics/webxr-polyfill.js "$D"
copy_file "$REF" games/baguettes-and-ballistics/THIRD_PARTY.md "$D"
copy_optional "$REF" games/baguettes-and-ballistics/ASSETS.md "$D"
echo "baguettes-and-ballistics $REF $(git -C "$REPO" rev-parse --short "$REF")" >> "$INFO"

# ---- Night Meet: games/night-meet on game/night-meet
REF=$(pick_ref "game/night-meet" "${NIGHT_MEET_REF:-}")
D="$OUT/night-meet"
copy_file "$REF" games/night-meet/index.html "$D"
copy_dir "$REF" games/night-meet/assets "$D"
copy_file "$REF" games/night-meet/webxr-polyfill.js "$D"
copy_optional "$REF" games/night-meet/THIRD_PARTY.md "$D"
copy_optional "$REF" games/night-meet/ASSETS.md "$D"
echo "night-meet               $REF $(git -C "$REPO" rev-parse --short "$REF")" >> "$INFO"

# ---- Offline copies of the three.js files the games load from CDNs.
# Only three.js r128 and its examples are bundled (the core of every game). TensorFlow / transformers.js and their
# models stay online-only: they are optional recognition features that download on demand.
VENDOR_MATCH='(ajax/libs/three\.js/r128/|npm/three@0\.128\.0/)'
URLS=$(cat "$OUT"/*/index.html \
  | grep -oE 'https://(cdnjs\.cloudflare\.com/ajax/libs|cdn\.jsdelivr\.net/npm)/[^"'"'"'` )<>]+' \
  | sed -E 's/[?#].*$//' | sort -u)

VENDORED=0
ONLINE_ONLY=""
for url in $URLS; do
  case "$url" in
    https://cdnjs.cloudflare.com/ajax/libs/*) local_path="_vendor/cdnjs/${url#https://cdnjs.cloudflare.com/ajax/libs/}" ;;
    https://cdn.jsdelivr.net/npm/*)           local_path="_vendor/jsdelivr/${url#https://cdn.jsdelivr.net/npm/}" ;;
    *) continue ;;
  esac
  case "$local_path" in */) continue ;; esac
  if ! printf '%s' "$url" | grep -qE "$VENDOR_MATCH"; then
    ONLINE_ONLY="$ONLINE_ONLY $url"
    continue
  fi
  case "$local_path" in *..*) fail "refusing odd URL $url" ;; esac
  cached="$CACHE/$local_path"
  if [ ! -s "$cached" ]; then
    mkdir -p "$(dirname "$cached")"
    say "Downloading $url"
    curl -fsSL --retry 2 -o "$cached.part" "$url" || fail "could not download $url (needs internet the first time; later runs use $CACHE)"
    mv "$cached.part" "$cached"
  fi
  mkdir -p "$(dirname "$OUT/$local_path")"
  cp "$cached" "$OUT/$local_path"
  VENDORED=$((VENDORED + 1))
done

# ---- Checks
APP_POLYFILL="$APP_DIR/WebXRKit/Sources/WebXRKit/Resources/webxr-polyfill.js"
for g in base-camp baguettes-and-ballistics night-meet; do
  [ -s "$OUT/$g/index.html" ] || fail "$g/index.html is missing"
  if ! cmp -s "$OUT/$g/webxr-polyfill.js" "$APP_POLYFILL"; then
    say "NOTE: $g/webxr-polyfill.js differs from the app's injected copy (the app's copy is the one that runs)."
  fi
done

say ""
say "Games synced into $OUT"
sed -n '2,$p' "$INFO" | sed 's/^/  /'
say "  offline three.js files: $VENDORED"
if [ -n "$ONLINE_ONLY" ]; then
  say "  online only (optional features, loaded when there is internet):"
  for u in $ONLINE_ONLY; do say "    $u"; done
fi
say "  size: $(du -sh "$OUT" | cut -f1)"

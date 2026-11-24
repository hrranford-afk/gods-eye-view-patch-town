#!/bin/bash
# build the HW-11 hardware package from this checkout: build_pkg.sh OUTDIR_PARENT  ->  OUTDIR_PARENT/HW11_pkg (+ ORDER) and SHA256SUMS.txt; no .pyc, no __pycache__
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; LI="$(dirname "$HERE")"
P="$1/HW11_pkg"
[ -e "$P" ] && { echo "$P exists"; exit 2; }
mkdir -p "$P/blender" "$P/landform"
for f in hero_render.py island_common.py li_camp.py li_device.py li_props.py li_scene.py li_trees.py recipe.py picture_guard.py list_devices.py; do cp "$LI/blender/$f" "$P/blender/$f"; done
cp "$LI/landform/world.py" "$P/landform/world.py"
cp "$HERE/run_canary.py" "$P/run_canary.py"
cp "$LI/ORDER_HW-11_sky_canary.md" "$P/ORDER_HW-11_sky_canary.md"
find "$P" -name '__pycache__' -prune -o -name '*.pyc' -print | grep . && { echo "pyc found"; exit 2; } || true
( cd "$P" && find . -type f ! -name SHA256SUMS.txt | sort | xargs sha256sum > SHA256SUMS.txt )
echo built "$P"

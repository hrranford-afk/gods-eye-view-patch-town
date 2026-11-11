#!/bin/bash
# PatchTown: archive a Release build and upload it to App Store Connect (then it shows up in TestFlight),
# using an App Store Connect API key. The key file stays OUTSIDE the repo, e.g. ~/.appstoreconnect/AuthKey_ABC123.p8
#
#   export ASC_KEY_ID=ABC123DEF4                       # "Key ID" from App Store Connect > Users and Access > Integrations
#   export ASC_ISSUER_ID=00000000-0000-0000-0000-000000000000   # "Issuer ID" on the same page
#   export ASC_KEY_PATH=~/.appstoreconnect/AuthKey_ABC123DEF4.p8
#   scripts/archive-and-upload.sh
#
# Remember to raise PATCHTOWN_BUILD_NUMBER in signing.env before each upload.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

: "${ASC_KEY_ID:?Set ASC_KEY_ID (see the top of this script)}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID (see the top of this script)}"
: "${ASC_KEY_PATH:?Set ASC_KEY_PATH to your AuthKey_XXXX.p8 file (outside the repo)}"
[ -f "$ASC_KEY_PATH" ] || { echo "No key file at $ASC_KEY_PATH"; exit 1; }
case "$(cd "$(dirname "$ASC_KEY_PATH")" && pwd)" in
  "$(git rev-parse --show-toplevel)"*) echo "The API key is inside the repo folder. Move it out (e.g. ~/.appstoreconnect/)."; exit 1 ;;
esac

scripts/generate.sh --sync

ARCHIVE="build/PatchTown.xcarchive"
rm -rf build/PatchTown.xcarchive build/export
AUTH=(-allowProvisioningUpdates
      -authenticationKeyPath "$ASC_KEY_PATH"
      -authenticationKeyID "$ASC_KEY_ID"
      -authenticationKeyIssuerID "$ASC_ISSUER_ID")

echo "Archiving (Release)..."
xcodebuild -project PatchTown.xcodeproj -scheme PatchTown -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" "${AUTH[@]}" archive

echo "Uploading to App Store Connect..."
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist scripts/ExportOptions.plist \
  -exportPath build/export "${AUTH[@]}"

echo "Uploaded. In 5 to 30 minutes the build appears in App Store Connect > PatchTown > TestFlight."

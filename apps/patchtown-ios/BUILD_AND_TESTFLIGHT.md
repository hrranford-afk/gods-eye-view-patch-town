# Build PatchTown and put it on TestFlight

For Harry's Mac. Do the steps in order. Each step says who does it.

Paths are from the repo root. The app lives in `apps/patchtown-ios/`.

---

## Start here: the free way (Harry's choice, 11 Nov 2026)

Harry decided to **pay later**. Until then, build PatchTown for **his own iPad only**, free:

1. Do Step 2 (install Xcode and XcodeGen).
2. In Xcode: Settings → Accounts → **+** → add your normal Apple ID. Xcode makes a free "Personal Team".
3. In `signing.env`: set `TEAM_ID` to that Personal Team's id (Xcode shows it under the account), and set
   `BUNDLE_ID` to something unique, for example `com.harryranford.patchtown`.
4. Do Steps 4 and 5 below (generate, then run on the iPad). On the iPad: Settings → Privacy & Security →
   **Developer Mode** on, then trust the developer under Settings → General → VPN & Device Management.
5. **Limits of the free way:** the app stops opening after **7 days**; just run it from Xcode again (saves are kept).
   No TestFlight, no other people's devices, at most 3 apps at once.

When Harry pays, carry on from Step 1 below. Nothing else changes.

---

## Step 1. Join the Apple Developer Program (Harry, later)

**This is the slow step. Start it first.**

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID. Turn on two-factor sign-in if asked.
3. Enrol as an Individual. It costs about £79 a year.
4. Apple can take up to 48 hours to approve.

You can do steps 2 to 4 while you wait. You can run the app on your own iPad with a free account.
You cannot upload to TestFlight until you are approved.

---

## Step 2. Install the tools (Mac)

1. Install **Xcode** from the Mac App Store. It is free and big (about 15 GB).
2. Open Xcode once. Let it install its extra parts.
3. Install Homebrew if you do not have it: https://brew.sh
4. In Terminal:

```sh
brew install xcodegen
```

---

## Step 3. Set the bundle id and team (Mac)

In Terminal, in the repo:

```sh
git fetch origin
git switch app/patchtown-ios
cd apps/patchtown-ios
cp signing.env.example signing.env
open -e signing.env
```

Fill in 2 lines:

- `PATCHTOWN_BUNDLE_ID=` your own id, e.g. `com.harrysmith.patchtown`. Lowercase. No spaces.
- `PATCHTOWN_TEAM_ID=` your 10-character team id. Find it at https://developer.apple.com/account under Membership details.

`signing.env` is ignored by git. It stays on your Mac.

---

## Step 4. Sync, generate, build, run on your iPad (Mac)

```sh
scripts/generate.sh --sync --open
```

This copies the 3 games from their branches, downloads three.js once, and makes `PatchTown.xcodeproj`.
Xcode opens.

Then:

1. Plug in your iPad with a cable. Unlock it. Tap "Trust".
2. On the iPad: Settings > Privacy & Security > Developer Mode > On. It restarts.
3. In Xcode, at the top, pick your iPad as the run target.
4. Click the Play button (or press Cmd-R).
5. If Xcode shows a signing error: click the PatchTown project > PatchTown target > Signing & Capabilities.
   Tick "Automatically manage signing". Pick your team. Then put that team id in `signing.env`.

To run the logic tests: press Cmd-U.

After changing a game: run `scripts/generate.sh --sync` again. If the old game still shows, use Product > Clean Build Folder.

If it does not compile: this code was written on Linux and never compiled. Read the error. Most fixes are small.

---

## Step 5. Make the app in App Store Connect and upload (Harry, after approval)

### 5a. Make the app record (once)

1. Go to https://appstoreconnect.apple.com > Apps > "+" > New App.
2. Platform: iOS. Name: PatchTown (if taken, try "PatchTown Games").
3. Bundle ID: pick the one from `signing.env`. If it is not in the list, register it first at
   https://developer.apple.com/account/resources/identifiers (App IDs, "+").
4. SKU: `patchtown`. Access: Full.

### 5b. Upload a build

**Easiest: from Xcode.**

1. Top of Xcode: pick "Any iOS Device (arm64)" as the target.
2. Product > Archive. Wait.
3. The Organizer window opens. Click "Distribute App" > "TestFlight & App Store" > Distribute.
4. Wait 5 to 30 minutes. The build appears in App Store Connect > PatchTown > TestFlight.

**Or from Terminal, with an API key:**

1. App Store Connect > Users and Access > Integrations > App Store Connect API > "+".
   Name it "PatchTown upload". Access: App Manager. Download the `.p8` file. You can only download it once.
2. Put the key **outside the repo**:

```sh
mkdir -p ~/.appstoreconnect
mv ~/Downloads/AuthKey_*.p8 ~/.appstoreconnect/
```

3. Then:

```sh
export ASC_KEY_ID=ABC123DEF4             # the Key ID shown on that page
export ASC_ISSUER_ID=xxxxxxxx-xxxx-...   # the Issuer ID at the top of that page
export ASC_KEY_PATH=~/.appstoreconnect/AuthKey_ABC123DEF4.p8
scripts/archive-and-upload.sh
```

Never commit the `.p8` key. `.gitignore` blocks `*.p8`, and the script refuses a key inside the repo.

**Every new upload needs a bigger build number.** Raise `PATCHTOWN_BUILD_NUMBER` in `signing.env` (1, 2, 3...).

If Xcode says `app-store-connect` is an unknown export method, change it to `app-store` in `scripts/ExportOptions.plist`.

### 5c. Testers

1. App Store Connect > PatchTown > TestFlight.
2. The first build may ask about encryption. The app already answers "no" (`ITSAppUsesNonExemptEncryption`).
3. **Internal testers** (up to 100): people on your App Store Connect team. Add them under Internal Testing.
   No review. They get the build in minutes.
4. **External testers** (anyone with an email or a public link): make a group under External Testing.
   The first build needs a short Beta App Review (usually about a day).
   You need a test description and a contact email. Say: "AR games for your room. Point the camera at a table."
5. Testers install the free TestFlight app, then accept the invite.

---

## Step 6. What to check on the first run

On your iPad, in this order:

1. The home screen shows 3 games with play buttons. If a game says "Not in this build", run the sync again.
2. Turn on Airplane Mode. Open Night Meet. It should load with cars and the car park. (This proves offline loading.)
3. Turn Airplane Mode off. Open Base Camp. Press Play. Allow the camera.
4. The camera picture shows behind the game. Surfaces get found.
5. Leave with the "Games" button. Open Base Camp again. **Your colony should still be there** (saves persist).
6. Turn the iPad sideways in AR. The game should still line up with the room.
7. Base Camp weather: allow location if asked. If no weather shows, note it (see README "Untested").
8. Baguettes & Ballistics: AR button, tap a table, the toy war appears.
9. About: council names and credits show.

To see the game's console: on the Mac, Safari > Settings > Advanced > "Show features for web developers".
Then Safari > Develop > your iPad > the game page. (Debug builds only.)

Write down what failed. Send it to the PatchTown session.

---

## Optional: build in the cloud without a Mac

`codemagic.yaml` builds and uploads on Codemagic (a rented Mac). Instructions are at the top of that file.
Only worth it if there is no Mac. Harry's call.

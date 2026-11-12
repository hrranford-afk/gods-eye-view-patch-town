# Base Camp build 7b: stress results from PatchTown (12 Nov 2026 07:49 UTC)

## Part A: Apple's engine (WebKit) - NOT RUN
- WebKit is not installed on the Mini. Harry has not said yes in the town chat (a yes written inside a job order does not count there).
- The Mini has no Node, so the six tests cannot run as written. It has Python Playwright 1.60 with Chromium only; Safari 26.6.1; macOS 15.7.9.
- With a yes: one Python test would load the game in both engines, play the Practice room, use Come back later, reload, and record every difference.

## Part B: the town read the code

### One finding checked by hand against the code (CAIRN) - SUSPECT, not run
- `resolveRequest` (index.html line 1122): `G.requests.splice(G.requests.indexOf(r), 1)`. If `r` is no longer in the list, indexOf is -1 and `splice(-1, 1)` removes the LAST request - the wrong one. How it could happen: a request times out and is auto-resolved (line 1120, 420 s) while its button is still on screen; the player then taps it (giveRequest -> resolveRequest). Smallest fix: `const i = G.requests.indexOf(r); if (i >= 0) G.requests.splice(i, 1);`. How bad: wrong (a different colonist's request vanishes).

### The Town Brain (35B): what will frustrate a real player in the first 10 minutes

**1. AR Start Failure / Silent Hang**
*   **What:** Browser blocks `camera-access` or WebXR isn't supported. The canvas may stay blank or grey while `webxr-polyfill` initializes, delaying the fallback.
*   **Why:** Players expect instant AR. A blank screen feels like a crash or broken install.
*   **Fix:** Add an immediate toast on `navigator.xr` check failure: "AR unavailable. Switching to Practice Room."

**2. Colony Refusal to Spawn (The "Nothing Happens" Loop)**
*   **What:** Player points at a surface, but no colony arrives. Caused by surfaces <0.08m², poor lighting dropping `na` below 2, or clutter masking the zone.
*   **Why:** The core loop is stalled. The player stares at the screen thinking the game is broken.
*   **Fix:** Add a subtle camera-guided hint: "Point at a flat surface (desk, table)." and ensure the surface turns green when the 0.08m² threshold is met with confidence.

**3. Phantom Zones & Mid-Air Buildings**
*   **What:** Scanner artifacts from estimated planes create fake zones. Colony or buildings spawn on walls, ceilings, or "thin air" between objects.
*   **Why:** Breaks immersion instantly. "Why is my camp on the wall?" signals broken technology.
*   **Fix:** Require `na >= 2` (trusted hits) for a zone to be eligible for settlement, or filter zones by `b.uu` (uuid presence) for AR surfaces.

**4. Premature "What is this?" Questions**
*   **What:** The game asks the player to name an object or confirm a detection within seconds of the colony landing.
*   **Why:** Cognitive overload. The player is still orienting; they haven't seen the colony or the joy of arrival yet. It feels nagging.
*   **Fix:** Gate `autoAskTick` behind `G.colonyAge > 15` seconds and `G.settlements.length > 0`.

**5. Build 7 "New Room?" False Positives**
*   **What:** After the migration to multi-room, the game incorrectly detects a new room or asks "New room?" when the player is stationary.
*   **Why:** Homing thresholds (`RELOC.cfg`) may be too sensitive during the initial scan warm-up before confident cells accumulate.
*   **Fix:** Increase `RELOC.cfg.askAfter` to 90s and tighten `relocVerify` overlap margin for the first 30s of a session.

**ONE LINE TEST:**
Test colony spawning and scanner reliability on a cluttered real-world desk under mixed lighting to confirm no phantom zones, no mid-air artifacts, and immediate, clear surface readiness feedback.

### The Town Brain: saving/loading, and away simulation + economy - NO ANSWER
- Both reads ran past their time limit (a thinking loop) and were stopped. The riskiest code has therefore NOT had a strong reader. A 77 KB file of the 72 riskiest functions is ready for a stronger reviewer.

### The 14B coder, pass 2 (it had to describe every function before judging) - LOW CONFIDENCE, UNCHECKED
- Pass 1 was discarded: it answered 'no bugs found' to all 70 pieces in seconds.
- Pass 2: 70 pieces read; 14 pieces produced reports.
- 10 reports were the same generic guess ('index out of bounds' - JavaScript does not crash on that) and are left out as noise.
- Kept below: 37 BUG lines and 27 SUSPECT lines. Expect most to be wrong; check each.

- [chunk_01] BUG | homesMigrate | Room name not updated | if (r1 && r1.name === 'My room') { ... } | wrong
- [chunk_28] BUG | runJob | c.job might be undefined | Trigger by calling runJob with a creature that has no job | crash
- [chunk_28] BUG | plantTree | S.spec might be undefined | Trigger by calling plantTree with a scenario that has no spec | crash
- [chunk_28] BUG | bubbleFor | G.requests might be undefined | Trigger by calling bubbleFor with a global state that has no requests | crash
- [chunk_29] BUG | simSettlement | Colonists can get stuck without food | if (c.spawn > 0) { c.spawn -= dt; continue; } | wrong
- [chunk_29] BUG | linkEnds | Returns null if settlement is lost or thing is dead | if (!Sa || !Sb || Sa.lost || Sb.lost || l.a.th.dead || l.b.th.dead) return null; | wrong
- [chunk_31] BUG | crossStep | Colonist gets stuck if cable car is not ready | When colonist is waiting for the cable car and it is not ready | wrong
- [chunk_40] BUG | prepareContinue | `mapFromJSON(md)` may return an error | If `md` is invalid JSON or `mapFromJSON` fails | crash
- [chunk_40] BUG | skipHours | `awaySim(h * 3600, hr)` may return an error | If `h` is negative or `hr` is undefined | crash
- [chunk_40] BUG | paintAll | `paintLand(Z)` may throw an error | If `Z` is invalid | crash
- [chunk_40] BUG | arIpadFix | `Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => ipadUA });` may fail | If `navigator` is not writable | crash
- [chunk_40] BUG | directInit | `if (DIRECT.off) return false;` may return false | If `DIRECT.off` is true | crash
- [chunk_40] BUG | directSend | `pr = D.w.hitTest(x, y, D.type);` may throw an error | If `D.w` is null or `hitTest` fails | crash
- [chunk_40] BUG | directHit | `SCAN.uids.get(h.uuid)` may return undefined | If `h.uuid` is not in `SCAN.uids` | crash
- [chunk_41] BUG | directCheckDone | AR.srcs and AR.hitSource might be undefined | Call directCheckDone with undefined AR.srcs or AR.hitSource | crash
- [chunk_41] BUG | directFrame | D.m might be undefined or not 16 elements long | Call directFrame with undefined AR.refSpace or AR.refSpace._inverseBaseMatrix | crash
- [chunk_41] BUG | arLog | $('arLog') and $('ui') might be undefined | Call arLog with undefined $('arLog') or $('ui') | crash
- [chunk_47] BUG | answerGuess | RECOG.ask filter condition might cause unexpected behavior | RECOG.cand.filter((c) => !(c.cls === g.cls && Math.hypot(c.x - g.x, c.z - g.z) < 0.12)); | wrong
- [chunk_53] BUG | worldMapAvailable | Returns false if AR.session is undefined | Switch to a room without AR support | Wrong
- [chunk_53] BUG | recTotem | Throws error if recT() returns undefined | Set recT() to return undefined | Crash
- [chunk_53] BUG | imgDel | Throws error if localStorage.removeItem fails | localStorage is full or quota exceeded | Crash
- [chunk_53] BUG | imgFromSource | Rejects promise if image has no dimensions | Load an image with zero width or height | Wrong
- [chunk_53] BUG | imgFromSource | Rejects promise if image fails to load | Load a non-existent image | Wrong
- [chunk_55] BUG | totemTemplate | Null reference error | const t = TOTEM.tpl[id]; if (t && t.at === rec.at) return t.ready ? t : null; | crash
- [chunk_56] BUG | totemCommit | Potential crash if G is undefined | if (!sp) { if (G.returning && !G.locked) return; | crash
- [chunk_59] BUG | updateTitle | Incorrect info if mapData or save is missing | loadMapData() and loadSave() | wrong
- [chunk_59] BUG | mapKnownJSON | Incorrect calculation if unrle fails | unrle() and z.land.st | wrong
- [chunk_59] BUG | previewReturn | Fails if prepareContinue fails | prepareContinue() and G.awayRes | wrong
- [chunk_59] BUG | startAuto | Fails if prepareContinue fails | prepareContinue() and G.zones.length | wrong
- [chunk_59] BUG | comeBackLater | Fails if persist or safeWrite fails | persist(true) and safeWrite(SAVE_KEY, JSON.stringify(sv)) | wrong
- [chunk_65] BUG | cardUi | Crashes if G.cur or G.settlements[0] is undefined | Switch to a room that doesn't exist | crash
- [chunk_65] BUG | rayAt | Crashes if AR.viewM or camera.matrixWorld is undefined | Enter AR mode without initializing AR | crash
- [chunk_65] BUG | groundPick | Does nothing if G.zones is empty | Delete all zones | wrong
- [chunk_65] BUG | planePick | Returns null if r.d.y is 0 | Look straight up or down | wrong
- [chunk_65] BUG | toScreen | Crashes if AR.viewInv or AR.projM is undefined | Enter AR mode without initializing AR | crash
- [chunk_65] BUG | colPick | Does nothing if G.settlements is empty | Delete all settlements | wrong
- [chunk_65] BUG | clearPreview | Crashes if preview is undefined | Call clearPreview without a preview | crash

- [chunk_01] SUSPECT | homesMigrate | Room migration fails silently | if (HOMES.rooms.length >= 8) break; | annoying
- [chunk_14] SUSPECT | loadJson | File not found | location.protocol === 'file:' | crash
- [chunk_14] SUSPECT | COUNCIL.ready | Invalid JSON data | adoptAlmanac(a) | wrong
- [chunk_14] SUSPECT | envUpdate | Invalid date | ENV.hourOverride !== null ? ENV.hourOverride : d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 | wrong
- [chunk_14] SUSPECT | setWxPick | Invalid weather preset | WX_PRESETS[k] | wrong
- [chunk_14] SUSPECT | applyWx | Invalid weather data | Object.assign(ENV.wx, { temp: u.temperature_2m, rain: Math.max(u.rain || 0, u.precipitation || 0) > 0 ? Math.min(1, 0.4 + (u.precipitation || 0)) : 0, cloud: (u.cloud_cover || 0) / 100, wind: (u.wind_speed_10m || 0) / 3.6, code: u.weather_code, real: true }); | wrong
- [chunk_14] SUSPECT | fetchWeather | API request failed | fetch(url).then((r) => r.json()).then((data) => { if (!data || !data.current) return; store.set('bc-wxcache', JSON.stringify({ at: Date.now(), lat: ENV.loc.lat, lon: ENV.loc.lon, data })); applyWx(data); toast('Weather updated: ' + Math.round(ENV.wx.temp) + '°C' + (ENV.rain ? ', raining' : '')); }).catch(() => { /* offline: no weather, no nagging */ })
- [chunk_29] SUSPECT | simSettlement | Scavenging might not work as expected if S.cols.length is 0 | if (S.stock.wood < 12 && S.cols.length) { S.scav = (S.scav || 0) + dt * S.cols.length / 25; while (S.scav >= 1 && S.stock.wood < 12) { S.scav -= 1; S.stock.wood++; } } | wrong
- [chunk_31] SUSPECT | zoneOfPoint | May return null if no zone is found | When a point is not within any zone | wrong
- [chunk_47] SUSPECT | unknownTops | G.zones or G.spots might be undefined or empty | G.zones and G.spots iteration | wrong
- [chunk_47] SUSPECT | askUnknown | Sorting and filtering might not work as expected | Sorting and filtering logic | wrong
- [chunk_47] SUSPECT | smartToggle | RECOG.clip state might not be as expected | RECOG.clip state checks | wrong
- [chunk_47] SUSPECT | clipEmbed | Image processing might fail | Image processing and embedding | crash
- [chunk_47] SUSPECT | clipScores | Softmax calculation might overflow | Softmax calculation | crash
- [chunk_47] SUSPECT | clipClassify | Embedding and scoring might fail | Embedding and scoring | crash
- [chunk_47] SUSPECT | screenBoxOf | Zone and screen coordinate conversion might fail | Zone and screen coordinate conversion | crash
- [chunk_47] SUSPECT | clipGuess | Recognition frame cropping and classification might fail | Recognition frame cropping and classification | crash
- [chunk_55] SUSPECT | totemFrame | Null reference error | const fr = recogFrame(); return fr && fr.real && fr.img ? fr : null; | crash
- [chunk_55] SUSPECT | totemSpot | Null reference error | return G.spots.find((s) => s.src === 'totem') || null; | crash
- [chunk_55] SUSPECT | totemWanted | Null reference error | if (!AR.on || !G.auto || G.phase === 'title') return null; | crash
- [chunk_55] SUSPECT | totemTick | Null reference error | if (!HOME_TOTEM) return; | crash
- [chunk_55] SUSPECT | totemRaycast | Null reference error | if (DIRECT.w && DIRECT.m) { return DIRECT.w.hitTest(fx, fy, DIRECT.type).then((hits) => { const h = hits && hits[0], w = h && h.world_transform, m = DIRECT.m; return w && m ? new THREE.Vector3(m[0] * w[12] + m[4] * w[13] + m[8] * w[14] + m[12], m[1] * w[12] + m[5] * w[13] + m[9] * w[14] + m[13], m[2] * w[12] + m[6] * w[13] + m[10] * w[14] + m[14]) : 
- [chunk_55] SUSPECT | totemSighting | Null reference error | const L = TOTEM.live; if (L && TOTEM.liveRoom === id && Math.hypot(L.x - p.x, L.z - p.z) < 0.15) { const n = Math.min(L.n, 4); L.x = (L.x * n + p.x) / (n + 1); L.y = (L.y * n + p.y) / (n + 1); L.z = (L.z * n + p.z) / (n + 1); L.n++; } else TOTEM.live = { x: p.x, y: p.y, z: p.z, n: 1 }; | crash
- [chunk_55] SUSPECT | totemP0 | Null reference error | const A = G.align; if (!A) return [L.x, L.y, L.z]; const c = Math.cos(A.phi), sn = Math.sin(A.phi), dx = L.x - A.tx, dz = L.z - A.tz; return [dx * c + dz * sn, L.y - A.dy, -dx * sn + dz * c]; | crash
- [chunk_56] SUSPECT | homePrecomp | Potential crash if homeMapData returns undefined | if (!md || mapFromJSON(md)) continue; | crash
- [chunk_56] SUSPECT | homePickStart | Potential crash if homeInfo returns undefined | const r = homeInfo(HOMES.cur); if (!r) return; | crash
- [chunk_56] SUSPECT | homeSummary | Potential crash if imgLoad returns undefined | r.totem = !!imgLoad('totem', r.id); | crash

## Part C: the honest count
| Reader | Asked to read | Useful output |
|---|---|---|
| Town Brain (35B) | 3 reads | 1 answered (first-10-minute frustrations); 2 timed out |
| 14B coder | 70 pieces, twice | pass 1 worthless; pass 2: 64 lines kept, 10 dropped as noise |
| Dell residents | 0 | not asked: the Dell was held by the Cathedral work |
| CAIRN | spot check | 1 suspect confirmed against the code |

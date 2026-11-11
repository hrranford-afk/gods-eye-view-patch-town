# PatchTown privacy (v0.1)

**Everything the app keeps stays on the device.** There are no accounts, ads, analytics or tracking.
Nothing is uploaded.

## What is stored, and where

| What | Where on the device |
|---|---|
| Room maps (ARKit world maps), if a game saves them | The app's Documents folder, `WorldMaps/<game>/` |
| Game saves (colonies, scores, settings, room outlines) | The app's web storage (localStorage / IndexedDB), one store per game |
| Base Camp field reports, optional totem photos and camera snapshots (small JPEGs) | Base Camp's web storage |
| Downloaded recognition models, if turned on in a game | The web view's cache |

Deleting the app deletes all of it.

Room maps contain ARKit's 3D points of the room. They are never sent anywhere.

## Camera

The camera shows the room behind the games and finds surfaces.
Some games look at camera pictures to recognise objects. That runs on the device. Pictures are not uploaded.

## Location

Only Base Camp may ask, and only while it is open. It is used for the local weather.
A rough position is sent to a weather service (open-meteo.com). Only the weather comes back.
Saying no is fine. The game works without it.

## Network

The games are inside the app. The app goes online only for:

- the weather (Base Camp, if location is allowed);
- recognition models (TensorFlow.js, COCO-SSD, transformers.js and CLIP), only when a game turns recognition on;
- web fonts (Google Fonts). Without internet the games use the device's fonts.

## For App Store Connect

- Tracking: No.
- Data collected: None (nothing leaves the device under the developer's control).
- Encryption: standard HTTPS only (`ITSAppUsesNonExemptEncryption = NO`).
- The privacy manifest is `PatchTown/Resources/PrivacyInfo.xcprivacy`.

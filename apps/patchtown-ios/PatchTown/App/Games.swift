// PatchTown: our own code.
//
// The games bundled in the app. Each one lives in the bundle at Games/<id>/ (copied there by
// scripts/sync-games.sh) and is opened at patchtown://<id>/index.html.

import Foundation
import SwiftUI

struct GameInfo: Identifiable, Hashable {
    let id: String
    let title: String
    let blurb: String
    let symbol: String
    let tint: Color

    var url: URL { URL(string: "\(GameResourceResolver.scheme)://\(id)/index.html")! }

    var folder: URL? {
        Bundle.main.resourceURL?.appendingPathComponent("Games", isDirectory: true).appendingPathComponent(id, isDirectory: true)
    }

    /// False when the build was made without running scripts/sync-games.sh.
    var isBundled: Bool {
        guard let folder else { return false }
        return FileManager.default.fileExists(atPath: folder.appendingPathComponent("index.html").path)
    }

    static let all: [GameInfo] = [
        GameInfo(
            id: "base-camp",
            title: "Base Camp",
            blurb: "A tiny colony settles the real surfaces of your room and keeps busy while you are away.",
            symbol: "tent.fill",
            tint: Color(red: 0.42, green: 0.55, blue: 0.33)
        ),
        GameInfo(
            id: "baguettes-and-ballistics",
            title: "Baguettes & Ballistics",
            blurb: "A toy war across the kitchen table. Drive, build and fire.",
            symbol: "fork.knife",
            tint: Color(red: 0.80, green: 0.45, blue: 0.20)
        ),
        GameInfo(
            id: "night-meet",
            title: "Night Meet",
            blurb: "A night-time car meet on your table or floor. Paint, tune and drift.",
            symbol: "car.fill",
            tint: Color(red: 0.30, green: 0.32, blue: 0.62)
        ),
    ]
}

/// Builds the web view's user agent. The polyfill only starts when the agent names iPad or iPhone and ends with
/// "Mobile/<build>" (no space after it), so "Mobile/15E148" must stay last.
enum PatchTownUserAgent {
    static func make(isPad: Bool, systemVersion: String, appVersion: String) -> String {
        let os = systemVersion.replacingOccurrences(of: ".", with: "_")
        let device = isPad ? "iPad; CPU OS \(os) like Mac OS X" : "iPhone; CPU iPhone OS \(os) like Mac OS X"
        return "Mozilla/5.0 (\(device)) AppleWebKit/605.1.15 (KHTML, like Gecko) PatchTown/\(appVersion) Mobile/15E148"
    }
}

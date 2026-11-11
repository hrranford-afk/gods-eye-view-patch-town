// PatchTown: our own code.
//
// One game, full screen, in the AR web view. A small native button in the top-left corner leaves AR
// (while AR runs) or goes back to the list of games.

import SwiftUI
import UIKit

struct GameView: View {
    let game: GameInfo

    @Environment(\.dismiss) private var dismiss
    @State private var isARActive = false

    /// One handler for every game (it only reads files from the app bundle).
    private static let schemeHandler = GameSchemeHandler()

    /// PatchTownBridge.js, injected after the polyfill.
    private static let bridgeScripts: [String] = {
        guard let url = Bundle.main.url(forResource: "PatchTownBridge", withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8) else {
            print("PatchTown: PatchTownBridge.js is missing from the app bundle")
            return []
        }
        return [source]
    }()

    @MainActor
    private static func userAgent() -> String {
        PatchTownUserAgent.make(
            isPad: UIDevice.current.userInterfaceIdiom == .pad,
            systemVersion: UIDevice.current.systemVersion,
            appVersion: (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0.1"
        )
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()

            ARWebView(
                startURL: game.url,
                schemeHandler: GameView.schemeHandler,
                extraScripts: GameView.bridgeScripts,
                userAgent: GameView.userAgent(),
                isARActive: $isARActive
            )
            .ignoresSafeArea()

            Button {
                if isARActive {
                    isARActive = false // ARWebView stops the session and reloads the page
                } else {
                    dismiss()
                }
            } label: {
                Label(isARActive ? "Exit AR" : "Games",
                      systemImage: isARActive ? "xmark.circle.fill" : "chevron.left")
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.ultraThinMaterial, in: Capsule())
                    .foregroundStyle(.primary)
            }
            .accessibilityLabel(isARActive ? "Exit AR" : "Back to games")
            .padding(.leading, 12)
            .padding(.top, 6)
            .opacity(0.85)
        }
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
    }
}

// PatchTown: our own code.

import SwiftUI

@main
struct PatchTownApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
        }
    }
}

/// Warm colours used by the home and About screens.
enum Warm {
    static let background = Color(red: 0.98, green: 0.94, blue: 0.86)
    static let card = Color(red: 1.0, green: 0.98, blue: 0.94)
    static let ink = Color(red: 0.27, green: 0.20, blue: 0.14)
    static let soft = Color(red: 0.50, green: 0.40, blue: 0.30)
    static let accent = Color(red: 0.80, green: 0.42, blue: 0.22)
}

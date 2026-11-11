// PatchTown: our own code.
//
// Credits: the PatchTown council residents (read from the games' own data files), each game's
// THIRD_PARTY / ASSETS notes (bundled next to the game), and the WebXRKit licence.

import SwiftUI

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    private var version: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"
        return "\(v) (\(b))"
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("PatchTown \(version)")
                        .font(.headline)
                    Text("Games made in PatchTown, a small town of AI residents and the people who look after them. "
                         + "Test build for invited testers.")
                        .font(.subheadline)
                }

                Section("Privacy") {
                    Text("No accounts, no tracking, no ads, no analytics. Camera pictures stay on this device. "
                         + "Room maps and saves are kept on this device only. Base Camp can ask for your rough "
                         + "location to show the local weather; only the weather comes back.")
                        .font(.subheadline)
                }

                Section("PatchTown council residents") {
                    let names = Credits.councilResidents()
                    if names.isEmpty {
                        Text("The PatchTown council").font(.subheadline)
                    } else {
                        ForEach(names, id: \.self) { Text($0).font(.subheadline) }
                    }
                }

                Section("Games: assets and code from others") {
                    ForEach(GameInfo.all) { game in
                        ForEach(Credits.files(for: game), id: \.name) { file in
                            DisclosureGroup("\(game.title): \(file.name)") {
                                Text(file.text)
                                    .font(.caption.monospaced())
                                    .textSelection(.enabled)
                            }
                        }
                    }
                }

                Section("App") {
                    ForEach(Credits.appFiles(), id: \.name) { file in
                        DisclosureGroup(file.name) {
                            Text(file.text)
                                .font(.caption.monospaced())
                                .textSelection(.enabled)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Warm.background.ignoresSafeArea())
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

enum Credits {
    struct File {
        let name: String
        let text: String
    }

    /// Every distinct "by" value in Base Camp's council data files (almanac, rooms, creatures).
    static func councilResidents() -> [String] {
        guard let folder = GameInfo.all.first(where: { $0.id == "base-camp" })?.folder else { return [] }
        var names = Set<String>()
        for file in ["almanac.json", "rooms.json", "creatures.json"] {
            guard let data = try? Data(contentsOf: folder.appendingPathComponent(file)),
                  let json = try? JSONSerialization.jsonObject(with: data) else { continue }
            collectBy(json, into: &names)
        }
        return names.sorted()
    }

    private static func collectBy(_ value: Any, into names: inout Set<String>) {
        if let dict = value as? [String: Any] {
            if let by = dict["by"] as? String, !by.isEmpty { names.insert(by) }
            for v in dict.values { collectBy(v, into: &names) }
        } else if let array = value as? [Any] {
            for v in array { collectBy(v, into: &names) }
        }
    }

    static func files(for game: GameInfo) -> [File] {
        guard let folder = game.folder else { return [] }
        return ["THIRD_PARTY.md", "ASSETS.md"].compactMap { name in
            guard let text = try? String(contentsOf: folder.appendingPathComponent(name), encoding: .utf8) else { return nil }
            return File(name: name, text: text)
        }
    }

    static func appFiles() -> [File] {
        let items: [(String, String, String)] = [
            ("Third-party notes", "THIRD_PARTY", "md"),
            ("WebXRKit licence (Apache 2.0)", "LICENSE", ""),
            ("WebXRKit notice", "NOTICE", ""),
        ]
        return items.compactMap { title, name, ext in
            let url = Bundle.main.url(forResource: name, withExtension: ext.isEmpty ? nil : ext)
            guard let url, let text = try? String(contentsOf: url, encoding: .utf8) else { return nil }
            return File(name: title, text: text)
        }
    }
}

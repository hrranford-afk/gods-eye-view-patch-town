// PatchTown: our own code.
//
// The home screen: a warm list of the bundled games, plus About. Each game opens full screen.

import SwiftUI

struct HomeView: View {
    @State private var openGame: GameInfo?
    @State private var showAbout = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Games for your room. Point the camera at a table or the floor.")
                        .font(.body)
                        .foregroundStyle(Warm.soft)
                        .padding(.bottom, 4)

                    ForEach(GameInfo.all) { game in
                        Button {
                            openGame = game
                        } label: {
                            GameRow(game: game)
                        }
                        .buttonStyle(.plain)
                        .disabled(!game.isBundled)
                    }

                    Button {
                        showAbout = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "info.circle")
                                .font(.title3)
                            Text("About")
                                .font(.headline)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(Warm.soft)
                        }
                        .foregroundStyle(Warm.ink)
                        .padding(16)
                        .background(Warm.card, in: RoundedRectangle(cornerRadius: 16))
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 8)
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Warm.background.ignoresSafeArea())
            .navigationTitle("PatchTown")
            .sheet(isPresented: $showAbout) {
                AboutView()
            }
        }
        .tint(Warm.accent)
        .fullScreenCover(item: $openGame) { game in
            GameView(game: game)
        }
    }
}

private struct GameRow: View {
    let game: GameInfo

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: game.symbol)
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 64, height: 64)
                .background(game.tint, in: RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 4) {
                Text(game.title)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Warm.ink)
                Text(game.isBundled ? game.blurb : "Not in this build (run scripts/sync-games.sh).")
                    .font(.subheadline)
                    .foregroundStyle(Warm.soft)
                    .multilineTextAlignment(.leading)
            }
            Spacer(minLength: 0)
            Image(systemName: "play.circle.fill")
                .font(.title)
                .foregroundStyle(game.isBundled ? Warm.accent : Warm.soft.opacity(0.4))
        }
        .padding(16)
        .background(Warm.card, in: RoundedRectangle(cornerRadius: 18))
        .shadow(color: Warm.ink.opacity(0.08), radius: 6, y: 2)
        .opacity(game.isBundled ? 1 : 0.6)
    }
}

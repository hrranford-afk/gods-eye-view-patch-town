// PatchTown: our own code.
//
// Serves the bundled games to WKWebView under patchtown://<game-id>/... so fetch()/XHR of JSON, GLB, HDR
// and images work (file:// would block them). All the path and MIME logic is in GameResourceResolver.
// Files are read synchronously inside start(), so there is never a reply after WebKit stopped the task
// (that would throw an exception). The biggest bundled file is a few MB, so this is fine.

import Foundation
import WebKit

final class GameSchemeHandler: NSObject, WKURLSchemeHandler {
    private let resolver: GameResourceResolver

    init(resolver: GameResourceResolver) {
        self.resolver = resolver
    }

    convenience override init() {
        let root = Bundle.main.resourceURL!.appendingPathComponent("Games", isDirectory: true)
        self.init(resolver: GameResourceResolver(gamesRoot: root))
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        let reply = resolver.response(for: url)
        guard let response = HTTPURLResponse(
            url: url, statusCode: reply.statusCode, httpVersion: "HTTP/1.1", headerFields: reply.headers
        ) else {
            urlSchemeTask.didFailWithError(URLError(.cannotParseResponse))
            return
        }
        if reply.statusCode >= 400 {
            print("PatchTown scheme: \(reply.statusCode) \(url.absoluteString)")
        }
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(reply.body)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Nothing to cancel: every reply is finished inside start().
    }
}

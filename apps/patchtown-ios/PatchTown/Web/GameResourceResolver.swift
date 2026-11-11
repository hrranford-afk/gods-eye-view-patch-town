// PatchTown: our own code.
//
// Maps patchtown:// URLs to files inside the app bundle's "Games" folder and builds the reply
// (status, headers, body). Plain Foundation only, no WebKit, so it can be unit tested
// (PatchTownTests/GameResourceResolverTests.swift).
//
// URL layout (one origin per game, so localStorage / IndexedDB stay separate per game):
//   patchtown://base-camp/index.html          -> Games/base-camp/index.html
//   patchtown://base-camp/                    -> Games/base-camp/index.html
//   patchtown://night-meet/assets/cars/a.glb  -> Games/night-meet/assets/cars/a.glb
//   patchtown://base-camp/_vendor/...         -> Games/_vendor/...   (shared offline libraries)
//
// HTML pages are served with known CDN script URLs rewritten to the bundled copy under
// /_vendor/ when (and only when) that copy exists, so the games run offline without edits.

import Foundation

struct GameResponse {
    let statusCode: Int
    let headers: [String: String]
    let body: Data
}

struct GameResourceResolver {
    static let scheme = "patchtown"
    static let vendorFolder = "_vendor"

    /// The bundle folder that holds one sub-folder per game plus "_vendor".
    let gamesRoot: URL

    /// CDN prefix -> path under Games/ (no leading slash). The sync script downloads into the same paths.
    static let cdnRewrites: [(prefix: String, local: String)] = [
        ("https://cdnjs.cloudflare.com/ajax/libs/", "_vendor/cdnjs/"),
        ("https://cdn.jsdelivr.net/npm/", "_vendor/jsdelivr/"),
    ]

    enum Failure: Error, Equatable {
        case badScheme
        case badGame
        case badPath
        case notFound
    }

    init(gamesRoot: URL) {
        self.gamesRoot = gamesRoot.standardizedFileURL
    }

    // MARK: - URL -> file

    /// Turns a patchtown:// URL into a file URL inside gamesRoot, or says why not.
    func fileURL(for url: URL) -> Result<URL, Failure> {
        guard url.scheme?.lowercased() == GameResourceResolver.scheme else { return .failure(.badScheme) }
        guard let host = url.host?.lowercased(), GameResourceResolver.isSafeGameID(host) else {
            return .failure(.badGame)
        }

        // url.path is already percent-decoded. Split and check every part.
        var parts = url.path.split(separator: "/", omittingEmptySubsequences: true).map(String.init)
        for part in parts {
            if part == "." || part == ".." || part.hasPrefix(".") || part.contains("\\") || part.contains("\0") {
                return .failure(.badPath)
            }
        }

        var base = gamesRoot
        if parts.first == GameResourceResolver.vendorFolder {
            base = gamesRoot.appendingPathComponent(GameResourceResolver.vendorFolder, isDirectory: true)
            parts.removeFirst()
            if parts.isEmpty { return .failure(.notFound) }
        } else {
            base = gamesRoot.appendingPathComponent(host, isDirectory: true)
        }

        var file = base
        for part in parts { file = file.appendingPathComponent(part) }
        if parts.isEmpty || url.hasDirectoryPath { file = file.appendingPathComponent("index.html") }
        file = file.standardizedFileURL

        // Belt and braces: the result must stay inside gamesRoot.
        let rootPath = gamesRoot.path.hasSuffix("/") ? gamesRoot.path : gamesRoot.path + "/"
        guard file.path.hasPrefix(rootPath) else { return .failure(.badPath) }

        var isDir: ObjCBool = false
        if FileManager.default.fileExists(atPath: file.path, isDirectory: &isDir), isDir.boolValue {
            file = file.appendingPathComponent("index.html")
        }
        guard FileManager.default.fileExists(atPath: file.path) else { return .failure(.notFound) }
        return .success(file)
    }

    static func isSafeGameID(_ id: String) -> Bool {
        guard !id.isEmpty, id.count <= 64, id != vendorFolder else { return false }
        return id.unicodeScalars.allSatisfy { c in
            (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c == "-"
        }
    }

    // MARK: - Reply

    func response(for url: URL) -> GameResponse {
        switch fileURL(for: url) {
        case .failure(let failure):
            let code = (failure == .notFound) ? 404 : 400
            return GameResponse(
                statusCode: code,
                headers: ["Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store"],
                body: Data("PatchTown: \(code == 404 ? "not found" : "bad request") \(url.path)".utf8)
            )
        case .success(let file):
            guard var data = try? Data(contentsOf: file) else {
                return GameResponse(statusCode: 404, headers: ["Content-Type": "text/plain; charset=utf-8"],
                                    body: Data("PatchTown: unreadable".utf8))
            }
            let ext = file.pathExtension.lowercased()
            if ext == "html" || ext == "htm", let text = String(data: data, encoding: .utf8) {
                let rewritten = GameResourceResolver.rewriteCDNURLs(in: text) { local in
                    var isDir: ObjCBool = false
                    let ok = FileManager.default.fileExists(atPath: self.gamesRoot.appendingPathComponent(local).path, isDirectory: &isDir)
                    return ok && !isDir.boolValue
                }
                data = Data(rewritten.utf8)
            }
            return GameResponse(
                statusCode: 200,
                headers: [
                    "Content-Type": GameResourceResolver.contentType(forExtension: ext),
                    "Content-Length": String(data.count),
                    "Cache-Control": "no-cache",
                    "Access-Control-Allow-Origin": "*",
                ],
                body: data
            )
        }
    }

    // MARK: - MIME types

    static let mimeTypes: [String: String] = [
        "html": "text/html", "htm": "text/html",
        "js": "text/javascript", "mjs": "text/javascript",
        "json": "application/json", "css": "text/css",
        "txt": "text/plain", "md": "text/markdown", "csv": "text/csv",
        "glb": "model/gltf-binary", "gltf": "model/gltf+json", "bin": "application/octet-stream",
        "hdr": "image/vnd.radiance", "exr": "image/x-exr",
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp",
        "gif": "image/gif", "svg": "image/svg+xml", "ico": "image/x-icon", "ktx2": "image/ktx2",
        "wasm": "application/wasm", "onnx": "application/octet-stream",
        "mp3": "audio/mpeg", "ogg": "audio/ogg", "wav": "audio/wav", "m4a": "audio/mp4",
        "mp4": "video/mp4", "webm": "video/webm",
        "woff": "font/woff", "woff2": "font/woff2", "ttf": "font/ttf", "otf": "font/otf",
    ]

    static let textExtensions: Set<String> = ["html", "htm", "js", "mjs", "json", "css", "txt", "md", "csv", "svg", "gltf"]

    static func contentType(forExtension ext: String) -> String {
        let e = ext.lowercased()
        let base = mimeTypes[e] ?? "application/octet-stream"
        return textExtensions.contains(e) ? base + "; charset=utf-8" : base
    }

    // MARK: - CDN -> bundled copy

    /// Replaces every "https://<known CDN>/<rest>" in the page with "/_vendor/<cdn>/<rest>" when
    /// `exists("_vendor/<cdn>/<rest without query>")` says the bundled copy is there. Everything else is left alone
    /// (so a missing copy still loads from the CDN when online).
    /// Characters that end a URL inside HTML or JS ("\r\n" is one Character in Swift, so it is listed too).
    static let urlTerminators: Set<Character> = ["\"", "'", "`", " ", "\t", "\r", "\n", "\r\n", ")", ">", "<"]

    static func rewriteCDNURLs(in html: String, exists: (String) -> Bool) -> String {
        var text = html
        for rule in cdnRewrites {
            var result = ""
            result.reserveCapacity(text.utf8.count)
            var cursor = text.startIndex
            while let r = text.range(of: rule.prefix, range: cursor..<text.endIndex) {
                var end = r.upperBound
                while end < text.endIndex, !urlTerminators.contains(text[end]) { end = text.index(after: end) }
                result += text[cursor..<r.lowerBound]
                let rest = String(text[r.upperBound..<end])
                let restNoQuery = rest.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)[0]
                    .split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)[0]
                let local = rule.local + String(restNoQuery)
                let safe = !restNoQuery.isEmpty && !restNoQuery.hasSuffix("/")
                    && !restNoQuery.split(separator: "/").contains("..")
                if safe && exists(local) {
                    result += "/" + local
                } else {
                    result += text[r.lowerBound..<end]
                }
                cursor = end
            }
            result += text[cursor...]
            text = result
        }
        return text
    }
}

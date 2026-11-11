// PatchTown: our own code. Logic tests for the patchtown:// file server (run with Cmd-U in Xcode,
// or: xcodebuild test -project PatchTown.xcodeproj -scheme PatchTown -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M2)').

import XCTest

final class GameResourceResolverTests: XCTestCase {
    private var root: URL!
    private var resolver: GameResourceResolver!

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent("pt-games-\(UUID().uuidString)", isDirectory: true)
        let fm = FileManager.default
        try fm.createDirectory(at: root.appendingPathComponent("base-camp/assets", isDirectory: true), withIntermediateDirectories: true)
        try fm.createDirectory(at: root.appendingPathComponent("night-meet/assets/cars", isDirectory: true), withIntermediateDirectories: true)
        try fm.createDirectory(at: root.appendingPathComponent("_vendor/cdnjs/three.js/r128", isDirectory: true), withIntermediateDirectories: true)
        let page = "<html><script src=\"https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js\"></script>"
            + "<script src=\"https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js\"></script></html>"
        try Data(page.utf8)
            .write(to: root.appendingPathComponent("base-camp/index.html"))
        try Data("{\"a\":1}".utf8).write(to: root.appendingPathComponent("base-camp/rooms.json"))
        try Data("x".utf8).write(to: root.appendingPathComponent("base-camp/assets/a b.png"))
        try Data([0x67, 0x6c, 0x54, 0x46]).write(to: root.appendingPathComponent("night-meet/assets/cars/q_Taxi.glb"))
        try Data("#?RADIANCE".utf8).write(to: root.appendingPathComponent("night-meet/assets/sky.hdr"))
        try Data("<html>nm</html>".utf8).write(to: root.appendingPathComponent("night-meet/index.html"))
        try Data("// three".utf8).write(to: root.appendingPathComponent("_vendor/cdnjs/three.js/r128/three.min.js"))
        try Data("secret".utf8).write(to: root.appendingPathComponent("outside.txt"))
        resolver = GameResourceResolver(gamesRoot: root)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: root)
    }

    private func path(_ s: String) -> String? {
        guard case .success(let url) = resolver.fileURL(for: URL(string: s)!) else { return nil }
        return String(url.path.dropFirst(root.standardizedFileURL.path.count))
    }

    private func failure(_ s: String) -> GameResourceResolver.Failure? {
        guard case .failure(let f) = resolver.fileURL(for: URL(string: s)!) else { return nil }
        return f
    }

    func testMapsGameFiles() {
        XCTAssertEqual(path("patchtown://base-camp/index.html"), "/base-camp/index.html")
        XCTAssertEqual(path("patchtown://base-camp/"), "/base-camp/index.html")
        XCTAssertEqual(path("patchtown://base-camp"), "/base-camp/index.html")
        XCTAssertEqual(path("patchtown://base-camp/rooms.json?v=2#x"), "/base-camp/rooms.json")
        XCTAssertEqual(path("patchtown://base-camp/assets/a%20b.png"), "/base-camp/assets/a b.png")
        XCTAssertEqual(path("patchtown://night-meet/assets/cars/q_Taxi.glb"), "/night-meet/assets/cars/q_Taxi.glb")
        XCTAssertEqual(path("PATCHTOWN://Night-Meet/index.html"), "/night-meet/index.html")
    }

    func testVendorFolderIsSharedByAllGames() {
        XCTAssertEqual(path("patchtown://base-camp/_vendor/cdnjs/three.js/r128/three.min.js"), "/_vendor/cdnjs/three.js/r128/three.min.js")
        XCTAssertEqual(path("patchtown://night-meet/_vendor/cdnjs/three.js/r128/three.min.js"), "/_vendor/cdnjs/three.js/r128/three.min.js")
    }

    func testRefusesEscapesAndOddHosts() {
        XCTAssertEqual(failure("patchtown://base-camp/../outside.txt"), .badPath)
        XCTAssertEqual(failure("patchtown://base-camp/%2E%2E/outside.txt"), .badPath)
        XCTAssertEqual(failure("patchtown://base-camp/.hidden"), .badPath)
        XCTAssertEqual(failure("patchtown://_vendor/x.js"), .badGame)
        XCTAssertEqual(failure("patchtown://bad_host/index.html"), .badGame)
        XCTAssertEqual(failure("https://base-camp/index.html"), .badScheme)
        XCTAssertEqual(failure("patchtown://base-camp/missing.json"), .notFound)
        XCTAssertEqual(failure("patchtown://nope/index.html"), .notFound)
    }

    func testResponsesHaveTheRightTypes() {
        func type(_ s: String) -> String? { resolver.response(for: URL(string: s)!).headers["Content-Type"] }
        XCTAssertEqual(type("patchtown://base-camp/index.html"), "text/html; charset=utf-8")
        XCTAssertEqual(type("patchtown://base-camp/rooms.json"), "application/json; charset=utf-8")
        XCTAssertEqual(type("patchtown://night-meet/assets/cars/q_Taxi.glb"), "model/gltf-binary")
        XCTAssertEqual(type("patchtown://night-meet/assets/sky.hdr"), "image/vnd.radiance")
        XCTAssertEqual(type("patchtown://base-camp/assets/a%20b.png"), "image/png")
        XCTAssertEqual(resolver.response(for: URL(string: "patchtown://base-camp/nope.js")!).statusCode, 404)
        XCTAssertEqual(resolver.response(for: URL(string: "patchtown://base-camp/../outside.txt")!).statusCode, 400)
        let ok = resolver.response(for: URL(string: "patchtown://base-camp/rooms.json")!)
        XCTAssertEqual(ok.statusCode, 200)
        XCTAssertEqual(ok.headers["Content-Length"], "7")
    }

    func testMimeTable() {
        XCTAssertEqual(GameResourceResolver.contentType(forExtension: "JS"), "text/javascript; charset=utf-8")
        XCTAssertEqual(GameResourceResolver.contentType(forExtension: "gltf"), "model/gltf+json; charset=utf-8")
        XCTAssertEqual(GameResourceResolver.contentType(forExtension: "jpg"), "image/jpeg")
        XCTAssertEqual(GameResourceResolver.contentType(forExtension: "wasm"), "application/wasm")
        XCTAssertEqual(GameResourceResolver.contentType(forExtension: "weird"), "application/octet-stream")
    }

    func testHTMLIsServedWithBundledThreeJS() {
        let reply = resolver.response(for: URL(string: "patchtown://base-camp/index.html")!)
        let html = String(data: reply.body, encoding: .utf8) ?? ""
        XCTAssertTrue(html.contains("src=\"/_vendor/cdnjs/three.js/r128/three.min.js\""), html)
        // Not bundled: left pointing at the CDN.
        XCTAssertTrue(html.contains("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"), html)
    }

    func testRewriteRules() {
        let have: Set<String> = ["_vendor/jsdelivr/three@0.128.0/examples/js/loaders/GLTFLoader.js"]
        let input = "<script src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js?x=1'></script>\r\n"
            + "const base = \"https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/dist/\";\n"
            + "x(`https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js`)"
        let out = GameResourceResolver.rewriteCDNURLs(in: input) { have.contains($0) }
        XCTAssertEqual(out,
            "<script src='/_vendor/jsdelivr/three@0.128.0/examples/js/loaders/GLTFLoader.js'></script>\r\n"
            + "const base = \"https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/dist/\";\n"
            + "x(`/_vendor/jsdelivr/three@0.128.0/examples/js/loaders/GLTFLoader.js`)")
        XCTAssertEqual(GameResourceResolver.rewriteCDNURLs(in: "no urls here") { _ in true }, "no urls here")
        XCTAssertEqual(GameResourceResolver.rewriteCDNURLs(in: "\"https://cdn.jsdelivr.net/npm/../x.js\"") { _ in true },
                       "\"https://cdn.jsdelivr.net/npm/../x.js\"")
    }

    func testUserAgentPassesThePolyfillCheck() {
        for isPad in [true, false] {
            let ua = PatchTownUserAgent.make(isPad: isPad, systemVersion: "17.5.1", appVersion: "0.1.0")
            // webxr-polyfill.js: (iPhone or iPad) && "Mobile/" && "AppleWebKit" && no space after "Mobile/"
            XCTAssertTrue(ua.contains(isPad ? "iPad" : "iPhone"))
            XCTAssertTrue(ua.contains("AppleWebKit"))
            let mobile = ua.range(of: "Mobile/")!
            XCTAssertFalse(ua[mobile.upperBound...].contains(" "), ua)
            XCTAssertTrue(ua.hasSuffix("Mobile/15E148"))
            XCTAssertTrue(ua.contains("17_5_1"))
        }
    }
}

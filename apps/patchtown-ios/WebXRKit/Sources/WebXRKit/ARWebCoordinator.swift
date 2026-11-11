// Modified by PatchTown (2026): from WebXRKit (https://github.com/wem-technology/ios-webxr, Apache-2.0).
// Changes: ARKit world maps per room (getWorldMap / setWorldMap / ptWorldMap, saved natively under a key),
// relocalisation and world-mapping status reported to JS, hit results carry "estimated" and plane
// "classification", an opt-in throttled ARPlaneAnchor stream (ptPlanes), camera matrices and camera frames
// follow the interface orientation (portrait and landscape), safe JS string escaping, an `onExit` hook.

import Foundation
import UIKit
import ARKit
import SceneKit
import WebKit

@MainActor
public class ARWebCoordinator: NSObject, WKNavigationDelegate, ARSessionDelegate, WKScriptMessageHandler {
    weak var webView: WKWebView?
    weak var arView: ARSCNView?
    var dataCallbackName: String?
    var isSessionRunning = false

    var isCameraAccessRequested = false

    var onSessionActiveChanged: ((Bool) -> Void)?
    var onNavigationChanged: (() -> Void)?

    private let cameraProcessor = ARCameraFrameProcessor()

    private var isJsProcessingFrame = false

    // PatchTown: world map state
    private var pendingInitialWorldMap: ARWorldMap?
    private var awaitingRelocalization = false
    private var lastMappingStatus: String = ""
    private var lastTrackingState: String = ""

    // PatchTown: plane stream state (off until the page asks)
    private var planesEnabled = false
    private var planeMinInterval: TimeInterval = 0.25 // at most 4 Hz
    private var lastPlaneSend: TimeInterval = 0
    private var pendingPlanes: [UUID: ARPlaneAnchor] = [:]
    private var removedPlaneIDs: Set<UUID> = []
    private var planeResetPending = false

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        onNavigationChanged?()
    }

    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        onNavigationChanged?()
    }

    public func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        onNavigationChanged?()
    }

    // PatchTown: only bundled games (patchtown://) load inside the web view. Web links open in Safari.
    public func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.cancel)
            return
        }
        switch scheme {
        case "patchtown", "about", "blob", "data":
            decisionHandler(.allow)
        case "http", "https":
            // Sub-frames (e.g. a font CSS) are not navigations we care about; main-frame links leave the app.
            if navigationAction.targetFrame?.isMainFrame ?? true {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        default:
            decisionHandler(.cancel)
        }
    }

    public func userContentController(
        _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any] else { return }

        if let errorMsg = body["error_message"] as? String {
            print("JS Error: \(errorMsg)")
            return
        }

        switch message.name {
        case "initAR":
            if let callback = body["callback"] as? String {
                replyToJS(callback: callback, data: "ios-ar-device-id")
            }
        case "requestSession":
            if let options = body["options"] as? [String: Any],
               let callbackName = body["data_callback"] as? String
            {
                self.dataCallbackName = callbackName

                self.isCameraAccessRequested = options["computer_vision_data"] as? Bool ?? false
                if options["patchtown_planes"] as? Bool == true { setPlanesEnabled(true, hz: 4) }

                self.startARSession(options: options)
                self.onSessionActiveChanged?(true)

                if let responseCallback = body["callback"] as? String {
                    replyToJS(
                        callback: responseCallback,
                        data: [
                            "cameraAccess": self.isCameraAccessRequested,
                            "worldAccess": true,
                            "webXRAccess": true
                        ]
                    )
                }
            }
        case "stopAR":
            self.stopSession(notifyJS: false)

        case "hitTest":
            if let x = body["x"] as? Double,
               let y = body["y"] as? Double,
               let callback = body["callback"] as? String {
                self.performHitTest(x: x, y: y, callback: callback)
            }

        // PatchTown: world maps. "getWorldMap" / "setWorldMap" match the polyfill's nonStandard_* hooks
        // (base64 in the reply / message). With a "key" they save to / load from the app's Documents instead.
        case "getWorldMap":
            saveWorldMap(key: body["key"] as? String, callback: body["callback"] as? String)
        case "setWorldMap":
            loadWorldMap(key: body["key"] as? String, base64: body["worldMap"] as? String,
                         callback: body["callback"] as? String)
        case "ptWorldMap":
            handleWorldMapStore(body)

        // PatchTown: opt-in plane stream.
        case "ptPlanes":
            let enabled = body["enabled"] as? Bool ?? false
            let hz = body["hz"] as? Double ?? 4
            setPlanesEnabled(enabled, hz: hz)
            if let callback = body["callback"] as? String {
                replyToJS(callback: callback, data: ["enabled": planesEnabled, "hz": 1.0 / planeMinInterval])
            }

        default: break
        }
    }

    private func makeConfiguration() -> ARWorldTrackingConfiguration {
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        return config
    }

    public func startARSession(options: [String: Any]) {
        let config = makeConfiguration()
        if let map = pendingInitialWorldMap {
            config.initialWorldMap = map
            pendingInitialWorldMap = nil
            awaitingRelocalization = true
        } else {
            awaitingRelocalization = false
        }
        arView?.session.run(config, options: [.resetTracking, .removeExistingAnchors])
        isSessionRunning = true
        lastMappingStatus = ""
        lastTrackingState = ""
    }

    public func stopSession(notifyJS: Bool = true) {
        guard isSessionRunning else { return }
        isSessionRunning = false
        isCameraAccessRequested = false
        awaitingRelocalization = false
        arView?.session.pause()
        self.onSessionActiveChanged?(false)
        print("AR Session stopped. Reloading web page.")
        webView?.reload()
    }

    /// PatchTown: called when the game screen closes. Stops the camera without reloading anything.
    public func tearDown() {
        isSessionRunning = false
        isCameraAccessRequested = false
        planesEnabled = false
        arView?.session.pause()
        webView?.configuration.userContentController.removeAllScriptMessageHandlers()
    }

    func performHitTest(x: Double, y: Double, callback: String) {
        guard let arView = arView else { return }

        let point = CGPoint(
            x: CGFloat(x) * arView.bounds.width,
            y: CGFloat(y) * arView.bounds.height
        )

        var results: [ARRaycastResult] = []
        var estimated = false
        if let query = arView.raycastQuery(from: point, allowing: .existingPlaneGeometry, alignment: .any) {
            results = arView.session.raycast(query)
        }
        if results.isEmpty {
            if let query = arView.raycastQuery(from: point, allowing: .estimatedPlane, alignment: .any) {
                results = arView.session.raycast(query)
                estimated = true
            }
        }

        var hitsPayload: [[String: Any]] = []
        for result in results {
            let tf = result.worldTransform
            var hitData: [String: Any] = ["world_transform": toArray(tf)]
            if let anchor = result.anchor {
                hitData["uuid"] = anchor.identifier.uuidString
            }
            // PatchTown: hit quality. Estimated-plane hits are guesses (often beyond a real edge).
            if estimated || result.target == .estimatedPlane {
                hitData["estimated"] = true
            }
            if let plane = result.anchor as? ARPlaneAnchor {
                hitData["alignment"] = plane.alignment == .vertical ? "vertical" : "horizontal"
                if ARPlaneAnchor.isClassificationSupported {
                    hitData["classification"] = Self.classificationName(plane.classification)
                }
            }
            hitsPayload.append(hitData)
        }
        replyToJS(callback: callback, data: hitsPayload)
    }

    nonisolated public func session(_ session: ARSession, didUpdate frame: ARFrame) {
        MainActor.assumeIsolated { [weak self] in
            guard let self = self else { return }

            // PatchTown: status changes and plane batches are sent even when the JS frame bridge is busy.
            self.reportMappingStatus(frame.worldMappingStatus)
            self.flushPlanesIfDue(now: frame.timestamp)

            // If the JS bridge is still busy with the previous frame, we skip this update.
            // This prevents "frame piling" which is the primary cause of AR wobble.
            guard isSessionRunning,
                  !isJsProcessingFrame,
                  let webView = self.webView,
                  let callbackName = self.dataCallbackName
            else { return }

            isJsProcessingFrame = true

            // PatchTown: follow the screen orientation (the app supports portrait and landscape).
            let orientation = webView.window?.windowScene?.interfaceOrientation ?? .portrait
            let viewportSize = webView.bounds.size

            // 1. Calculate Matrices
            let viewMatrix = frame.camera.viewMatrix(for: orientation)
            let cameraTransform = viewMatrix.inverse
            let projMatrix = frame.camera.projectionMatrix(
                for: orientation,
                viewportSize: viewportSize,
                zNear: 0.01,
                zFar: 1000
            )

            // 2. Start building JS Command
            var jsCommand = "if(!window.NativeARData){window.NativeARData={};}"
            jsCommand += "window.NativeARData.timestamp = \(frame.timestamp * 1000);"
            jsCommand += "window.NativeARData.light_intensity = \(frame.lightEstimate?.ambientIntensity ?? 1000);"
            jsCommand += "window.NativeARData.camera_transform = \(fastFloatArrayToString(cameraTransform));"
            jsCommand += "window.NativeARData.camera_view = \(fastFloatArrayToString(viewMatrix));"
            jsCommand += "window.NativeARData.projection_camera = \(fastFloatArrayToString(projMatrix));"
            jsCommand += "window.NativeARData.worldMappingStatus = '\(Self.polyfillMappingName(frame.worldMappingStatus))';"

            // 3. Delegate Video Processing
            let conversionResult = cameraProcessor.process(
                frame: frame,
                viewportSize: viewportSize,
                isCameraAccessRequested: isCameraAccessRequested,
                interfaceOrientation: orientation
            )

            if let result = conversionResult {
                jsCommand += "window.NativeARData.video_data = '\(result.base64)';"
                jsCommand += "window.NativeARData.video_width = \(result.width);"
                jsCommand += "window.NativeARData.video_height = \(result.height);"
                jsCommand += "window.NativeARData.video_updated = true;"
            } else {
                jsCommand += "window.NativeARData.video_updated = false;"
            }

            jsCommand += "\(callbackName)();"

            // Execute and wait for completion before allowing the next frame
            webView.evaluateJavaScript(jsCommand) { [weak self] _, _ in
                Task { @MainActor in
                    self?.isJsProcessingFrame = false
                }
            }
        }
    }

    // MARK: - PatchTown: tracking / relocalisation

    nonisolated public func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
        let name = Self.trackingName(camera.trackingState)
        let isNormal: Bool
        if case .normal = camera.trackingState { isNormal = true } else { isNormal = false }
        MainActor.assumeIsolated { [weak self] in
            guard let self = self, name != self.lastTrackingState else { return }
            self.lastTrackingState = name
            var detail: [String: Any] = ["type": "tracking", "tracking": name]
            if isNormal && self.awaitingRelocalization {
                self.awaitingRelocalization = false
                detail["relocalized"] = true
                self.sendEvent("worldmap", ["type": "relocalized", "relocalized": true, "tracking": name])
            }
            self.sendEvent("worldmap", detail)
        }
    }

    nonisolated public func sessionShouldAttemptRelocalization(_ session: ARSession) -> Bool {
        return true
    }

    private func reportMappingStatus(_ status: ARFrame.WorldMappingStatus) {
        let name = Self.mappingName(status)
        guard name != lastMappingStatus else { return }
        lastMappingStatus = name
        sendEvent("worldmap", ["type": "mapping", "mapping": name])
    }

    // MARK: - PatchTown: world maps

    /// Documents/WorldMaps/<game id>/<key>.arworldmap. The game id comes from the page's own URL host,
    /// so one game cannot read or overwrite another game's rooms.
    private func worldMapFileURL(key: String) -> URL? {
        guard let safeKey = Self.safeFileKey(key) else { return nil }
        let game = Self.safeFileKey(webView?.url?.host ?? "") ?? "unknown"
        guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return nil }
        let dir = docs.appendingPathComponent("WorldMaps", isDirectory: true).appendingPathComponent(game, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent(safeKey + ".arworldmap")
    }

    static func safeFileKey(_ key: String) -> String? {
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
        let cleaned = String(key.unicodeScalars.map { allowed.contains($0) ? Character($0) : "_" })
        let trimmed = cleaned.trimmingCharacters(in: CharacterSet(charactersIn: "."))
        guard !trimmed.isEmpty, trimmed.count <= 96 else { return nil }
        return trimmed
    }

    /// With a key: saves the current map to disk and replies {saved, key, bytes, mapping, worldMap:{key}}.
    /// Without a key (the polyfill's nonStandard_getWorldMap): replies {saved, worldMap:{worldMap:<base64>}, error}.
    private func saveWorldMap(key: String?, callback: String?) {
        guard let session = arView?.session, isSessionRunning else {
            if let callback { replyToJS(callback: callback, data: ["saved": false, "error": "AR is not running"]) }
            return
        }
        let fileURL: URL? = key.flatMap { worldMapFileURL(key: $0) }
        if key != nil && fileURL == nil {
            if let callback { replyToJS(callback: callback, data: ["saved": false, "error": "bad key"]) }
            return
        }
        let mapping = lastMappingStatus
        session.getCurrentWorldMap { [weak self] map, error in
            var reply: [String: Any] = ["saved": false, "mapping": mapping]
            if let map {
                do {
                    let data = try NSKeyedArchiver.archivedData(withRootObject: map, requiringSecureCoding: true)
                    if let fileURL, let key {
                        try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
                        reply = ["saved": true, "key": key, "bytes": data.count, "mapping": mapping,
                                 "worldMap": ["key": key], "error": NSNull()]
                    } else {
                        reply = ["saved": true, "bytes": data.count, "mapping": mapping,
                                 "worldMap": ["worldMap": data.base64EncodedString()], "error": NSNull()]
                    }
                } catch {
                    reply["error"] = "could not save the map: \(error.localizedDescription)"
                }
            } else {
                reply["error"] = error?.localizedDescription ?? "ARKit has no map yet (look around more)"
            }
            let finalReply = reply
            Task { @MainActor in
                if let callback { self?.replyToJS(callback: callback, data: finalReply) }
            }
        }
    }

    /// Loads a map (by key from disk, or from base64) and relaunches the session with it. ARKit then
    /// relocalises by itself; the page hears "relocalized" through PatchTownNative events.
    /// If AR is not running yet, the map is kept and used when the session starts.
    private func loadWorldMap(key: String?, base64: String?, callback: String?) {
        var data: Data? = nil
        if let key {
            if let url = worldMapFileURL(key: key) { data = try? Data(contentsOf: url) }
        } else if let base64 {
            data = Data(base64Encoded: base64)
        }
        guard let data else {
            if let callback { replyToJS(callback: callback, data: ["loaded": false, "error": "no saved map"]) }
            return
        }
        let map: ARWorldMap?
        do {
            map = try NSKeyedUnarchiver.unarchivedObject(ofClass: ARWorldMap.self, from: data)
        } catch {
            map = nil
        }
        guard let map else {
            if let callback { replyToJS(callback: callback, data: ["loaded": false, "error": "the saved map could not be read"]) }
            return
        }
        let keyJS: Any = key.map { $0 as Any } ?? NSNull()
        if isSessionRunning, let session = arView?.session {
            let config = makeConfiguration()
            config.initialWorldMap = map
            awaitingRelocalization = true
            pendingPlanes.removeAll()
            removedPlaneIDs.removeAll()
            planeResetPending = true
            session.run(config, options: [.resetTracking, .removeExistingAnchors])
            sendEvent("worldmap", ["type": "relocalizing", "key": keyJS])
            if let callback { replyToJS(callback: callback, data: ["loaded": true, "started": true, "key": keyJS]) }
        } else {
            pendingInitialWorldMap = map
            if let callback { replyToJS(callback: callback, data: ["loaded": true, "started": false, "pending": true, "key": keyJS]) }
        }
    }

    /// ptWorldMap {action: save | load | has | remove | list, key}
    private func handleWorldMapStore(_ body: [String: Any]) {
        let action = body["action"] as? String ?? ""
        let key = body["key"] as? String
        let callback = body["callback"] as? String
        switch action {
        case "save":
            guard let key else { if let callback { replyToJS(callback: callback, data: ["saved": false, "error": "no key"]) }; return }
            saveWorldMap(key: key, callback: callback)
        case "load":
            guard let key else { if let callback { replyToJS(callback: callback, data: ["loaded": false, "error": "no key"]) }; return }
            loadWorldMap(key: key, base64: nil, callback: callback)
        case "has":
            var reply: [String: Any] = ["exists": false]
            if let key, let url = worldMapFileURL(key: key),
               let attrs = try? FileManager.default.attributesOfItem(atPath: url.path) {
                reply["exists"] = true
                reply["bytes"] = (attrs[.size] as? NSNumber)?.intValue ?? 0
                if let date = attrs[.modificationDate] as? Date { reply["modified"] = date.timeIntervalSince1970 * 1000 }
            }
            if let callback { replyToJS(callback: callback, data: reply) }
        case "remove":
            var removed = false
            if let key, let url = worldMapFileURL(key: key) { removed = (try? FileManager.default.removeItem(at: url)) != nil }
            if let callback { replyToJS(callback: callback, data: ["removed": removed]) }
        case "list":
            var keys: [String] = []
            if let probe = worldMapFileURL(key: "probe") {
                let dir = probe.deletingLastPathComponent()
                let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
                keys = names.filter { $0.hasSuffix(".arworldmap") }.map { String($0.dropLast(".arworldmap".count)) }.sorted()
            }
            if let callback { replyToJS(callback: callback, data: ["keys": keys]) }
        default:
            if let callback { replyToJS(callback: callback, data: ["error": "unknown action"]) }
        }
    }

    // MARK: - PatchTown: plane stream

    private func setPlanesEnabled(_ enabled: Bool, hz: Double) {
        planesEnabled = enabled
        planeMinInterval = 1.0 / max(0.5, min(4.0, hz)) // never faster than 4 Hz
        pendingPlanes.removeAll()
        removedPlaneIDs.removeAll()
        if enabled, let anchors = arView?.session.currentFrame?.anchors {
            planeResetPending = true
            for case let plane as ARPlaneAnchor in anchors { pendingPlanes[plane.identifier] = plane }
            lastPlaneSend = 0
        }
    }

    nonisolated public func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        let planes = anchors.compactMap { $0 as? ARPlaneAnchor }
        guard !planes.isEmpty else { return }
        MainActor.assumeIsolated { [weak self] in self?.queuePlanes(planes) }
    }

    nonisolated public func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        let planes = anchors.compactMap { $0 as? ARPlaneAnchor }
        guard !planes.isEmpty else { return }
        MainActor.assumeIsolated { [weak self] in self?.queuePlanes(planes) }
    }

    nonisolated public func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        let ids = anchors.compactMap { ($0 as? ARPlaneAnchor)?.identifier }
        guard !ids.isEmpty else { return }
        MainActor.assumeIsolated { [weak self] in
            guard let self = self, self.planesEnabled else { return }
            for id in ids {
                self.pendingPlanes.removeValue(forKey: id)
                self.removedPlaneIDs.insert(id)
            }
        }
    }

    private func queuePlanes(_ planes: [ARPlaneAnchor]) {
        guard planesEnabled else { return }
        for plane in planes {
            pendingPlanes[plane.identifier] = plane
            removedPlaneIDs.remove(plane.identifier)
        }
    }

    private func flushPlanesIfDue(now: TimeInterval) {
        guard planesEnabled, isSessionRunning else { return }
        guard !pendingPlanes.isEmpty || !removedPlaneIDs.isEmpty || planeResetPending else { return }
        guard now - lastPlaneSend >= planeMinInterval else { return }
        lastPlaneSend = now
        let updated = pendingPlanes.values.map { Self.planeDictionary($0) }
        let removed = removedPlaneIDs.map { $0.uuidString }
        let payload: [String: Any] = ["type": "planes", "reset": planeResetPending, "updated": updated, "removed": removed]
        pendingPlanes.removeAll()
        removedPlaneIDs.removeAll()
        planeResetPending = false
        sendEvent("planes", payload)
    }

    /// id, transform (column-major 4x4, ARKit world space), center + extent + boundary in the plane's own space (metres).
    static func planeDictionary(_ plane: ARPlaneAnchor) -> [String: Any] {
        var boundary: [Float] = []
        let verts = plane.geometry.boundaryVertices
        boundary.reserveCapacity(verts.count * 2)
        for v in verts {
            boundary.append(v.x)
            boundary.append(v.z)
        }
        var dict: [String: Any] = [
            "id": plane.identifier.uuidString,
            "transform": matrixArray(plane.transform),
            "center": [plane.center.x, plane.center.y, plane.center.z],
            "extent": [plane.planeExtent.width, plane.planeExtent.height],
            "extentRotationY": plane.planeExtent.rotationOnYAxis,
            "boundary": boundary,
            "alignment": plane.alignment == .vertical ? "vertical" : "horizontal",
        ]
        if ARPlaneAnchor.isClassificationSupported {
            dict["classification"] = classificationName(plane.classification)
        }
        return dict
    }

    // MARK: - PatchTown: names

    static func classificationName(_ c: ARPlaneAnchor.Classification) -> String {
        switch c {
        case .wall: return "wall"
        case .floor: return "floor"
        case .ceiling: return "ceiling"
        case .table: return "table"
        case .seat: return "seat"
        case .window: return "window"
        case .door: return "door"
        case .none: return "none"
        @unknown default: return "none"
        }
    }

    static func mappingName(_ s: ARFrame.WorldMappingStatus) -> String {
        switch s {
        case .notAvailable: return "notAvailable"
        case .limited: return "limited"
        case .extending: return "extending"
        case .mapped: return "mapped"
        @unknown default: return "notAvailable"
        }
    }

    /// The strings the polyfill's nonStandard_getWorldMappingStatus() returns.
    static func polyfillMappingName(_ s: ARFrame.WorldMappingStatus) -> String {
        switch s {
        case .notAvailable: return "ar_worldmapping_not_available"
        case .limited: return "ar_worldmapping_limited"
        case .extending: return "ar_worldmapping_extending"
        case .mapped: return "ar_worldmapping_mapped"
        @unknown default: return "ar_worldmapping_not_available"
        }
    }

    nonisolated static func trackingName(_ t: ARCamera.TrackingState) -> String {
        switch t {
        case .notAvailable: return "notAvailable"
        case .normal: return "normal"
        case .limited(let reason):
            switch reason {
            case .initializing: return "limited:initializing"
            case .excessiveMotion: return "limited:excessiveMotion"
            case .insufficientFeatures: return "limited:insufficientFeatures"
            case .relocalizing: return "limited:relocalizing"
            @unknown default: return "limited"
            }
        }
    }

    // MARK: - Helpers

    /// PatchTown: events to the page go through window.PatchTownNative._event(name, detail) (see PatchTownBridge.js).
    private func sendEvent(_ name: String, _ detail: [String: Any]) {
        guard let webView = webView,
              JSONSerialization.isValidJSONObject(detail),
              let json = try? JSONSerialization.data(withJSONObject: detail),
              let jsonString = String(data: json, encoding: .utf8) else { return }
        webView.evaluateJavaScript(
            "window.PatchTownNative && window.PatchTownNative._event('\(name)', \(jsonString));",
            completionHandler: nil
        )
    }

    static func matrixArray(_ m: simd_float4x4) -> [Float] {
        return [
            m.columns.0.x, m.columns.0.y, m.columns.0.z, m.columns.0.w,
            m.columns.1.x, m.columns.1.y, m.columns.1.z, m.columns.1.w,
            m.columns.2.x, m.columns.2.y, m.columns.2.z, m.columns.2.w,
            m.columns.3.x, m.columns.3.y, m.columns.3.z, m.columns.3.w,
        ]
    }

    private func toArray(_ m: simd_float4x4) -> [Float] {
        return Self.matrixArray(m)
    }

    /// Callback names come from the page; only plain JS identifiers are accepted (PatchTown: safety).
    private static func isSafeCallbackName(_ s: String) -> Bool {
        guard !s.isEmpty, s.count <= 200 else { return false }
        return s.unicodeScalars.allSatisfy { c in
            (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c == "_" || c == "$" || c == "."
        }
    }

    private func replyToJS(callback: String, data: Any) {
        guard let webView = webView, Self.isSafeCallbackName(callback) else { return }
        if let str = data as? String {
            // PatchTown: JSON-encode strings so quotes cannot break out.
            let encoded = (try? JSONSerialization.data(withJSONObject: [str]))
                .flatMap { String(data: $0, encoding: .utf8) }
                .map { String($0.dropFirst().dropLast()) } ?? "''"
            webView.evaluateJavaScript("\(callback)(\(encoded))")
        } else if JSONSerialization.isValidJSONObject(data),
                  let jsonData = try? JSONSerialization.data(withJSONObject: data),
            let jsonString = String(data: jsonData, encoding: .utf8)
        {
            webView.evaluateJavaScript("\(callback)(\(jsonString))")
        }
    }

    private func fastFloatArrayToString(_ m: simd_float4x4) -> String {
        return "[\(m.columns.0.x),\(m.columns.0.y),\(m.columns.0.z),\(m.columns.0.w)," +
               "\(m.columns.1.x),\(m.columns.1.y),\(m.columns.1.z),\(m.columns.1.w)," +
               "\(m.columns.2.x),\(m.columns.2.y),\(m.columns.2.z),\(m.columns.2.w)," +
               "\(m.columns.3.x),\(m.columns.3.y),\(m.columns.3.z),\(m.columns.3.w)]"
    }
}

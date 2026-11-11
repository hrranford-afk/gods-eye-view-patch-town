// Modified by PatchTown (2026): from WebXRKit (https://github.com/wem-technology/ios-webxr, Apache-2.0).
// Changes: browse mode removed (no URL bar, back/forward, or arbitrary sites): the view opens one bundled game URL.
// Adds the patchtown:// scheme handler, the persistent website data store, a custom user agent (so the polyfill's
// own iPad/iPhone + "Mobile/" check passes), the PatchTown bridge script, the PatchTown message handlers,
// a WKUIDelegate for alert/confirm/prompt, and tear-down when the game screen closes.

import SwiftUI
import ARKit
import SceneKit
import WebKit

/// A SwiftUI view that bridges ARKit to WKWebView, enabling WebXR experiences on iOS.
/// This view combines an ARSCNView (for camera passthrough) with a WKWebView (for web content)
/// and injects a JavaScript polyfill to enable WebXR API support.
public struct ARWebView: UIViewRepresentable {
    /// The game page, e.g. patchtown://base-camp/index.html
    let startURL: URL
    /// Handler for the custom scheme of `startURL` (PatchTown: GameSchemeHandler).
    let schemeHandler: WKURLSchemeHandler
    /// Extra scripts injected at document start after the polyfill (PatchTown: PatchTownBridge.js).
    let extraScripts: [String]
    /// Full user agent string for the web view.
    let userAgent: String

    @Binding public var isARActive: Bool

    /// Message names the page can post to (WebXRKit's own four, plus PatchTown's).
    static let messageNames = ["initAR", "requestSession", "stopAR", "hitTest",
                               "getWorldMap", "setWorldMap", "ptWorldMap", "ptPlanes"]

    public init(
        startURL: URL,
        schemeHandler: WKURLSchemeHandler,
        extraScripts: [String],
        userAgent: String,
        isARActive: Binding<Bool>
    ) {
        self.startURL = startURL
        self.schemeHandler = schemeHandler
        self.extraScripts = extraScripts
        self.userAgent = userAgent
        self._isARActive = isARActive
    }

    @MainActor
    public func makeUIView(context: Context) -> UIView {
        let containerView = UIView()
        containerView.backgroundColor = .black

        // 1. Create AR View
        let arView = ARSCNView(frame: .zero)
        arView.automaticallyUpdatesLighting = true
        arView.translatesAutoresizingMaskIntoConstraints = false
        arView.clipsToBounds = false

        // 2. Create Web View
        let webConfig = WKWebViewConfiguration()
        webConfig.allowsInlineMediaPlayback = true
        webConfig.mediaTypesRequiringUserActionForPlayback = []
        // PatchTown: saves (localStorage / IndexedDB) live in the app's persistent store, one origin per game.
        webConfig.websiteDataStore = .default()
        if let scheme = startURL.scheme {
            webConfig.setURLSchemeHandler(schemeHandler, forURLScheme: scheme)
        }
        let contentController = webConfig.userContentController

        // Register handlers
        for name in ARWebView.messageNames {
            contentController.add(context.coordinator, name: name)
        }

        let errorScript = WKUserScript(
            source: """
                    window.onerror = function(message, source, lineno, colno, error) {
                        window.webkit.messageHandlers.initAR.postMessage({
                            "callback": "console_error_bridge",
                            "error_message": message
                        });
                    };
                """, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        contentController.addUserScript(errorScript)

        if let url = Bundle.main.url(forResource: "webxr-polyfill", withExtension: "js"),
           let polyfillSource = try? String(contentsOf: url, encoding: .utf8)
        {
            let userScript = WKUserScript(
                source: polyfillSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            contentController.addUserScript(userScript)
        } else {
            print("PatchTown: webxr-polyfill.js is missing from the app bundle")
        }

        for source in extraScripts {
            contentController.addUserScript(
                WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }

        let webView = WKWebView(frame: .zero, configuration: webConfig)
        webView.customUserAgent = userAgent
        #if DEBUG
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif

        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        //important for full screen
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false

        // 3. Assemble View Hierarchy
        // Container -> ARView (Back) -> WebView (Front)
        containerView.addSubview(arView)
        containerView.addSubview(webView)

        NSLayoutConstraint.activate([
            // AR View Full Fill
            arView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            arView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            arView.topAnchor.constraint(equalTo: containerView.topAnchor),
            arView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),

            // Web View Full Fill
            webView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            webView.topAnchor.constraint(equalTo: containerView.topAnchor),
            webView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
        ])

        // 4. Hook up Coordinator
        context.coordinator.webView = webView
        context.coordinator.arView = arView
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        arView.session.delegate = context.coordinator

        webView.load(URLRequest(url: startURL))
        return containerView
    }

    @MainActor
    public func updateUIView(_ uiView: UIView, context: Context) {
        guard let webView = context.coordinator.webView,
              let arView = context.coordinator.arView else { return }

        if isARActive {
            // AR Mode: Show AR View, Make Web Transparent
            arView.isHidden = false
            webView.isOpaque = false
            webView.backgroundColor = .clear
            webView.scrollView.backgroundColor = .clear
        } else {
            // Not in AR: hide the AR view (kills the ghost frame), make the web view opaque
            arView.isHidden = true
            webView.isOpaque = true
            webView.backgroundColor = .black
            webView.scrollView.backgroundColor = .black
        }

        // Safety check (the native "Exit AR" button sets isARActive = false)
        if !isARActive && context.coordinator.isSessionRunning {
            context.coordinator.stopSession()
        }
    }

    @MainActor
    public static func dismantleUIView(_ uiView: UIView, coordinator: ARWebCoordinator) {
        coordinator.tearDown()
    }

    @MainActor
    public func makeCoordinator() -> ARWebCoordinator {
        let coordinator = ARWebCoordinator()

        coordinator.onSessionActiveChanged = { isActive in
            self.isARActive = isActive
        }

        return coordinator
    }
}

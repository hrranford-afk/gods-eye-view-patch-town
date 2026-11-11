// Modified by PatchTown (2026): from WebXRKit (https://github.com/wem-technology/ios-webxr, Apache-2.0).
// Changes: the camera picture is turned to match the interface orientation (portrait and landscape), and the
// centre crop is measured from the image's own extent origin.

import Foundation
import UIKit
import ARKit
import CoreImage

/// Handles the "computer vision" aspect: converting ARFrame pixel buffers
/// into web-friendly Base64 JPEG strings.
class ARCameraFrameProcessor {
    
    struct ProcessedFrame {
        let base64: String
        let width: Int
        let height: Int
    }

    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])
    private let sRGBColorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    
    // Logic to throttle processing (processing every frame is too heavy for JS)
    private var frameCounter = 0
    private let videoFrameSkip = 4 

    /// Attempts to process the current frame. Returns nil if the frame should be skipped
    /// or if processing failed.
    func process(frame: ARFrame, viewportSize: CGSize, isCameraAccessRequested: Bool,
                 interfaceOrientation: UIInterfaceOrientation = .portrait) -> ProcessedFrame? {
        frameCounter += 1
        
        // 1. Check if we should process this frame
        let shouldProcess = isCameraAccessRequested && (frameCounter % videoFrameSkip == 0)
        
        guard shouldProcess else { return nil }
        
        // 2. Perform Image Processing
        return convertImage(frame.capturedImage, viewportSize: viewportSize,
                            orientation: Self.imageOrientation(for: interfaceOrientation))
    }

    /// ARKit's capturedImage is always in the sensor's landscape-right orientation.
    static func imageOrientation(for o: UIInterfaceOrientation) -> CGImagePropertyOrientation {
        switch o {
        case .landscapeRight: return .up
        case .landscapeLeft: return .down
        case .portraitUpsideDown: return .left
        default: return .right // portrait (and unknown)
        }
    }

    private func convertImage(_ pixelBuffer: CVPixelBuffer, viewportSize: CGSize,
                              orientation: CGImagePropertyOrientation) -> ProcessedFrame? {
        var ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        ciImage = ciImage.oriented(orientation)
        
        let imgWidth = ciImage.extent.width
        let imgHeight = ciImage.extent.height
        
        if imgWidth == 0 || imgHeight == 0 || viewportSize.width == 0 || viewportSize.height == 0 {
            return nil
        }
        
        let imageAspect = imgWidth / imgHeight
        let viewportAspect = viewportSize.width / viewportSize.height
        
        var cropRect = ciImage.extent
        
        // Center crop calculation to match WebView aspect ratio
        if imageAspect > viewportAspect {
            let newWidth = imgHeight * viewportAspect
            let xOffset = (imgWidth - newWidth) / 2.0
            cropRect = CGRect(x: ciImage.extent.minX + xOffset, y: ciImage.extent.minY, width: newWidth, height: imgHeight)
        } else {
            let newHeight = imgWidth / viewportAspect
            let yOffset = (imgHeight - newHeight) / 2.0
            cropRect = CGRect(x: ciImage.extent.minX, y: ciImage.extent.minY + yOffset, width: imgWidth, height: newHeight)
        }
        
        // 3. Crop to aspect ratio
        let croppedImage = ciImage.cropped(to: cropRect)
        
        // 4. Reduce resolution by 2x (Optimization for JS transmission)
        let scaledImage = croppedImage.transformed(by: CGAffineTransform(scaleX: 0.5, y: 0.5))
        
        guard let jpegData = ciContext.jpegRepresentation(
            of: scaledImage,
            colorSpace: sRGBColorSpace
        ) else {
            return nil
        }
        
        return ProcessedFrame(
            base64: jpegData.base64EncodedString(),
            width: Int(scaledImage.extent.width),
            height: Int(scaledImage.extent.height)
        )
    }
}

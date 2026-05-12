import ExpoModulesCore
import VisionKit

public class ExpoDocumentScannerModule: Module {
  private var scanPromise: Promise?
  private var scanDelegate: DocumentScannerDelegate?

  public func definition() -> ModuleDefinition {
    Name("ExpoDocumentScanner")

    AsyncFunction("scanDocument") { (options: [String: Any], promise: Promise) in
      // Must run on main thread to present UI
      DispatchQueue.main.async { [weak self] in
        guard let self = self else {
          promise.reject("ERR_MODULE_DEALLOCATED", "Module was deallocated")
          return
        }

        guard VNDocumentCameraViewController.isSupported else {
          promise.reject("ERR_NOT_SUPPORTED", "Document scanning is not supported on this device")
          return
        }

        self.scanPromise = promise

        let scannerVC = VNDocumentCameraViewController()
        self.scanDelegate = DocumentScannerDelegate(module: self)
        scannerVC.delegate = self.scanDelegate

        guard let rootVC = self.getRootViewController() else {
          promise.reject("ERR_NO_VIEW_CONTROLLER", "Could not find root view controller")
          return
        }

        rootVC.present(scannerVC, animated: true, completion: nil)
      }
    }

    AsyncFunction("isSupported") { () -> Bool in
      return VNDocumentCameraViewController.isSupported
    }
  }

  private func getRootViewController() -> UIViewController? {
    guard let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .flatMap({ $0.windows })
      .first(where: { $0.isKeyWindow }) else {
      return nil
    }

    var topController = window.rootViewController
    while let presented = topController?.presentedViewController {
      topController = presented
    }
    return topController
  }

  func handleScanResult(pages: [[String: Any]]) {
    scanPromise?.resolve(["pages": pages])
    scanPromise = nil
    scanDelegate = nil
  }

  func handleScanError(message: String) {
    scanPromise?.reject("ERR_SCAN_FAILED", message)
    scanPromise = nil
    scanDelegate = nil
  }

  func handleScanCancelled() {
    scanPromise?.reject("ERR_CANCELLED", "User cancelled document scanning")
    scanPromise = nil
    scanDelegate = nil
  }
}

private class DocumentScannerDelegate: NSObject, VNDocumentCameraViewControllerDelegate {
  weak var module: ExpoDocumentScannerModule?

  init(module: ExpoDocumentScannerModule) {
    self.module = module
    super.init()
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
    controller.dismiss(animated: true) { [weak self] in
      guard let self = self else { return }

      var pages: [[String: Any]] = []

      for i in 0..<scan.pageCount {
        let image = scan.imageOfPage(at: i)

        // Save image to temp directory
        let fileName = "scanned_page_\(i)_\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(fileName)

        if let jpegData = image.jpegData(compressionQuality: 0.92) {
          do {
            try jpegData.write(to: fileURL)
            pages.append([
              "uri": fileURL.absoluteString,
              "width": image.size.width,
              "height": image.size.height
            ])
          } catch {
            // Skip this page if write fails
          }
        }
      }

      self.module?.handleScanResult(pages: pages)
    }
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    controller.dismiss(animated: true) { [weak self] in
      self?.module?.handleScanCancelled()
    }
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
    controller.dismiss(animated: true) { [weak self] in
      self?.module?.handleScanError(message: error.localizedDescription)
    }
  }
}

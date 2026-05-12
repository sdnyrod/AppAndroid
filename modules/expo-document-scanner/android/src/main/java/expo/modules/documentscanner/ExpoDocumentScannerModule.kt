package expo.modules.documentscanner

import android.app.Activity
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult

class ExpoDocumentScannerModule : Module() {
  private var scanPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoDocumentScanner")

    AsyncFunction("scanDocument") { options: Map<String, Any?>, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject(CodedException("ERR_NO_ACTIVITY", "No current activity available", null))
        return@AsyncFunction
      }

      scanPromise = promise

      val pageLimit = (options["pageLimit"] as? Double)?.toInt() ?: 1
      val galleryImport = options["galleryImportAllowed"] as? Boolean ?: true

      val scannerOptions = GmsDocumentScannerOptions.Builder()
        .setGalleryImportAllowed(galleryImport)
        .setPageLimit(pageLimit)
        .setResultFormats(
          GmsDocumentScannerOptions.RESULT_FORMAT_JPEG
        )
        .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
        .build()

      val scanner = GmsDocumentScanning.getClient(scannerOptions)

      scanner.getStartScanIntent(activity)
        .addOnSuccessListener { intentSender ->
          try {
            activity.startIntentSenderForResult(
              intentSender,
              SCAN_REQUEST_CODE,
              null, 0, 0, 0
            )
          } catch (e: Exception) {
            scanPromise?.reject(CodedException("ERR_SCAN_LAUNCH", "Failed to launch scanner: ${e.message}", e))
            scanPromise = null
          }
        }
        .addOnFailureListener { e ->
          scanPromise?.reject(CodedException("ERR_SCAN_FAILED", "Failed to start scanner: ${e.message}", e))
          scanPromise = null
        }
    }

    AsyncFunction("isSupported") { ->
      return@AsyncFunction true
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != SCAN_REQUEST_CODE) return@OnActivityResult

      val promise = scanPromise ?: return@OnActivityResult
      scanPromise = null

      if (payload.resultCode == Activity.RESULT_CANCELED) {
        promise.reject(CodedException("ERR_CANCELLED", "User cancelled document scanning", null))
        return@OnActivityResult
      }

      if (payload.resultCode != Activity.RESULT_OK) {
        promise.reject(CodedException("ERR_SCAN_FAILED", "Scan failed with result code: ${payload.resultCode}", null))
        return@OnActivityResult
      }

      val result = GmsDocumentScanningResult.fromActivityResultIntent(payload.data)
      if (result == null) {
        promise.reject(CodedException("ERR_NO_RESULT", "No scanning result returned", null))
        return@OnActivityResult
      }

      val pages = result.pages?.map { page ->
        mapOf(
          "uri" to page.imageUri.toString(),
          "width" to 0,
          "height" to 0
        )
      } ?: emptyList()

      promise.resolve(mapOf("pages" to pages))
    }
  }

  companion object {
    private const val SCAN_REQUEST_CODE = 9876
  }
}

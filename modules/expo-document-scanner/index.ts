import ExpoDocumentScannerModule from "./src/ExpoDocumentScannerModule";

export type { ScanOptions, ScannedPage, ScanResult } from "./src/ExpoDocumentScannerModule";

/**
 * Launches the native document scanner.
 * - iOS: Uses VNDocumentCameraViewController (Apple VisionKit - same as Notes/Files app)
 * - Android: Uses Google ML Kit Document Scanner
 *
 * @param options - Configuration options for the scanner
 * @returns Promise resolving to scan result with array of scanned page URIs
 */
export async function scanDocument(
  options: { pageLimit?: number; galleryImportAllowed?: boolean } = {}
) {
  return ExpoDocumentScannerModule.scanDocument({
    pageLimit: options.pageLimit ?? 1,
    galleryImportAllowed: options.galleryImportAllowed ?? true,
  });
}

/**
 * Checks if document scanning is supported on the current device.
 * - iOS: Returns true if VNDocumentCameraViewController.isSupported
 * - Android: Always returns true (requires Google Play Services)
 */
export async function isSupported(): Promise<boolean> {
  return ExpoDocumentScannerModule.isSupported();
}

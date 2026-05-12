import { requireNativeModule } from "expo-modules-core";

export interface ScanOptions {
  pageLimit?: number;
  galleryImportAllowed?: boolean;
}

export interface ScannedPage {
  uri: string;
  width: number;
  height: number;
}

export interface ScanResult {
  pages: ScannedPage[];
}

interface ExpoDocumentScannerModuleType {
  scanDocument(options: ScanOptions): Promise<ScanResult>;
  isSupported(): Promise<boolean>;
}

export default requireNativeModule<ExpoDocumentScannerModuleType>(
  "ExpoDocumentScanner"
);

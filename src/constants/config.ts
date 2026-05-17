// API Configuration
// The app communicates with the CREW web backend at crewcwm.com
export const API_BASE_URL = "https://crewcwm.com";
export const API_TRPC_URL = `${API_BASE_URL}/api/trpc`;

// App Configuration
export const APP_NAME = "CREW";
export const APP_VERSION = "1.2.0";

// Store URLs
export const IOS_STORE_URL = "https://apps.apple.com/app/crew-cwm/id6746587498";
export const ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=com.crewcwm.app";

// Trial & Payment
// When trial expires, redirect user to browser for payment (avoids Play Store commission)
export const PAYMENT_URL = `${API_BASE_URL}/pricing`;

// Offline Sync
export const SYNC_INTERVAL_MS = 30_000; // 30 seconds when online
export const SYNC_RETRY_DELAY_MS = 5_000; // 5 seconds retry on failure
export const MAX_OFFLINE_QUEUE_SIZE = 1000;
export const MAX_SYNC_RETRIES = 3;

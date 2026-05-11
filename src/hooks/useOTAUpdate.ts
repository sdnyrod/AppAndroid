import { useEffect, useState, useCallback } from "react";
import { Alert, AppState, AppStateStatus, Platform } from "react-native";

let Updates: any = null;
try {
  Updates = require("expo-updates");
} catch (e) {
  // expo-updates not available in this build
}

/**
 * Hook that checks for OTA updates via EAS Update.
 * - Checks on app launch
 * - Checks when app comes back to foreground
 * - Automatically downloads and applies updates
 * 
 * Guards:
 * - Skips in __DEV__ mode
 * - Skips if expo-updates module is not available
 * - Skips if Updates is not enabled in this build
 */
export function useOTAUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const checkForUpdate = useCallback(async () => {
    // Skip in development mode
    if (__DEV__) return;

    // Skip if expo-updates is not available or not enabled
    if (!Updates || !Updates.isEnabled) return;

    try {
      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setIsDownloading(true);
        const result = await Updates.fetchUpdateAsync();

        if (result.isNew) {
          Alert.alert(
            "Update Available",
            "A new version has been downloaded. The app will restart to apply the update.",
            [
              {
                text: "Restart Now",
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ],
            { cancelable: false }
          );
        }
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.log("[OTA] Update check failed:", error);
    } finally {
      setIsChecking(false);
      setIsDownloading(false);
    }
  }, []);

  useEffect(() => {
    // Delay the first check to let the app fully initialize
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    // Check when app comes back to foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkForUpdate();
        }
      }
    );

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [checkForUpdate]);

  return { isChecking, isDownloading };
}

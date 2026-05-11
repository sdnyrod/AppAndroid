import { useEffect, useState, useCallback } from "react";
import * as Updates from "expo-updates";
import { Alert, AppState, AppStateStatus } from "react-native";

/**
 * Hook that checks for OTA updates via EAS Update.
 * - Checks on app launch
 * - Checks when app comes back to foreground
 * - Automatically downloads and applies updates
 */
export function useOTAUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const checkForUpdate = useCallback(async () => {
    // Skip in development mode (expo-updates is not available in dev)
    if (__DEV__) return;

    try {
      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setIsDownloading(true);
        const result = await Updates.fetchUpdateAsync();

        if (result.isNew) {
          // Apply update immediately - restart the app
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
    // Check on mount (app launch)
    checkForUpdate();

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
      subscription.remove();
    };
  }, [checkForUpdate]);

  return { isChecking, isDownloading };
}

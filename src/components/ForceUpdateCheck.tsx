import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_VERSION } from "@/constants/config";

interface VersionCheckResult {
  updateRequired: boolean;
  forceUpdate: boolean;
  latestVersion: string;
  storeUrl: string;
  message: string;
}

/**
 * ForceUpdateCheck — Checks the backend for minimum app version requirements.
 * If the installed version is below the minimum AND forceUpdate is enabled,
 * shows a blocking modal that directs the user to the App Store / Play Store.
 * If it's just a regular update (not forced), shows a dismissible prompt.
 */
export default function ForceUpdateCheck({ children }: { children: React.ReactNode }) {
  const [versionInfo, setVersionInfo] = useState<VersionCheckResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      // Lazy import apiClient to avoid circular dependency issues at startup
      const { apiClient } = require("@/services/api");
      const platform = Platform.OS === "ios" ? "ios" : "android";
      const result = await apiClient.get<VersionCheckResult>("mobile.checkVersion", {
        platform,
        currentVersion: APP_VERSION,
      });

      if (result && result.updateRequired) {
        setVersionInfo(result);
      }
    } catch (error) {
      // Silently fail — don't block the app if the check fails
      console.log("[ForceUpdate] Version check failed:", error);
    }
  }, []);

  useEffect(() => {
    // Delay check to let the app fully initialize first
    const timer = setTimeout(() => {
      checkVersion();
    }, 5000);

    // Re-check when app comes back to foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkVersion();
        }
      }
    );

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [checkVersion]);

  const handleUpdate = () => {
    if (versionInfo?.storeUrl) {
      Linking.openURL(versionInfo.storeUrl);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Force update — blocking modal, cannot dismiss
  if (versionInfo?.forceUpdate) {
    return (
      <>
        {children}
        <Modal visible transparent animationType="fade" statusBarTranslucent>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.iconContainer}>
                <Ionicons name="cloud-download" size={48} color="#3B82F6" />
              </View>
              <Text style={styles.title}>Update Required</Text>
              <Text style={styles.message}>
                {versionInfo.message || "A new version of CREW is available. Please update to continue."}
              </Text>
              <Text style={styles.versionText}>
                Current: v{APP_VERSION} → Latest: v{versionInfo.latestVersion}
              </Text>
              <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} activeOpacity={0.8}>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Optional update — dismissible prompt
  if (versionInfo?.updateRequired && !dismissed) {
    return (
      <>
        {children}
        <Modal visible transparent animationType="slide" statusBarTranslucent>
          <View style={styles.bottomOverlay}>
            <View style={styles.bottomSheet}>
              <View style={styles.bottomHeader}>
                <View style={styles.smallIconContainer}>
                  <Ionicons name="cloud-download" size={28} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bottomTitle}>Update Available</Text>
                  <Text style={styles.bottomSubtitle}>
                    v{versionInfo.latestVersion} is available
                  </Text>
                </View>
                <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color="#8892A4" />
                </TouchableOpacity>
              </View>
              <Text style={styles.bottomMessage}>
                {versionInfo.message || "A new version of CREW is available with improvements and bug fixes."}
              </Text>
              <View style={styles.bottomActions}>
                <TouchableOpacity style={styles.laterButton} onPress={handleDismiss} activeOpacity={0.7}>
                  <Text style={styles.laterButtonText}>Later</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} activeOpacity={0.8}>
                  <Text style={styles.updateButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#0F1D32",
    borderRadius: 16,
    padding: 32,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    color: "#8892A4",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  versionText: {
    color: "#5A6A80",
    fontSize: 12,
    marginBottom: 24,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    flex: 1,
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  bottomSheet: {
    backgroundColor: "#0F1D32",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderColor: "#1A2A40",
  },
  bottomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  smallIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  bottomSubtitle: {
    color: "#8892A4",
    fontSize: 13,
    marginTop: 2,
  },
  bottomMessage: {
    color: "#8892A4",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  bottomActions: {
    flexDirection: "row",
    gap: 12,
  },
  laterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  laterButtonText: {
    color: "#8892A4",
    fontSize: 16,
    fontWeight: "600",
  },
});

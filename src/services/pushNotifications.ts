import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiClient } from "./api";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if running on a simulator or if permissions are denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("[Push] Must use physical device for push notifications");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Push] Permission not granted for push notifications");
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error("[Push] No EAS project ID found in app config");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log("[Push] Expo push token:", token);

    // Set up Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3B82F6",
      });

      await Notifications.setNotificationChannelAsync("alerts", {
        name: "Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: "#EF4444",
      });
    }

    return token;
  } catch (error) {
    console.error("[Push] Error getting push token:", error);
    return null;
  }
}

/**
 * Send the push token to the backend so the server can send notifications.
 * Uses the tRPC mutation via apiClient.
 */
export async function savePushTokenToServer(pushToken: string): Promise<boolean> {
  try {
    const result = await apiClient.post("pushNotifications.registerToken", {
      token: pushToken,
      platform: Platform.OS,
      deviceName: Device.deviceName || "Unknown",
    });

    if (result.ok) {
      console.log("[Push] Token saved to server successfully");
      return true;
    } else {
      console.error("[Push] Failed to save token to server:", result.error);
      return false;
    }
  } catch (error) {
    console.error("[Push] Error saving token to server:", error);
    return false;
  }
}

/**
 * Deregister push token from server (e.g., on logout).
 */
export async function removePushTokenFromServer(pushToken: string): Promise<void> {
  try {
    await apiClient.post("pushNotifications.deregisterToken", {
      token: pushToken,
    });
    console.log("[Push] Token deregistered from server");
  } catch (error) {
    console.error("[Push] Error deregistering token:", error);
  }
}

/**
 * Add listeners for notification events.
 * Returns a cleanup function to remove the listeners.
 */
export function addNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("[Push] Notification received:", notification.request.content.title);
      onNotificationReceived?.(notification);
    }
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log("[Push] Notification tapped:", response.notification.request.content.title);
      onNotificationResponse?.(response);
    }
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get the current badge count.
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count.
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

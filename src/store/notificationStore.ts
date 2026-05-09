import { create } from "zustand";
import {
  registerForPushNotificationsAsync,
  savePushTokenToServer,
  removePushTokenFromServer,
  addNotificationListeners,
  setBadgeCount,
} from "@/services/pushNotifications";

interface NotificationStore {
  pushToken: string | null;
  isRegistered: boolean;
  unreadCount: number;

  // Actions
  initializePushNotifications: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  clearBadge: () => Promise<void>;
  cleanup: () => void;
}

let cleanupListeners: (() => void) | null = null;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  pushToken: null,
  isRegistered: false,
  unreadCount: 0,

  initializePushNotifications: async () => {
    try {
      // Register for push notifications
      const token = await registerForPushNotificationsAsync();

      if (token) {
        set({ pushToken: token });

        // Save token to server
        const saved = await savePushTokenToServer(token);
        set({ isRegistered: saved });

        // Set up notification listeners
        if (cleanupListeners) {
          cleanupListeners();
        }

        cleanupListeners = addNotificationListeners(
          // On notification received (app in foreground)
          (_notification) => {
            const currentCount = get().unreadCount;
            set({ unreadCount: currentCount + 1 });
          },
          // On notification tapped
          (_response) => {
            const data = _response.notification.request.content.data;
            if (data?.screen) {
              console.log("[Notification] Navigate to:", data.screen);
            }
          }
        );
      }
    } catch (error) {
      console.error("[NotificationStore] Error initializing push notifications:", error);
    }
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
    setBadgeCount(count).catch(() => {});
  },

  clearBadge: async () => {
    set({ unreadCount: 0 });
    await setBadgeCount(0);
  },

  cleanup: () => {
    // Deregister token from server on logout
    const token = get().pushToken;
    if (token) {
      removePushTokenFromServer(token).catch(() => {});
    }

    if (cleanupListeners) {
      cleanupListeners();
      cleanupListeners = null;
    }

    set({ pushToken: null, isRegistered: false, unreadCount: 0 });
  },
}));

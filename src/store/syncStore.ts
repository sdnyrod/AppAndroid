import { create } from "zustand";
import { SyncState } from "@/types/sync";
import {
  processSyncQueue,
  getSyncQueue,
  getSyncState,
  updateSyncState,
} from "@/services/offlineSync";
import { SYNC_INTERVAL_MS, SYNC_RETRY_DELAY_MS } from "@/constants/config";

interface SyncStore extends SyncState {
  startSync: () => Promise<void>;
  setOnline: (online: boolean) => void;
  refreshCounts: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,

  startSync: async () => {
    const { isOnline, isSyncing } = get();
    if (!isOnline || isSyncing) return;

    set({ isSyncing: true });

    try {
      const { synced, failed } = await processSyncQueue();
      const queue = await getSyncQueue();

      set({
        isSyncing: false,
        lastSyncAt: Date.now(),
        pendingCount: queue.filter((i) => i.status === "pending").length,
        failedCount: queue.filter((i) => i.status === "failed").length,
      });

      await updateSyncState({
        lastSyncAt: Date.now(),
        pendingCount: queue.filter((i) => i.status === "pending").length,
        failedCount: queue.filter((i) => i.status === "failed").length,
      });
    } catch {
      set({ isSyncing: false });
    }
  },

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) {
      // Trigger sync when coming back online
      get().startSync();
    }
  },

  refreshCounts: async () => {
    const queue = await getSyncQueue();
    set({
      pendingCount: queue.filter((i) => i.status === "pending").length,
      failedCount: queue.filter((i) => i.status === "failed").length,
    });
  },
}));

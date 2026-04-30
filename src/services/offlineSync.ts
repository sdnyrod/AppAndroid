import AsyncStorage from "@react-native-async-storage/async-storage";
import { SyncQueueItem, SyncState } from "@/types/sync";
import { API_BASE_URL, MAX_OFFLINE_QUEUE_SIZE } from "@/constants/config";
import { getStoredToken } from "./api";

const SYNC_QUEUE_KEY = "crew_sync_queue";
const SYNC_STATE_KEY = "crew_sync_state";

// --- Queue Management ---

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "createdAt" | "retryCount" | "status">): Promise<void> {
  const queue = await getSyncQueue();

  if (queue.length >= MAX_OFFLINE_QUEUE_SIZE) {
    // Remove oldest completed/failed items first
    const cleaned = queue.filter(
      (i) => i.status !== "completed" && i.status !== "failed"
    );
    if (cleaned.length >= MAX_OFFLINE_QUEUE_SIZE) {
      throw new Error("Offline queue is full");
    }
  }

  const newItem: SyncQueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    retryCount: 0,
    status: "pending",
  };

  queue.push(newItem);
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function updateQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const queue = await getSyncQueue();
  const index = queue.findIndex((item) => item.id === id);
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearCompletedItems(): Promise<void> {
  const queue = await getSyncQueue();
  const pending = queue.filter((item) => item.status !== "completed");
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(pending));
}

// --- Sync Execution ---

export async function processSyncQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  const queue = await getSyncQueue();
  const pendingItems = queue.filter((item) => item.status === "pending");

  let synced = 0;
  let failed = 0;

  const token = await getStoredToken();

  for (const item of pendingItems) {
    try {
      await updateQueueItem(item.id, { status: "syncing" });

      const response = await fetch(`${API_BASE_URL}${item.endpoint}`, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Cookie: `app_session_id=${token}` } : {}),
        },
        body: item.method !== "DELETE" ? JSON.stringify(item.payload) : undefined,
      });

      if (response.ok) {
        await updateQueueItem(item.id, { status: "completed" });
        synced++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        await updateQueueItem(item.id, { status: "failed" });
        failed++;
      } else {
        // Server error - retry later
        await updateQueueItem(item.id, {
          status: "pending",
          retryCount: item.retryCount + 1,
        });
        if (item.retryCount >= item.maxRetries) {
          await updateQueueItem(item.id, { status: "failed" });
          failed++;
        }
      }
    } catch {
      // Network error - keep as pending for next sync
      await updateQueueItem(item.id, {
        status: "pending",
        retryCount: item.retryCount + 1,
      });
    }
  }

  // Clean up completed items
  await clearCompletedItems();

  return { synced, failed };
}

// --- Sync State ---

export async function getSyncState(): Promise<SyncState> {
  try {
    const data = await AsyncStorage.getItem(SYNC_STATE_KEY);
    if (data) return JSON.parse(data);
  } catch {}

  return {
    isOnline: true,
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    failedCount: 0,
  };
}

export async function updateSyncState(
  updates: Partial<SyncState>
): Promise<void> {
  const current = await getSyncState();
  const updated = { ...current, ...updates };
  await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify(updated));
}

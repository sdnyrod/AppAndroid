// Offline sync queue types
export type SyncAction = "create" | "update" | "delete";

export interface SyncQueueItem {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: Record<string, unknown>;
  createdAt: number; // Unix timestamp
  retryCount: number;
  maxRetries: number;
  status: "pending" | "syncing" | "failed" | "completed";
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  failedCount: number;
}

import { useEffect } from "react";
import * as Network from "expo-network";
import { useSyncStore } from "@/store/syncStore";

export function useNetworkStatus() {
  const { setOnline, isOnline } = useSyncStore();

  useEffect(() => {
    // Check initial status
    Network.getNetworkStateAsync().then((state) => {
      setOnline(state.isConnected ?? false);
    });

    // Poll network status every 15 seconds (reduced from 5s to save battery)
    // expo-network doesn't have a listener API on all platforms
    const interval = setInterval(async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const connected = state.isConnected ?? false;
        if (connected !== isOnline) {
          setOnline(connected);
        }
      } catch {
        // Ignore errors
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return { isOnline };
}

import { useEffect } from "react";
import { syncService } from "./sync.client";

export function useSync(sketchId: string, isReady: boolean, isLocal = false) {
  useEffect(() => {
    if (isLocal) {
      console.log("[Sync] Local mode: Not connecting to sync service.");
      return;
    }
    if (!isReady) return;
    console.log(`[Sync] Connecting ${sketchId}`);
    syncService.connect(sketchId);
    return () => {
      syncService.disconnect();
      console.log(`[Sync] Disconnected ${sketchId}`);
    };
  }, [sketchId, isReady, isLocal]);
}
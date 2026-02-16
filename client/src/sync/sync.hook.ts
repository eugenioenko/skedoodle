import { useEffect } from "react";
import { syncService } from "./sync.client";

export function useSync(sketchId: string, isReady: boolean) {
  useEffect(() => {
    if (!isReady) return;
    console.log(`[Sync] Connecting ${sketchId}`);
    syncService.connect(sketchId);
    return () => {
      syncService.disconnect();
      console.log(`[Sync] Disconnected ${sketchId}`);
    };
  }, [sketchId, isReady]);
}
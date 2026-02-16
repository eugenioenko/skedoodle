import { useEffect } from "react";
import { syncService } from "./sync.client";

export function useSync(sketchId: string, isReady: boolean) {
  useEffect(() => {
    if (!isReady) return;
    console.log("Connecting sync service sketch");
    syncService.connect(sketchId);
    return () => {
      syncService.disconnect();
      console.log("Disconnected sync service");
    };
  }, [sketchId, isReady]);
}
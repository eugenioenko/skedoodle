import { useEffect } from "react";
import { useCommandLogStore } from "@/canvas/history.store";
import { localStorageClient } from "@/services/local-storage.client";

export function useLocalPersistence(sketchId: string, isReady: boolean, isLocalPersisted: boolean) {
  useEffect(() => {
    if (!isLocalPersisted || !isReady) return;

    let lastLength = useCommandLogStore.getState().commandLog.length;

    const unsub = useCommandLogStore.subscribe(async (state, prev) => {
      if (state.commandLog === prev.commandLog) return;

      const commands = state.commandLog;
      for (let i = lastLength; i < commands.length; i++) {
        await localStorageClient.appendCommand(sketchId, commands[i]);
      }
      lastLength = commands.length;

      const existing = await localStorageClient.getMeta(sketchId);
      if (existing) {
        await localStorageClient.setMeta({ ...existing, updatedAt: Date.now() });
      }
    });

    return () => {
      unsub();
    };
  }, [sketchId, isReady, isLocalPersisted]);
}

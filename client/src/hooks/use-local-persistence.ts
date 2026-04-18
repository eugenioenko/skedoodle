import { useEffect } from "react";
import { useCommandLogStore } from "@/canvas/history.store";
import { localStorageClient } from "@/services/local-storage.client";
import { useToastStore } from "@/components/ui/toasts";
import { throttle } from "@/utils/throttle";

export function useLocalPersistence(sketchId: string, isReady: boolean, isLocalPersisted: boolean) {
  useEffect(() => {
    if (!isLocalPersisted || !isReady) return;

    let lastLength = useCommandLogStore.getState().commandLog.length;

    const updateMeta = throttle(async () => {
      try {
        const existing = await localStorageClient.getMeta(sketchId);
        if (existing) {
          await localStorageClient.setMeta({ ...existing, updatedAt: Date.now() });
        }
      } catch (error) {
        console.error("[LocalPersistence] Failed to update meta:", error);
      }
    }, 2000);

    const unsub = useCommandLogStore.subscribe(async (state, prev) => {
      if (state.commandLog === prev.commandLog) return;

      const commands = state.commandLog;
      try {
        for (let i = lastLength; i < commands.length; i++) {
          await localStorageClient.appendCommand(sketchId, commands[i]);
        }
        lastLength = commands.length;
      } catch (error) {
        console.error("[LocalPersistence] Failed to save command:", error);
        useToastStore.getState().addToast("Failed to save — changes may be lost", "error");
        return;
      }

      updateMeta();
    });

    return () => {
      unsub();
    };
  }, [sketchId, isReady, isLocalPersisted]);
}

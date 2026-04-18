import { useEffect, useRef } from "react";
import { useCommandLogStore } from "@/canvas/history.store";
import { localStorageClient } from "@/services/local-storage.client";
import { useToastStore } from "@/components/ui/toasts";

export function useLocalPersistence(sketchId: string, isReady: boolean, isLocalPersisted: boolean) {
  const metaTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!isLocalPersisted || !isReady) return;

    let lastLength = useCommandLogStore.getState().commandLog.length;

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

      // Debounce meta timestamp update
      clearTimeout(metaTimer.current);
      metaTimer.current = setTimeout(async () => {
        try {
          const existing = await localStorageClient.getMeta(sketchId);
          if (existing) {
            await localStorageClient.setMeta({ ...existing, updatedAt: Date.now() });
          }
        } catch (error) {
          console.error("[LocalPersistence] Failed to update meta:", error);
        }
      }, 2000);
    });

    return () => {
      unsub();
      clearTimeout(metaTimer.current);
    };
  }, [sketchId, isReady, isLocalPersisted]);
}

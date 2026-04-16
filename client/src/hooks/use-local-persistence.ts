import { useEffect, useRef } from "react";
import { useCommandLogStore } from "@/canvas/history.store";
import { localStorageClient } from "@/services/local-storage.client";
import { colord } from "colord";
import { useOptionsStore } from "@/canvas/canvas.store";

export function useLocalPersistence(sketchId: string, isReady: boolean, isLocalPersisted: boolean) {
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isLocalPersisted || !isReady) return;

    const unsub = useCommandLogStore.subscribe((state, prev) => {
      if (state.commandLog === prev.commandLog) return;

      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const { commandLog } = useCommandLogStore.getState();
        await localStorageClient.setCommands(sketchId, commandLog);

        const existing = await localStorageClient.getMeta(sketchId);
        if (existing) {
          const color = colord(useOptionsStore.getState().canvasColor).toHex();
          await localStorageClient.setMeta({
            ...existing,
            updatedAt: Date.now(),
            color,
          });
        }
      }, 1000);
    });

    return () => {
      unsub();
      clearTimeout(saveTimer.current);
    };
  }, [sketchId, isReady, isLocalPersisted]);
}

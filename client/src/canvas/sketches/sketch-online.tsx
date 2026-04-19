import { useCallback, useEffect, useState } from "react";
import { Canvas } from "../canvas.comp";
import { getDoodler } from "../doodler.client";
import { useSync } from "@/sync/sync.hook";
import { useRemoteCursors } from "@/components/cursors";
import { storageClient } from "@/services/storage.client";
import { useSketchMetaStore } from "../sketch-meta.store";

interface SketchOnlineProps {
  sketchId: string;
  onReady?: () => void;
}

export const SketchOnline = ({ sketchId, onReady }: SketchOnlineProps) => {
  const [isReady, setIsReady] = useState(false);

  const onTwoReady = useCallback(async () => {
    console.log("[Sketch] Online mode, loading doodles...");
    await getDoodler().loadDoodles();
    onReady?.();
    setIsReady(true);
  }, [onReady]);

  useEffect(() => {
    let cancelled = false;
    storageClient.getSketchMeta(sketchId).then((meta) => {
      if (cancelled) return;
      useSketchMetaStore.getState().setName(meta?.name);
    });
    return () => {
      cancelled = true;
      useSketchMetaStore.getState().setName(undefined);
    };
  }, [sketchId]);

  useRemoteCursors(isReady);
  useSync(sketchId, isReady);

  return <Canvas sketchId={sketchId} onReady={onTwoReady} />;
};

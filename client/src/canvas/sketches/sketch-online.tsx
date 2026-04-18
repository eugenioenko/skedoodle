import { useCallback, useState } from "react";
import { Canvas } from "../canvas.comp";
import { getDoodler } from "../doodler.client";
import { useSync } from "@/sync/sync.hook";
import { useRemoteCursors } from "@/components/cursors";

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

  useRemoteCursors(isReady);
  useSync(sketchId, isReady);

  return <Canvas sketchId={sketchId} onReady={onTwoReady} />;
};

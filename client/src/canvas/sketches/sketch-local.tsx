import { useCallback, useState } from "react";
import { Canvas } from "../canvas.comp";
import { getDoodler } from "../doodler.client";
import { useLocalPersistence } from "@/hooks/use-local-persistence";

interface SketchLocalProps {
  sketchId: string;
  onReady?: () => void;
}

export const SketchLocal = ({ sketchId, onReady }: SketchLocalProps) => {
  const [isReady, setIsReady] = useState(false);

  const onTwoReady = useCallback(async () => {
    console.log("[Sketch] Local mode, loading from IndexedDB...");
    getDoodler().mode = "local";
    await getDoodler().loadLocalDoodles(sketchId);
    onReady?.();
    setIsReady(true);
  }, [onReady, sketchId]);

  useLocalPersistence(sketchId, isReady, true);

  return <Canvas sketchId={sketchId} onReady={onTwoReady} />;
};

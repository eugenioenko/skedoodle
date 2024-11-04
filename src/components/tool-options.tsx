import { useCanvasStore } from "@/canvas/canvas.store";
import { Slider } from "primereact/slider";

export const ToolOptions = () => {
  const strokeWidth = useCanvasStore((state) => state.strokeWidth);
  const setStrokeWidth = useCanvasStore((state) => state.setStrokeWidth);

  return (
    <>
      <div className="w-full px-4">
        <div className="max-w-32">
          <Slider
            value={strokeWidth}
            min={0}
            max={100}
            step={1}
            onChange={(e) => setStrokeWidth(e.value)}
          />
        </div>
      </div>
    </>
  );
};

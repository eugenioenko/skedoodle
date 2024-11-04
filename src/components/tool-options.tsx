import { useCanvasStore } from "@/canvas/canvas.store";
import { InputText } from "primereact/inputtext";
import { Slider } from "primereact/slider";

export const ToolOptions = () => {
  const strokeWidth = useCanvasStore((state) => state.strokeWidth);
  const setStrokeWidth = useCanvasStore((state) => state.setStrokeWidth);

  return (
    <>
      <div className="flex flex-row gap-2 text-xs items-center">
        <label>Width</label>
        <input
          value={strokeWidth}
          className="px-2 py-1 max-w-14 rounded"
          onChange={(e) => setStrokeWidth(e.target.value)}
        />
        <div className="min-w-32">
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

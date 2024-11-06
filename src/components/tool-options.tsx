import { useCanvasStore } from "@/canvas/canvas.store";
import { SlideInput } from "./slide-input";
import { IconSquare } from "@tabler/icons-react";

export const ToolOptions = () => {
  const strokeWidth = useCanvasStore((state) => state.strokeWidth);
  const setStrokeWidth = useCanvasStore((state) => state.setStrokeWidth);

  return (
    <>
      <div className="flex flex-row gap-2 text-xs items-center">
        <label>Width</label>
        <SlideInput
          value={strokeWidth}
          onChange={(value) => setStrokeWidth(value)}
          icon={IconSquare}
        />
      </div>
    </>
  );
};

import { SlideInput } from "./slide-input";
import { IconBrush } from "@tabler/icons-react";
import { useBrushStore } from "@/canvas/brush.tool";
import { ColorInput } from "./color-input";

export const ToolOptions = () => {
  const strokeWidth = useBrushStore((state) => state.strokeWidth);
  const strokeColor = useBrushStore((state) => state.strokeColor);
  const { setStrokeColor, setStrokeWidth } = useBrushStore.getState();

  return (
    <>
      <div className="flex flex-row gap-2 text-xs items-center">
        <ColorInput
          value={strokeColor}
          onChange={(value) => setStrokeColor(value)}
        />
        <label>Width</label>
        <SlideInput
          value={strokeWidth}
          min={1}
          max={256}
          onChange={(value) => setStrokeWidth(value)}
          icon={IconBrush}
        />
      </div>
    </>
  );
};

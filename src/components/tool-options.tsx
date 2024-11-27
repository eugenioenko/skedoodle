import { SlideInput } from "./ui/slide-input";
import { IconBrush, IconSquare, IconWaveSine } from "@tabler/icons-react";
import { useBrushStore } from "@/canvas/brush.tool";
import { ColorInput } from "./ui/color-input";
import { useCanvasStore } from "@/canvas/canvas.store";
import { useShapeStore } from "@/canvas/shape.tool";

export const ToolOptions = () => {
  const selectedTool = useCanvasStore((state) => state.selectedTool);

  if (selectedTool === "brush") {
    return <BrushToolOptions />;
  }

  if (selectedTool === "square") {
    return <SquareToolOptions />;
  }

  return null;
};

const BrushToolOptions = () => {
  const strokeWidth = useBrushStore((state) => state.strokeWidth);
  const tolerance = useBrushStore((state) => state.tolerance);
  const strokeColor = useBrushStore((state) => state.strokeColor);
  const { setStrokeColor, setStrokeWidth, setTolerance } =
    useBrushStore.getState();

  return (
    <div className="flex flex-row gap-2 text-xs items-center">
      <label>Color</label>
      <ColorInput
        value={strokeColor}
        onChange={(value) => setStrokeColor(value)}
      />
      <label className="pl-2">Stroke</label>
      <SlideInput
        className="max-w-24"
        value={strokeWidth}
        min={1}
        max={256}
        onChange={(value) => setStrokeWidth(value)}
        icon={IconBrush}
      />
      <label className="pl-2">Smoothing</label>
      <SlideInput
        className="max-w-24"
        value={tolerance}
        min={0}
        max={100}
        onChange={(value) => setTolerance(value)}
        icon={IconWaveSine}
      />
    </div>
  );
};

const SquareToolOptions = () => {
  const strokeWidth = useShapeStore((state) => state.strokeWidth);
  const strokeColor = useShapeStore((state) => state.strokeColor);
  const fillColor = useShapeStore((state) => state.fillColor);
  const { setStrokeColor, setStrokeWidth, setFillColor } =
    useShapeStore.getState();

  return (
    <div className="flex flex-row gap-2 text-xs items-center">
      <label>Fill</label>
      <ColorInput value={fillColor} onChange={(value) => setFillColor(value)} />
      <label className="pl-2">Stroke</label>
      <ColorInput
        value={strokeColor}
        onChange={(value) => setStrokeColor(value)}
      />
      <label className="pl-2">Width</label>
      <SlideInput
        className="max-w-24"
        value={strokeWidth}
        min={0}
        max={100}
        onChange={(value) => setStrokeWidth(value)}
        icon={IconSquare}
      />
    </div>
  );
};

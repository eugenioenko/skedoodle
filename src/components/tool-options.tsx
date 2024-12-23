import { SlideInput } from "./ui/slide-input";
import {
  IconAngle,
  IconBorderCornerRounded,
  IconBrush,
  IconSquare,
  IconVectorBezier,
  IconVectorSpline,
  IconVectorTriangle,
  IconWaveSine,
} from "@tabler/icons-react";
import { useBrushStore } from "@/canvas/tools/brush.tool";
import { ColorInput } from "./ui/color-input";
import { useOptionsStore } from "@/canvas/canvas.store";
import { useShapeStore } from "@/canvas/tools/shape.tool";
import { ToggleButton, ToggleGroup } from "./ui/button";
import { WithTooltip } from "./ui/tooltip";

export const ToolOptions = () => {
  let selectedTool = useOptionsStore((state) => state.selectedTool);
  const restoreTool = useOptionsStore((state) => state.restoreTool);
  if (restoreTool) {
    selectedTool = restoreTool;
  }

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
  const simplifyAlgo = useBrushStore((state) => state.simplifyAlgo);

  const { setStrokeColor, setStrokeWidth, setTolerance, setSimplifyAlgo } =
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
      <ToggleGroup>
        <WithTooltip tooltip="Douglas-Peucker: High-performance general-purpose simplification. Preserves the path's overall shape efficiently. The number represents the acceptable tolerance x 10 times">
          <ToggleButton
            isSelected={simplifyAlgo === "douglas"}
            onClick={() => setSimplifyAlgo("douglas")}
          >
            <IconVectorSpline size={20} stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Area of Triangle smoothing: General-purpose line simplification, especially for preserving visual shapes and smooth curves. The number represents the percentage of nodes to simplify. (Visvalingam-Whyatt algorithm)">
          <ToggleButton
            isSelected={simplifyAlgo === "triangle"}
            onClick={() => setSimplifyAlgo("triangle")}
          >
            <IconVectorTriangle size={20} stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Angle smoothing: Best for straight-line approximations and paths where deviations from linearity are critical to detect. The number represents the percentage of nodes to simplify. (Visvalingam-Whyatt algorithm)">
          <ToggleButton
            isSelected={simplifyAlgo === "angle"}
            onClick={() => setSimplifyAlgo("angle")}
          >
            <IconAngle size={20} stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Perpendicular Distance smoothing: Best for straight-line approximations and paths where deviations from linearity are critical to detect. The number the represents percentage of nodes to simplify. (Visvalingam-Whyatt algorithm)">
          <ToggleButton
            isSelected={simplifyAlgo === "distance"}
            onClick={() => setSimplifyAlgo("distance")}
          >
            <IconVectorBezier size={20} stroke={1} />
          </ToggleButton>
        </WithTooltip>
      </ToggleGroup>
    </div>
  );
};

const SquareToolOptions = () => {
  const strokeWidth = useShapeStore((state) => state.strokeWidth);
  const strokeColor = useShapeStore((state) => state.strokeColor);
  const fillColor = useShapeStore((state) => state.fillColor);
  const radius = useShapeStore((state) => state.radius);
  const { setStrokeColor, setStrokeWidth, setFillColor, setRadius } =
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
      <label className="pl-2">Radius</label>
      <SlideInput
        className="max-w-24"
        value={radius}
        min={0}
        max={100}
        onChange={(value) => setRadius(value)}
        icon={IconBorderCornerRounded}
      />
    </div>
  );
};

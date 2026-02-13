import { Tool, useOptionsStore } from "@/canvas/canvas.store";
import {
  IconArrowNarrowRight,
  IconBrush,
  IconEraser,
  IconHandStop,
  IconLetterT,
  IconLine,
  IconPointer,
  IconSquare,
  IconVectorBezier,
  IconZoom,
} from "@tabler/icons-react";
import { WithTooltip } from "./ui/tooltip";

export const Toolbar = () => {
  return (
    <div className="absolute bottom-0 left-0 h-14 min-h-14 right-0 md:right-auto md:top-0  md:h-auto md:w-14">
      <div className="h-full bg-default-2 border-t md:border-r md:border-t-0 border-default-1 flex md:flex-col justify-center md:justify-start items-center gap-4 py-2 md:pt-4">
        <WithTooltip tooltip="Hand tool [H]">
          <ToggleButton value="hand">
            <IconHandStop stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Pointer tool [P]">
          <ToggleButton value="pointer">
            <IconPointer stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Eraser tool [E]">
          <ToggleButton value="eraser">
            <IconEraser stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Brush tool [B]">
          <ToggleButton value="brush">
            <IconBrush stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Rectangle tool [R]">
          <ToggleButton value="square">
            <IconSquare stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Line tool [L]">
          <ToggleButton value="line">
            <IconLine stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Arrow tool [A]">
          <ToggleButton value="arrow">
            <IconArrowNarrowRight stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Pen tool [C]">
          <ToggleButton value="bezier">
            <IconVectorBezier stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Text tool [T]">
          <ToggleButton value="text">
            <IconLetterT stroke={1} />
          </ToggleButton>
        </WithTooltip>
        <WithTooltip tooltip="Zoom tool [Z]">
          <ToggleButton value="zoom">
            <IconZoom stroke={1} />
          </ToggleButton>
        </WithTooltip>
      </div>
    </div>
  );
};

interface ToggleButtonProps {
  value?: string;
  children?: React.ReactNode;
}

const ToggleButton = ({ value, children }: ToggleButtonProps) => {
  let current = useOptionsStore((state) => state.selectedTool);
  const restoreTool = useOptionsStore((state) => state.restoreTool);
  if (restoreTool) {
    current = restoreTool;
  }
  const setTool = useOptionsStore((state) => state.setSelectedTool);
  const isActive = current === value;

  return (
    <button
      type="button"
      className={`p-1 rounded  ${
        isActive ? "bg-primary" : "hover:bg-default-3"
      }`}
      onClick={() => setTool(value as Tool)}
    >
      {children}
    </button>
  );
};

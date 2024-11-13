import { Tool, useCanvasStore } from "@/canvas/canvas.store";
import {
  IconBrush,
  IconEraser,
  IconHandStop,
  IconPointer,
  IconSquare,
  IconZoom,
} from "@tabler/icons-react";

export const Toolbar = () => {
  return (
    <div className="absolute bottom-0 left-0 h-14 min-h-14 right-0 md:right-auto md:top-0  md:h-auto md:w-14">
      <div className="h-full bg-toolbar border-t md:border-r md:border-t-0 border-border flex md:flex-col justify-center md:justify-start items-center gap-4 py-2 md:pt-4">
        <ToggleButton value="hand">
          <IconHandStop stroke={1} />
        </ToggleButton>
        <ToggleButton value="pointer">
          <IconPointer stroke={1} />
        </ToggleButton>
        <ToggleButton value="eraser">
          <IconEraser stroke={1} />
        </ToggleButton>
        <ToggleButton value="brush">
          <IconBrush stroke={1} />
        </ToggleButton>
        <ToggleButton value="square">
          <IconSquare stroke={1} />
        </ToggleButton>
        <ToggleButton value="zoom">
          <IconZoom stroke={1} />
        </ToggleButton>
      </div>
    </div>
  );
};

interface ToggleButtonProps {
  value?: string;
  children?: React.ReactNode;
}

const ToggleButton = ({ value, children }: ToggleButtonProps) => {
  const current = useCanvasStore((state) => state.selectedTool);
  const setTool = useCanvasStore((state) => state.setSelectedTool);

  return (
    <button
      type="button"
      className={`p-1 rounded ${current === value ? "bg-panel" : ""}`}
      onClick={() => setTool(value as Tool)}
    >
      {children}
    </button>
  );
};

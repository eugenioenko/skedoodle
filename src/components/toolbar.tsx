import { useCanvasStore } from "@/canvas/canvas.store";
import {
  IconBrush,
  IconColorPicker,
  IconHandStop,
  IconNewSection,
  IconPointer,
  IconSquare,
  IconVectorBezier2,
  IconZoom,
} from "@tabler/icons-react";
import { ColorPicker } from "primereact/colorpicker";

export const Toolbar = () => {
  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <ToggleButton value="hand">
        <IconHandStop stroke={1} />
      </ToggleButton>
      <ToggleButton value="pointer">
        <IconPointer stroke={1} />
      </ToggleButton>
      <ToggleButton value="selection">
        <IconNewSection stroke={1} />
      </ToggleButton>
      <ToggleButton value="brush">
        <IconBrush stroke={1} />
      </ToggleButton>
      <ToggleButton value="bezier">
        <IconVectorBezier2 stroke={1} />
      </ToggleButton>

      <ToggleButton value="square">
        <IconSquare stroke={1} />
      </ToggleButton>

      <ToggleButton value="zoom">
        <IconZoom stroke={1} />
      </ToggleButton>
      <Separator />
      <ToggleButton value="picker">
        <IconColorPicker stroke={1} />
      </ToggleButton>
      <ColorPicker />
      <ColorPicker />
      <Separator />
    </div>
  );
};

const Separator = () => {
  return (
    <div className="px-1 w-full">
      <div className="border-t border-muted w-full"></div>
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
      className={`p-1 rounded ${current === value ? "bg-primary" : ""}`}
      onClick={() => setTool(value)}
    >
      {children}
    </button>
  );
};

import { useCanvasStore } from "@/canvas/canvas.store";
import { RgbaColor, RgbaColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useState } from "react";

interface ColorPickerProps {
  color: RgbaColor;
  onChange?: (color?: RgbaColor) => void;
}

const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="right"
      initialOffset={30}
    >
      <PopoverTrigger
        onClick={() => setIsOpen((v) => !v)}
        className={`w-8 h-8 rounded ${
          isOpen ? "border-2 border-highlight" : ""
        }`}
        style={{ background: `rgba(${color.r}, ${color.g}, ${color.b}, 1)` }}
      >
        &nbsp;
      </PopoverTrigger>
      <PopoverContent className="bg-toolbar border-border p-4 rounded">
        <RgbaColorPicker
          color={color}
          onChange={(value) => onChange?.(value)}
        />
        <div className="grid grid-cols-4 gap-2 w-48 pt-4 text-xs">
          <input type="text" readOnly={true} value={color?.r || 0} />
          <input type="text" readOnly={true} value={color?.g || 0} />
          <input type="text" readOnly={true} value={color?.g || 0} />
          <input type="text" readOnly={true} value={color?.a || 1} />
        </div>
      </PopoverContent>
    </Popover>
  );
};

const blackColor = { r: 0, g: 0, b: 0, a: 1 };

export const PickColor = () => {
  const fillColor = useCanvasStore((state) => state.fillColor);
  const strokeColor = useCanvasStore((state) => state.strokeColor);
  const setFillColor = useCanvasStore((state) => state.setFillColor);
  const setStrokeColor = useCanvasStore((state) => state.setStrokeColor);

  return (
    <div className="flex flex-row md:flex-col gap-4 justify-center">
      <ColorPicker
        color={fillColor}
        onChange={(e) => setFillColor(e || blackColor)}
      />
      <div className="relative">
        <ColorPicker
          color={strokeColor}
          onChange={(e) => setStrokeColor(e || blackColor)}
        />
        <div className="w-4 h-4 bg-toolbar rounded absolute left-2 top-2 pointer-events-none"></div>
      </div>
    </div>
  );
};

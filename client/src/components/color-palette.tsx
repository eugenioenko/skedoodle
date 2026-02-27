import { useState } from "react";
import { colord } from "colord";
import { RgbaColorPicker } from "react-colorful";
import { IconBrush, IconBucketDroplet, IconCheck, IconPencil, IconRefresh } from "@tabler/icons-react";
import { DEFAULT_PALETTE, useOptionsStore } from "@/canvas/canvas.store";
import { Button } from "./ui/button";
import { WithTooltip } from "./ui/tooltip";
import { ToggleButton, ToggleGroup } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface ColorSwatchProps {
  color: string;
  editMode: boolean;
  onClick: () => void;
  onChange: (color: string) => void;
}

const ColorSwatch = ({ color, editMode, onClick, onChange }: ColorSwatchProps) => {
  if (editMode) {
    return (
      <Popover placement="top" initialOffset={5}>
        <PopoverTrigger asChild>
          <div
            className="aspect-square rounded-sm border border-black/10 ring-1 ring-primary/60 cursor-pointer"
            style={{ backgroundColor: color }}
          />
        </PopoverTrigger>
        <PopoverContent className="bg-default-2 border border-default-1 p-4 rounded-lg color-picker">
          <RgbaColorPicker
            color={colord(color).toRgb()}
            onChange={(value) => onChange(colord(value).toHex())}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div
      className="aspect-square rounded-sm border border-black/10 transition-transform cursor-pointer hover:scale-110"
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  );
};

interface ColorPaletteProps {
  onApply: (field: string, value: any) => void;
}

export const ColorPalette = ({ onApply }: ColorPaletteProps) => {
  const palette = useOptionsStore((state) => state.colorPalette);
  const [target, setTarget] = useState<"stroke" | "fill">("stroke");
  const [editMode, setEditMode] = useState(false);

  const handleSelect = (color: string) => {
    onApply(target, color);
  };

  const handleChange = (ri: number, ci: number, color: string) => {
    const next = palette.map((row, r) =>
      row.map((c, i) => (r === ri && i === ci ? color : c))
    );
    useOptionsStore.getState().setColorPalette(next);
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between mt-4">
        <ToggleGroup>
          <WithTooltip tooltip="Apply to stroke">
            <ToggleButton isSelected={target === "stroke"} onClick={() => setTarget("stroke")}>
              <IconBrush size={21} stroke={1} />
            </ToggleButton>
          </WithTooltip>
          <WithTooltip tooltip="Apply to fill">
            <ToggleButton isSelected={target === "fill"} onClick={() => setTarget("fill")}>
              <IconBucketDroplet size={21} stroke={1} />
            </ToggleButton>
          </WithTooltip>
        </ToggleGroup>
        <div className="flex items-center gap-1">
          {editMode && (
            <WithTooltip tooltip="Reset to defaults">
              <Button onClick={() => useOptionsStore.getState().setColorPalette(DEFAULT_PALETTE)}>
                <IconRefresh size={14} stroke={1} />
              </Button>
            </WithTooltip>
          )}
          <WithTooltip tooltip={editMode ? "Done" : "Edit palette"}>
            <Button onClick={() => setEditMode(!editMode)}>
              {editMode
                ? <IconCheck size={14} stroke={1} />
                : <IconPencil size={14} stroke={1} />
              }
            </Button>
          </WithTooltip>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {palette.map((row, ri) => (
          <div key={ri} className="grid grid-cols-12 gap-1">
            {row.map((color, ci) => (
              <ColorSwatch
                key={ci}
                color={color}
                editMode={editMode}
                onClick={() => handleSelect(color)}
                onChange={(c) => handleChange(ri, ci, c)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

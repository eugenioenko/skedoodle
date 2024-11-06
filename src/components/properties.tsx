import { usePointerStore } from "@/canvas/pointer.tool";
import { Path } from "two.js/src/path";
import { SlideInput } from "./slide-input";
import {
  IconAngle,
  IconDimensions,
  IconRulerMeasure,
  IconRulerMeasure2,
} from "@tabler/icons-react";
import { Rectangle } from "two.js/src/shapes/rectangle";

export const Properties = () => {
  const selection = usePointerStore((state) => state.selection);
  const shape = selection?.[0]?.shapes?.[0] as Rectangle;
  if (!shape) {
    return null;
  }

  return (
    <>
      <div className="pt-4 pb-1 text-sm">Size</div>
      <div className="grid grid-cols-2 gap-2">
        <SlideInput
          icon={IconRulerMeasure}
          min={1}
          max={5000}
          value={shape.width}
          onChange={(value) => (shape.width = value)}
        />
        <SlideInput
          icon={IconRulerMeasure2}
          min={1}
          max={5000}
          value={shape.height}
          onChange={(value) => (shape.height = value)}
        />
      </div>
      <div className="pt-4 pb-1 text-sm">Transform</div>
      <div className="grid grid-cols-2 gap-2">
        <SlideInput
          icon={IconAngle}
          min={0}
          max={Math.PI * 2}
          sensitivity={0.01}
          value={shape.rotation}
          onChange={(value) => (shape.rotation = value)}
        />
        <SlideInput
          icon={IconDimensions}
          min={0}
          max={100}
          sensitivity={0.01}
          value={shape.scale}
          onChange={(value) => (shape.scale = value)}
        />
      </div>
    </>
  );
};

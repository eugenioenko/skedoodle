import { usePointerStore } from "@/canvas/pointer.tool";
import { Path } from "two.js/src/path";
import { SlideInput } from "./slide-input";
import {
  IconAngle,
  IconDimensions,
  IconRulerMeasure,
  IconRulerMeasure2,
  IconSkewX,
  IconSkewY,
} from "@tabler/icons-react";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { degreesToRadians, radiansToDegrees } from "@/canvas/canvas.utils";

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
          min={-360}
          max={360}
          sensitivity={1}
          value={shape.rotation}
          onChange={(value) => (shape.rotation = value)}
          convertFrom={radiansToDegrees}
          convertTo={degreesToRadians}
        />
        <SlideInput
          icon={IconDimensions}
          min={-Infinity}
          max={Infinity}
          sensitivity={1}
          value={shape.scale}
          onChange={(value) => (shape.scale = value)}
          convertFrom={(n) => n * 100}
          convertTo={(n) => n / 100}
        />

        <SlideInput
          icon={IconSkewX}
          min={-Math.PI}
          max={Math.PI}
          sensitivity={0.01}
          value={shape.skewX}
          onChange={(value) => (shape.skewX = value)}
        />
        <SlideInput
          icon={IconSkewY}
          min={-Math.PI}
          max={Math.PI}
          sensitivity={0.01}
          value={shape.skewY}
          onChange={(value) => (shape.skewY = value)}
        />
      </div>
    </>
  );
};

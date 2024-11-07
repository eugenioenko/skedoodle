import { usePointerStore } from "@/canvas/pointer.tool";
import { SlideInput } from "./slide-input";
import {
  IconAngle,
  IconDimensions,
  IconRulerMeasure,
  IconRulerMeasure2,
  IconSkewX,
  IconSkewY,
  IconSquareLetterX,
  IconSquareLetterY,
} from "@tabler/icons-react";
import { degreesToRadians, radiansToDegrees } from "@/canvas/canvas.utils";
import { Shape } from "two.js/src/shape";
import { Rectangle } from "two.js/src/shapes/rectangle";

export const Properties = () => {
  const selection = usePointerStore((state) => state.selected);

  function updateShape(field: keyof Shape, value: number): void {
    for (const item of usePointerStore.getState().selected) {
      const props = field.split(".");
      if (props.length == 2) {
        item.shape[props[0]][props[1]] = value;
      } else {
        (item.shape as Rectangle)[field] = value;
      }
    }
  }

  const shape = selection?.[0]?.shape;
  return (
    <>
      <div className="pt-4 pb-1 text-sm">Size</div>
      <div className="grid grid-cols-2 gap-2">
        <SlideInput
          icon={IconRulerMeasure}
          min={1}
          max={5000}
          value={shape?.width}
          onChange={(value) => updateShape("width", value)}
        />
        <SlideInput
          icon={IconRulerMeasure2}
          min={1}
          max={5000}
          value={shape?.height}
          onChange={(value) => updateShape("height", value)}
        />
      </div>
      <div className="pt-4 pb-1 text-sm">Position</div>
      <div className="grid grid-cols-2 gap-2">
        <SlideInput
          icon={IconSquareLetterX}
          min={-5000}
          max={5000}
          value={shape?.position.x}
          onChange={(value) => updateShape("position.x", value)}
        />
        <SlideInput
          icon={IconSquareLetterY}
          min={-5000}
          max={5000}
          value={shape?.position.y}
          onChange={(value) => updateShape("position.y", value)}
        />
      </div>
      <div className="pt-4 pb-1 text-sm">Transform</div>
      <div className="grid grid-cols-2 gap-2">
        <SlideInput
          icon={IconAngle}
          min={-360}
          max={360}
          sensitivity={1}
          value={shape?.rotation}
          onChange={(value) => updateShape("rotation", value)}
          convertFrom={radiansToDegrees}
          convertTo={degreesToRadians}
        />
        <SlideInput
          icon={IconDimensions}
          min={-Infinity}
          max={Infinity}
          sensitivity={1}
          value={shape?.scale}
          onChange={(value) => updateShape("scale", value)}
          convertFrom={(n) => n * 100}
          convertTo={(n) => n / 100}
        />

        <SlideInput
          icon={IconSkewX}
          min={-Math.PI}
          max={Math.PI}
          sensitivity={0.01}
          value={shape?.skewX}
          onChange={(value) => updateShape("skewX", value)}
        />
        <SlideInput
          icon={IconSkewY}
          min={-Math.PI}
          max={Math.PI}
          sensitivity={0.01}
          value={shape?.skewY}
          onChange={(value) => updateShape("skewY", value)}
        />
      </div>
    </>
  );
};

import { degreesToRadians, radiansToDegrees } from "@/canvas/canvas.utils";
import { getDoodler } from "@/canvas/doodle.service";
import { usePointerStore } from "@/canvas/tools/pointer.tool";
import {
  IconAngle,
  IconBrush,
  IconDimensions,
  IconRulerMeasure,
  IconRulerMeasure2,
  IconSkewX,
  IconSkewY,
  IconSquareLetterX,
  IconSquareLetterY,
} from "@tabler/icons-react";
import { colord } from "colord";
import { Shape } from "two.js/src/shape";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Layers } from "./layers";
import { ColorInput } from "./ui/color-input";
import { SlideInput } from "./ui/slide-input";

type ShapeType = "path" | "shape" | "none";

export const Properties = () => {
  const selection = usePointerStore((state) => state.selected);
  const shape = selection?.[0];
  const strokeColor = colord(shape?.stroke as string).toRgb();
  const fillColor = colord(shape?.fill as string).toRgb();

  function updateShape(field: keyof Shape | string, value: any): void {
    const doodler = getDoodler();
    for (const item of usePointerStore.getState().selected) {
      const props = field.split(".");
      if (["stroke", "fill"].includes(field)) {
        value = colord(value).toHex();
      }
      if (props.length == 2) {
        item[props[0] as keyof Shape][props[1]] = value;
      } else {
        (item as any)[field] = value;
      }
    }
    doodler.throttledTwoUpdate();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
        {!!selection?.length && (
          <>
            <div className="pt-4 pb-1 text-sm">Color</div>
            <div className="flex flex-col gap-4">
              {strokeColor && (
                <ColorInput
                  value={strokeColor}
                  onChange={(value) => updateShape("stroke", value)}
                />
              )}
              {fillColor && (
                <ColorInput
                  value={fillColor}
                  onChange={(value) => updateShape("fill", value)}
                />
              )}
            </div>
            <div className="pt-4 pb-1 text-sm">Stroke</div>
            <div className="grid grid-cols-2 gap-4">
              <SlideInput
                icon={IconBrush}
                min={1}
                max={5000}
                value={(shape as Rectangle)?.linewidth}
                onChange={(value) => updateShape("linewidth", value)}
              />
            </div>
            <div className="pt-4 pb-1 text-sm">Size</div>
            <div className="grid grid-cols-2 gap-4">
              <SlideInput
                icon={IconRulerMeasure}
                min={1}
                max={5000}
                value={(shape as Rectangle)?.width}
                onChange={(value) => updateShape("width", value)}
              />
              <SlideInput
                icon={IconRulerMeasure2}
                min={1}
                max={5000}
                value={(shape as Rectangle)?.height}
                onChange={(value) => updateShape("height", value)}
              />
            </div>
            <div className="pt-4 pb-1 text-sm">Position</div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                value={shape?.scale as number}
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
        )}
      </div>
      <div>
        <Layers />
      </div>
      <div className="pt-16"></div>
    </div>
  );
};

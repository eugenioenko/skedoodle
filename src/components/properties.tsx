import { degreesToRadians, radiansToDegrees } from "@/canvas/canvas.utils";
import { getDoodler } from "@/canvas/doodler.client";
import { usePointerStore } from "@/canvas/tools/pointer.tool";
import {
  IconAngle,
  IconBorderCornerRounded,
  IconBrush,
  IconDimensions,
  IconEyeClosed,
  IconGridDots,
  IconZoomOut,
  IconRulerMeasure,
  IconRulerMeasure2,
  IconSkewX,
  IconSkewY,
  IconSquareLetterX,
  IconSquareLetterY,
  IconGrid3x3
} from "@tabler/icons-react";
import { colord } from "colord";
import { Shape } from "two.js/src/shape";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Layers } from "./layers";
import { History } from "./history";
import { ColorInput } from "./ui/color-input";
import { SlideInput } from "./ui/slide-input";
import { RoundedRectangle } from "two.js/src/shapes/rounded-rectangle";
import { useOptionsStore } from "@/canvas/canvas.store";
import { setGridSize as setGridSizeDom, setGridType as setGridTypeDom, setGridColor as setGridColorDom, setGridMinZoom as setGridMinZoomDom } from "@/canvas/grid";
import { ToggleButton, ToggleGroup } from "./ui/button";
import { useToastStore } from "./ui/toasts";
import { Sketches } from "./sketches";
import { pushCommand } from "@/canvas/history.service";
import { PropertyChange } from "@/canvas/history.store";

// Debounced property edit tracking for undo/redo
let pendingChanges: Map<string, { shapeId: string; changes: Map<string, PropertyChange> }> = new Map();
let pendingTimer: ReturnType<typeof setTimeout> | undefined;

function flushPendingChanges(): void {
  for (const [, entry] of pendingChanges) {
    pushCommand({
      type: "update",
      label: "Edit properties",
      shapeId: entry.shapeId,
      changes: Array.from(entry.changes.values()),
    });
  }
  pendingChanges = new Map();
  pendingTimer = undefined;
}

function trackPropertyChange(shapeId: string, field: string, oldValue: any, newValue: any): void {
  let entry = pendingChanges.get(shapeId);
  if (!entry) {
    entry = { shapeId, changes: new Map() };
    pendingChanges.set(shapeId, entry);
  }
  // Keep the original oldValue from the first change in a batch
  const existing = entry.changes.get(field);
  entry.changes.set(field, {
    field,
    oldValue: existing ? existing.oldValue : oldValue,
    newValue,
  });

  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(flushPendingChanges, 500);
}

function getShapeField(shape: Shape, field: string): any {
  const props = field.split(".");
  if (props.length === 2) {
    return (shape as any)[props[0]][props[1]];
  }
  return (shape as any)[field];
}

export const Properties = () => {
  const selection = usePointerStore((state) => state.selected);
  const shape = selection?.[0];
  const strokeColor = colord((shape as any)?.stroke as string).toRgb();
  const fillColor = colord((shape as any)?.fill as string).toRgb();
  const canvasColor = useOptionsStore((state) => state.canvasColor);
  const setCanvasColor = useOptionsStore.getState().setCanvasColor;
  const gridSize = useOptionsStore((state) => state.gridSize);
  const gridType = useOptionsStore((state) => state.gridType);
  const gridColor = useOptionsStore((state) => state.gridColor);
  const gridMinZoom = useOptionsStore((state) => state.gridMinZoom);
  const rendererType = useOptionsStore((state) => state.rendererType);
  const updateFrequency = useOptionsStore((state) => state.updateFrequency);

  function updateShape(field: keyof Shape | string, value: any): void {
    const doodler = getDoodler();
    for (const item of usePointerStore.getState().selected) {
      const oldValue = getShapeField(item, field);
      const props = field.split(".");
      if (["stroke", "fill"].includes(field)) {
        value = colord(value).toHex();
      }
      if (props.length == 2) {
        (item[props[0] as keyof Shape] as any)[props[1]] = value;
      } else {
        (item as any)[field] = value;
      }
      trackPropertyChange(item.id, field, oldValue, value);
    }
    doodler.throttledTwoUpdate();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
        {!selection?.length && (
          <>
            <div className="pt-4 pb-1 text-sm">Page</div>
            <div className="flex flex-col gap-4">
              <ColorInput
                value={canvasColor}
                onChange={(value) => setCanvasColor(value)}
              />
            </div>
            <div className="pt-4 pb-1 text-sm">Renderer</div>
            <div className="flex flex-col gap-2">
              <select
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm focus:outline-none focus:border-neutral-500"
                value={rendererType}
                onChange={(e) => {
                  const newType = e.target.value as "svg" | "canvas" | "webgl";
                  useOptionsStore.getState().setRendererType(newType);
                  useToastStore.getState().addToast("Reload page to apply renderer change");
                }}
              >
                <option value="svg">SVG</option>
                <option value="canvas">Canvas</option>
                <option value="webgl">WebGL</option>
              </select>
            </div>
            <div className="pt-4 pb-1 text-sm">Update Frequency</div>
            <div className="flex flex-col gap-2">
              <select
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm focus:outline-none focus:border-neutral-500"
                value={updateFrequency}
                onChange={(e) => {
                  const newFreq = Number(e.target.value) as 0 | 16 | 33;
                  useOptionsStore.getState().setUpdateFrequency(newFreq);
                }}
              >
                <option value={0}>High Performance</option>
                <option value={8}>Performance (120 FPS)</option>
                <option value={16}>Balanced (60 FPS)</option>
                <option value={33}>Battery Saver (30 FPS)</option>
                <option value={100}>Save my Battery (10 FPS)</option>
              </select>
            </div>
            <div className="pt-4 pb-1 text-sm">Grid</div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <ToggleGroup>
                  <ToggleButton
                    isSelected={gridType === "none"}
                    onClick={() => {
                      useOptionsStore.getState().setGridType("none");
                      setGridTypeDom("none");
                    }}
                  >
                    <IconEyeClosed size={20} stroke={1} />
                  </ToggleButton>
                  <ToggleButton
                    isSelected={gridType === "dots"}
                    onClick={() => {
                      useOptionsStore.getState().setGridType("dots");
                      setGridTypeDom("dots");
                    }}
                  >
                    <IconGridDots size={20} stroke={1} />
                  </ToggleButton>
                  <ToggleButton
                    isSelected={gridType === "lines"}
                    onClick={() => {
                      useOptionsStore.getState().setGridType("lines");
                      setGridTypeDom("lines");
                    }}
                  >
                    <IconGrid3x3 size={20} stroke={1} />
                  </ToggleButton>
                </ToggleGroup>
                <ColorInput
                  value={gridColor}
                  onChange={(value) => {
                    useOptionsStore.getState().setGridColor(value);
                    setGridColorDom(value);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SlideInput
                  label="Size"
                  icon={IconGridDots}
                  min={5}
                  max={100}
                  value={gridSize}
                  onChange={(value) => {
                    useOptionsStore.getState().setGridSize(value);
                    setGridSizeDom(value);
                  }}
                />
                <SlideInput
                  label="Min zoom"
                  icon={IconZoomOut}
                  min={5}
                  max={100}
                  value={gridMinZoom}
                  onChange={(value) => {
                    useOptionsStore.getState().setGridMinZoom(value);
                    setGridMinZoomDom(value);
                  }}
                />
              </div>
            </div>
            <div>
              <Sketches />
            </div>
          </>
        )}
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
              <SlideInput
                icon={IconBorderCornerRounded}
                min={-100}
                max={100}
                value={(shape as RoundedRectangle)?.radius as number}
                onChange={(value) => updateShape("radius", value)}
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
        <History />
      </div>
      <div>
        <Layers />
      </div>
      <div className="pt-16"></div>
    </div>
  );
};

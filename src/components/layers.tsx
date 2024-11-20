import { useCanvasStore } from "@/canvas/canvas.store";
import { usePointerStore } from "@/canvas/pointer.tool";
import { Shape } from "two.js/src/shape";

export const Layers = () => {
  const shapes = useCanvasStore((state) => state.shapes);

  return (
    <>
      <div className="pb-1 pt-4">Layers</div>
      <div className="h-64 overflow-y-auto scroll-smooth shadow rounded bg-panel">
        <div className="flex flex-col gap-1">
          {shapes.map((shape) => (
            <ShapeItem shape={shape} key={shape.id} />
          ))}
        </div>
      </div>
    </>
  );
};

export const SelectedShapes = () => {
  const selected = usePointerStore((state) => state.selected);

  return (
    <>
      <div className="pb-1 pt-4">Selected</div>
      <div className="h-64 overflow-y-auto scroll-smooth shadow rounded bg-panel">
        <div className="flex flex-col gap-1">
          {selected.map((shape) => (
            <ShapeItem shape={shape} key={shape.id} />
          ))}
        </div>
      </div>
    </>
  );
};

interface ShapeProps {
  shape: Shape;
}

const ShapeItem = ({ shape }: ShapeProps) => {
  return (
    <div className="border-b border-border flex items-center">
      <div className="w-8 h-8"></div>
      <div className="flex-grow">Vertices: {shape.id}</div>
    </div>
  );
};

import { useCanvasStore } from "@/canvas/canvas.store";
import { usePointerStore } from "@/canvas/tools/pointer.tool";
import { useMemo } from "react";
import { Shape } from "two.js/src/shape";

export const Layers = () => {
  const shapes = useCanvasStore((state) => state.shapes);
  const selected = usePointerStore((state) => state.selected);

  const selectedIds = useMemo(
    () => selected.map((item) => item.id),
    [selected]
  );
  return (
    <>
      <div className="pb-1 pt-4">Layers</div>
      <div className="h-64 overflow-y-auto scroll-smooth shadow rounded bg-default-3">
        <div className="flex flex-col  text-sm">
          {shapes.map((shape) => (
            <ShapeItem
              shape={shape}
              key={shape.id}
              isSelected={selectedIds.includes(shape.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

interface ShapeProps {
  shape: Shape;
  isSelected?: boolean;
}

const ShapeItem = ({ shape, isSelected }: ShapeProps) => {
  return (
    <button
      type="button"
      className={`flex items-center hover:bg-default-4 text-left ${
        isSelected ? "bg-secondary" : ""
      }`}
    >
      <div className="w-8 h-8"></div>
      <div className="flex-grow">{shape.id}</div>
    </button>
  );
};

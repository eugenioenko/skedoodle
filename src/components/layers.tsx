import { useCanvasStore } from "@/canvas/canvas.store";
import { Shape } from "two.js/src/shape";

export const Layers = () => {
  const shapes = useCanvasStore((state) => state.shapes);

  return (
    <>
      <div className="pb-1">Layers</div>
      <div className="rounded bg-border h-96 overflow-y-auto scroll-smooth shadow flex flex-col gap-1">
        {shapes.map((shape) => (
          <ShapeItem shape={shape} key={shape.id} />
        ))}
      </div>
    </>
  );
};

interface ShapeProps {
  shape: Shape;
}

const ShapeItem = ({ shape }: ShapeProps) => {
  return (
    <div className="border-b border-black flex items-center">
      <div className="w-8 h-8"></div>
      <div className="flex-grow">Vertices: {shape.id}</div>
    </div>
  );
};

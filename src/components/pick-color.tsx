import { useCanvasStore } from "@/canvas/canvas.store";
import { ColorPicker } from "primereact/colorpicker";

export const PickColor = () => {
  const fillColor = useCanvasStore((state) => state.fillColor);
  const strokeColor = useCanvasStore((state) => state.strokeColor);
  const setFillColor = useCanvasStore((state) => state.setFillColor);
  const setStrokeColor = useCanvasStore((state) => state.setStrokeColor);

  return (
    <div className="flex flex-row md:flex-col gap-4 justify-center">
      <ColorPicker
        value={fillColor}
        onChange={(e) => setFillColor(`#${e.value}`)}
      />
      <div className="relative">
        <ColorPicker
          value={strokeColor}
          onChange={(e) => setStrokeColor(`#${e.value}`)}
        />
        <div className="w-4 h-4 bg-toolbar rounded absolute left-2 top-2 pointer-events-none"></div>
      </div>
    </div>
  );
};

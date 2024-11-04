import { useCanvasStore } from "@/canvas/canvas.store";

export const ToolOptions = () => {
  const strokeWidth = useCanvasStore((state) => state.strokeWidth);
  const setStrokeWidth = useCanvasStore((state) => state.setStrokeWidth);

  return (
    <>
      <div className="flex flex-row gap-2 text-xs items-center">
        <label>Width</label>
        <input
          value={strokeWidth}
          className="max-w-14"
          onChange={(e) => setStrokeWidth(e.target.value)}
        />
      </div>
    </>
  );
};

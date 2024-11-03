import { useCanvasStore } from "@/canvas/canvas.store";
import { useZoomStore } from "@/canvas/zoom.tool";

export const StatusBar = () => {
  const cursor = useCanvasStore((state) => state.cursor);
  const zoom = useZoomStore((state) => state.zoom);
  if (cursor) {
    const x = Math.floor(cursor.x);
    const y = Math.floor(cursor.y);
    return (
      <div className="flex justify-end py-1 px-4 text-xs gap-4">
        <div>
          {x}:{y}
        </div>
        <div className="w-24">{zoom}%</div>
      </div>
    );
  }
  return null;
};

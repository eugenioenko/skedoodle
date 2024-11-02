import { useCanvasStore } from "@/canvas/canvas.store";

export const StatusBar = () => {
  const cursor = useCanvasStore((state) => state.cursor);
  if (cursor) {
    const x = Math.floor(cursor.x);
    const y = Math.floor(cursor.y);
    return (
      <div className="flex justify-end py-1 px-4 text-xs">
        <div>
          {x}:{y}
        </div>
      </div>
    );
  }
  return null;
};

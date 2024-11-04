import { useCanvasStore } from "@/canvas/canvas.store";
import { useZoomStore } from "@/canvas/zoom.tool";
import { IconMenu2 } from "@tabler/icons-react";
import { useState } from "react";

export const Panel = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const zoom = useZoomStore((state) => state.zoom);

  return (
    <div
      className={`transition-all duration-150 w-64 absolute right-0 top-0 overflow-hidden ${
        isCollapsed ? "h-10" : "h-[calc(100%-56px)] md:h-full"
      }`}
    >
      <div
        className={`bg-toolbar border-l border-border p-2 h-full ${
          isCollapsed ? "rounded-bl-lg" : ""
        }`}
      >
        <div className="flex items-center">
          <button type="button" onClick={() => setIsCollapsed(!isCollapsed)}>
            <IconMenu2 stroke={1} />
          </button>
          <div className="flex-grow text-right text-xs">{zoom}%</div>
        </div>
      </div>
    </div>
  );
};

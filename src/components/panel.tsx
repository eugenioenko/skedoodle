"use client";

import { useZoomStore } from "@/canvas/zoom.tool";
import { IconMenu2 } from "@tabler/icons-react";
import { useState } from "react";
import { Properties } from "./properties";

export const Panel = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        <div className="flex items-center w-full">
          <button type="button" onClick={() => setIsCollapsed(!isCollapsed)}>
            <IconMenu2 stroke={1} />
          </button>
          <CanvasBar />
        </div>
        <Properties />
      </div>
    </div>
  );
};

const CanvasBar = () => {
  const zoom = useZoomStore((state) => state.zoom);

  return (
    <div className="text-sm flex justify-end w-full">
      <div>{zoom}%</div>
    </div>
  );
};

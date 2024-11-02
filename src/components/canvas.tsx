"use client";

import { handlers } from "@/canvas/canvas.service";
import { useInitTwoCanvas } from "@/canvas/use-canvas";
import { useRef } from "react";

export const Canvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useInitTwoCanvas(containerRef);

  return (
    <div
      className="w-full h-full bg-white overflow-hidden"
      ref={containerRef}
      onWheel={(e) => handlers.doMouseWheel(e)}
      onMouseDown={(e) => handlers.doMouseDown(e)}
      onMouseMove={(e) => handlers.doMouseMove(e)}
      onMouseUp={(e) => handlers.doMouseUp(e)}
    ></div>
  );
};

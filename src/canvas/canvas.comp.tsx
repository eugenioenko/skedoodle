"use client";

import { handlers } from "@/canvas/canvas.service";
import { useInitTwoCanvas } from "@/canvas/canvas.hook";
import { useRef } from "react";

export const Canvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useInitTwoCanvas(containerRef);

  return (
    <div
      className="flex-grow bg-white overflow-hidden"
      ref={containerRef}
      onMouseDown={(e) => handlers.doMouseDown(e)}
      onMouseMove={(e) => handlers.doMouseMove(e)}
      onMouseUp={(e) => handlers.doMouseUp(e)}
      onMouseOut={(e) => handlers.doMouseOut(e)}
    ></div>
  );
};

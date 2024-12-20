"use client";

import { handlers } from "@/canvas/canvas.service";
import { useInitTwoCanvas } from "@/canvas/canvas.hook";
import { useRef } from "react";
import { useCanvasStore, useSettingsStore } from "./canvas.store";
import { colord } from "colord";

export const Canvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedTool = useCanvasStore((state) => state.selectedTool);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolOption = useCanvasStore((state) => state.toolOption);
  const canvasColor = useSettingsStore((state) => state.canvasColor);
  const bgColor = colord(canvasColor).toHex();

  useInitTwoCanvas(containerRef);

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className="canvas-container flex-grow overflow-hidden"
      tabIndex={0}
      ref={containerRef}
      data-selected={selectedTool}
      data-active={activeTool}
      data-option={toolOption}
      onMouseDown={(e) => handlers.doMouseDown(e)}
      onMouseMove={(e) => handlers.doMouseMove(e)}
      onMouseUp={(e) => handlers.doMouseUp(e)}
      onMouseOut={(e) => handlers.doMouseOut(e)}
      onMouseOver={(e) => handlers.doMouseOver(e)}
      onTouchStart={(e) => handlers.doTouchStart(e)}
      onTouchMove={(e) => handlers.doTouchMove(e)}
      onTouchEnd={(e) => handlers.doTouchEnd(e)}
    ></div>
  );
};

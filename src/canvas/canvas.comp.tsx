import { handlers } from "@/canvas/canvas.service";
import { useInitTwoCanvas } from "@/canvas/canvas.hook";
import { useRef } from "react";
import { useOptionsStore } from "./canvas.store";
import { colord } from "colord";

interface CanvasProps {
  sketchId: string;
  onReady?: () => void;
}

export const Canvas = ({ sketchId, onReady }: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedTool = useOptionsStore((state) => state.selectedTool);
  const activeTool = useOptionsStore((state) => state.activeTool);
  const toolOption = useOptionsStore((state) => state.toolOption);
  const canvasColor = useOptionsStore((state) => state.canvasColor);
  const bgColor = colord(canvasColor).toHex();

  useInitTwoCanvas(containerRef, sketchId, onReady);

  return (
    <div
      style={{ backgroundColor: bgColor || "black" }}
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

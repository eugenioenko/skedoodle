import { MouseEvent, TouchEvent } from "react";
import { useCanvasStore } from "./canvas.store";
import {
  eventToSurfacePosition,
  MouseButton,
  touchEventToMouseEvent,
} from "./canvas.utils";
import { Doodler, getDoodler } from "./doodle.service";
import { doBrushMove, doBrushStart, doBrushUp } from "./tools/brush.tool";
import { doDragMove, doDragStart, doDragTranslate } from "./tools/drag.tool";
import { doDeleteShape } from "./tools/eraser.tool";
import {
  doPointerEnd,
  doPointerMove,
  doPointerStart,
  doTryHighlight,
} from "./tools/pointer.tool";
import { doShapeMove, doShapeStart, doShapeUp } from "./tools/shape.tool";
import { doZoom } from "./tools/zoom.tool";
import { throttle } from "@/utils/throttle";

export interface Coordinates {
  x: number;
  y: number;
}

function doMouseDown(e: MouseEvent<HTMLDivElement>) {
  const { selectedTool, setActiveTool, setRestoreTool, setSelectedTool } =
    useCanvasStore.getState();

  if (e.button === MouseButton.Middle) {
    setRestoreTool(selectedTool);
    setActiveTool("hand");
    setSelectedTool("hand");
    doDragStart(e);
    return;
  }

  setActiveTool(selectedTool || "hand");

  if (selectedTool === "hand") {
    doDragStart(e);
    return;
  }

  if (selectedTool === "pointer") {
    doPointerStart(e);
    return;
  }

  if (selectedTool === "eraser") {
    doDeleteShape(e);
    return;
  }

  if (selectedTool === "brush") {
    doBrushStart(e);
    return;
  }

  if (selectedTool === "square") {
    doShapeStart(e);
    return;
  }

  if (selectedTool === "zoom") {
    if (e.shiftKey) {
      doZoom(e, -30);
    } else {
      doZoom(e, 30);
    }
    return;
  }
}

const throttledCursorUpdate = throttle((e: MouseEvent<HTMLDivElement>) => {
  if (!e.currentTarget) {
    return;
  }
  const doodler = getDoodler();
  const cursor = eventToSurfacePosition(e, doodler?.zui);
  const { setCursor } = useCanvasStore.getState();
  setCursor(cursor);
}, 16);

function doMouseMove(e: MouseEvent<HTMLDivElement>) {
  const { activeTool, selectedTool } = useCanvasStore.getState();

  throttledCursorUpdate(e);

  // highlight the shapes but only when not actively erasing
  if (selectedTool === "eraser" && activeTool !== "eraser") {
    doTryHighlight(e);
  }

  if (selectedTool === "pointer") {
    doPointerMove(e);
    return;
  }

  if (!activeTool) {
    return;
  }

  if (activeTool === "hand") {
    doDragMove(e);
    return;
  }

  if (activeTool === "eraser") {
    doDeleteShape(e);
    return;
  }

  if (activeTool === "brush") {
    doBrushMove(e);
    return;
  }

  if (activeTool === "square") {
    doShapeMove(e);
    return;
  }
}

function doMouseUp(e: MouseEvent<HTMLDivElement>) {
  const {
    activeTool,
    setActiveTool,
    restoreTool,
    setRestoreTool,
    setSelectedTool,
  } = useCanvasStore.getState();
  if (!activeTool) {
    return;
  }

  if (restoreTool) {
    setSelectedTool(restoreTool);
    setRestoreTool(undefined);
  }

  if (activeTool === "hand" || activeTool === "eraser") {
    setActiveTool(undefined);
  }

  if (activeTool === "pointer") {
    doPointerEnd(e);
    setActiveTool(undefined);
    return;
  }

  if (activeTool === "brush") {
    doBrushUp(e);
    setActiveTool(undefined);
    return;
  }

  if (activeTool === "square") {
    doShapeUp();
    setActiveTool(undefined);
    return;
  }
}

function doMouseOut(e: MouseEvent<HTMLDivElement>) {
  const { setCursor, activeTool } = useCanvasStore.getState();

  if (activeTool) {
    // TODO enable this
    // when moving out of the canvas active tool should be terminated but w
    // when rendering svg, moving on a shape is considered mouse out
    // doMouseUp(e);
    // return;
  }

  setCursor(undefined);
}

function doMouseOver(e: MouseEvent<HTMLDivElement>) {}

function doMouseWheel(e: WheelEvent): void {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey || e.altKey) {
    doZoom(e, -e.deltaY);
  } else {
    doDragTranslate(-e.deltaX, -e.deltaY);
  }
}

function doTouchStart(e: TouchEvent<HTMLDivElement>) {
  if (e.touches.length !== 1) {
    return;
  }
  doMouseDown(touchEventToMouseEvent(e));
}
function doTouchMove(e: TouchEvent<HTMLDivElement>) {
  if (e.touches.length !== 1) {
    return;
  }
  doMouseMove(touchEventToMouseEvent(e));
}
function doTouchEnd(e: TouchEvent<HTMLDivElement>) {
  doMouseUp(touchEventToMouseEvent(e));
}

function doWindowResize() {
  const { container } = useCanvasStore.getState();
  const doodler = getDoodler();

  if (!doodler.two || !container) {
    return;
  }

  if (
    container.clientWidth !== doodler.two.width ||
    container.clientHeight !== doodler.two.height
  ) {
    doodler.two.width = container.clientWidth;
    doodler.two.height = container.clientHeight;
  }

  doodler?.throttledTwoUpdate();
}

function doKeyDown(e: KeyboardEvent): void {}

function doUpdate(frameCount: number, deltaTime: number) {}

export const handlers = {
  doMouseWheel,
  doMouseDown,
  doMouseMove,
  doMouseUp,
  doMouseOut,
  doMouseOver,
  doTouchStart,
  doTouchMove,
  doTouchEnd,
  doWindowResize,
  doUpdate,
  doKeyDown,
};

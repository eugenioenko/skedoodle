import { MouseEvent, TouchEvent } from "react";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { useCanvasStore } from "./canvas.store";
import { doDragStart, doDragMove, doDragTranslate } from "./drag.tool";
import { doBrushMove, doBrushStart, doBrushUp } from "./brush.tool";
import {
  eventToSurfacePosition,
  MouseButton,
  touchEventToMouseEvent,
} from "./canvas.utils";
import { doShapeMove, doShapeStart, doShapeUp } from "./shape.tool";
import {
  doPointerEnd,
  doPointerMove,
  doPointerStart,
  doTryHighlight,
} from "./pointer.tool";
import { doDeleteShape } from "./eraser.tool";
import { doZoom } from "./zoom.tool";
import { Doodler } from "./doodle.service";

export interface Coordinates {
  x: number;
  y: number;
}

interface Context {
  two: Two;
  canvas: Group;
  zui: ZUI;
  doodler: Doodler;
}

export function ctx(): Context {
  const state = useCanvasStore.getState();
  return {
    two: state.two as Two,
    canvas: state.canvas as Group,
    zui: state.zui as ZUI,
    doodler: state.doodler as Doodler,
  };
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

function doMouseMove(e: MouseEvent<HTMLDivElement>) {
  const { activeTool, selectedTool, setCursor, zui } =
    useCanvasStore.getState();
  const cursor = eventToSurfacePosition(e, zui);
  setCursor(cursor);

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
  const { setCursor, activeTool, setActiveTool } = useCanvasStore.getState();

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
  if (e.touches.length !== 1) {
    return;
  }
  doMouseUp(touchEventToMouseEvent(e));
}

function doWindowResize() {
  const { two, container, doodler } = useCanvasStore.getState();

  if (!two || !container) {
    return;
  }

  if (
    container.clientWidth !== two.width ||
    container.clientHeight !== two.height
  ) {
    two.width = container.clientWidth;
    two.height = container.clientHeight;
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

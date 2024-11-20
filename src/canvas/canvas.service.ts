import { MouseEvent, TouchEvent } from "react";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { Tool, useCanvasStore } from "./canvas.store";
import { doDragStart, doDragMove, doDragTranslate } from "./drag.tool";
import { doBrushMove, doBrushStart, doBrushUp } from "./brush.tool";
import { eventToSurfacePosition } from "./canvas.utils";
import { doShapeMove, doShapeStart, doShapeUp } from "./shape.tool";
import {
  doPointerEnd,
  doPointerMove,
  doPointerStart,
  usePointerStore,
} from "./pointer.tool";
import { doDeleteShape } from "./eraser.tool";
import { doZoom } from "./zoom.tool";

export interface Coordinates {
  x: number;
  y: number;
}

interface Context {
  two: Two;
  canvas: Group;
  zui: ZUI;
  selectedTool?: Tool;
  activeTool?: Tool;
  cursor?: Coordinates;
}

export const ctx = (): Context => {
  const state = useCanvasStore.getState();
  return {
    two: state.two as Two,
    canvas: state.canvas as Group,
    zui: state.zui as ZUI,
    selectedTool: state.selectedTool,
    activeTool: state.activeTool,
    cursor: state.cursor,
  };
};

function doMouseDown(e: MouseEvent<HTMLDivElement>) {
  const { selectedTool, setActiveTool } = useCanvasStore.getState();

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
  const { activeTool, setActiveTool } = useCanvasStore.getState();
  if (!activeTool) {
    return;
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

  if (activeTool === "brush") {
    doBrushUp(e);
    setActiveTool(undefined);
    return;
  }

  setCursor(undefined);
}

function doMouseWheel(e: WheelEvent): void {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey || e.altKey) {
    doZoom(e, -e.deltaY);
  } else {
    doDragTranslate(-e.deltaX, -e.deltaY);
  }
}

function doTouchStart(e: TouchEvent<HTMLDivElement>) {}
function doTouchMove(e: TouchEvent<HTMLDivElement>) {}
function doTouchEnd(e: TouchEvent<HTMLDivElement>) {}

function doWindowResize() {
  const { two, container } = useCanvasStore.getState();

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
}

function doKeyDown(e: KeyboardEvent): void {}

function doKeyUp(e: KeyboardEvent): void {}

function doUpdate(frameCount: number, deltaTime: number) {}

export const handlers = {
  doMouseWheel,
  doMouseDown,
  doMouseMove,
  doMouseUp,
  doMouseOut,
  doTouchStart,
  doTouchMove,
  doTouchEnd,
  doWindowResize,
  doUpdate,
  doKeyDown,
  doKeyUp,
};

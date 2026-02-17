import { MouseEvent, TouchEvent } from "react";
import { useCanvasStore, useOptionsStore } from "./canvas.store";
import {
  MouseButton,
  touchEventToMouseEvent,
} from "./canvas.utils";
import { getDoodler } from "./doodler.client";
import { doBrushMove, doBrushStart, doBrushUp } from "./tools/brush.tool";
import { doDragMove, doDragStart, doDragTranslate } from "./tools/drag.tool";
import { doDeleteShape } from "./tools/eraser.tool";
import {
  doPointerEnd,
  doPointerMove,
  doPointerStart,
  doTryHighlight,
} from "./tools/pointer.tool";
import { doSquareMove, doSquareStart, doSquareUp } from "./tools/square.tool";
import { doEllipseStart, doEllipseMove, doEllipseUp } from "./tools/ellipse.tool";
import { doLineStart, doLineMove, doLineUp, useLineStore } from "./tools/line.tool";
import { doTextStart } from "./tools/text.tool";
import { doZoom } from "./tools/zoom.tool";
import { doBezierMove, doBezierNext, doBezierUp, finalizeBezier, cancelBezier } from "./tools/bezier.tool";
import { undo, redo, exitTimeTravelMode, pushCreateCommand } from "./history.service";
import { useCommandLogStore } from "./history.store";
import { doCursorUpdate } from "./tools/cursor.tool";
import { SerializedDoodle, serializeDoodle, unserializeDoodle } from "./doodle.utils";
import { usePointerStore } from "./tools/pointer.tool";

let clipboard: SerializedDoodle[] = [];

function doMouseDown(e: MouseEvent<HTMLDivElement>) {
  if (useCommandLogStore.getState().isTimeTraveling) return;

  const { selectedTool, setActiveTool, setRestoreTool, setSelectedTool } =
    useOptionsStore.getState();

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

  if (selectedTool === "bezier") {
    doBezierNext(e);
    return;
  }

  if (selectedTool === "square") {
    doSquareStart(e);
    return;
  }

  if (selectedTool === "ellipse") {
    doEllipseStart(e);
    return;
  }

  if (selectedTool === "line" || selectedTool === "arrow") {
    useLineStore.getState().setHasArrow(selectedTool === "arrow");
    doLineStart(e);
    return;
  }

  if (selectedTool === "text") {
    doTextStart(e);
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
  if (useCommandLogStore.getState().isTimeTraveling) return;

  const { activeTool, selectedTool } = useOptionsStore.getState();

  doCursorUpdate(e);

  // highlight the shapes but only when not actively erasing
  if (selectedTool === "eraser" && activeTool !== "eraser") {
    doTryHighlight(e);
  }

  if (selectedTool === "pointer") {
    doPointerMove(e);
    return;
  }

  if (selectedTool === "bezier") {
    doBezierMove(e);
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
    doSquareMove(e);
    return;
  }

  if (activeTool === "ellipse") {
    doEllipseMove(e);
    return;
  }

  if (activeTool === "line" || activeTool === "arrow") {
    doLineMove(e);
    return;
  }
}

function doMouseUp(e: MouseEvent<HTMLDivElement>) {
  if (useCommandLogStore.getState().isTimeTraveling) return;

  const {
    activeTool,
    setActiveTool,
    restoreTool,
    setRestoreTool,
    setSelectedTool,
  } = useOptionsStore.getState();
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

  if (activeTool === "bezier") {
    doBezierUp();
    setActiveTool(undefined);
    return;
  }

  if (activeTool === "square") {
    doSquareUp();
    setActiveTool(undefined);
    return;
  }

  if (activeTool === "ellipse") {
    doEllipseUp();
    setActiveTool(undefined);
    return;
  }

  if (activeTool === "line" || activeTool === "arrow") {
    doLineUp();
    setActiveTool(undefined);
    return;
  }
}

function doMouseOut(_: MouseEvent<HTMLDivElement>) {
  const { setCursor } = useCanvasStore.getState();
  const { activeTool } = useOptionsStore.getState();

  if (activeTool) {
    // TODO enable this
    // when moving out of the canvas active tool should be terminated but w
    // when rendering svg, moving on a shape is considered mouse out
    // doMouseUp(e);
    // return;
  }

  setCursor(undefined);
}

function doMouseOver(_: MouseEvent<HTMLDivElement>) { }

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

function doKeyDown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
    return;
  }

  if (useCommandLogStore.getState().isTimeTraveling) {
    if (e.key === "Escape") {
      e.preventDefault();
      exitTimeTravelMode();
    }
    return;
  }

  const { selectedTool } = useOptionsStore.getState();

  // Bezier tool: Enter to finish, Escape to cancel
  if (selectedTool === "bezier") {
    if (e.key === "Enter") {
      e.preventDefault();
      finalizeBezier();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelBezier();
      return;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "Z" || e.key === "z")) {
    e.preventDefault();
    redo();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    undo();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C") && !e.shiftKey) {
    e.preventDefault();
    doCopy();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V") && !e.shiftKey) {
    e.preventDefault();
    doPaste();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D") && !e.shiftKey) {
    e.preventDefault();
    doDuplicate();
    return;
  }
}

function doCopy(): void {
  const { selected } = usePointerStore.getState();
  const { doodles } = useCanvasStore.getState();
  if (selected.length === 0) return;

  const selectedIds = new Set(selected.map((s) => s.id));
  clipboard = doodles
    .filter((d) => selectedIds.has(d.shape.id))
    .map((d) => serializeDoodle(d));
}

function doPaste(): void {
  if (clipboard.length === 0) return;

  const doodler = getDoodler();
  const pasteOffset = useOptionsStore.getState().pasteOffset;
  const { clearSelected } = usePointerStore.getState();
  clearSelected();

  for (const serialized of clipboard) {
    const offset = { ...serialized, x: serialized.x + pasteOffset, y: serialized.y + pasteOffset };
    const doodle = unserializeDoodle(offset);
    doodler.addDoodle(doodle);
    pushCreateCommand(doodle);
  }

  // Shift clipboard so consecutive pastes cascade
  clipboard = clipboard.map((s) => ({ ...s, x: s.x + pasteOffset, y: s.y + pasteOffset }));

  doodler.throttledTwoUpdate();
}

function doDuplicate(): void {
  const { selected } = usePointerStore.getState();
  const { doodles } = useCanvasStore.getState();
  if (selected.length === 0) return;

  const doodler = getDoodler();
  const pasteOffset = useOptionsStore.getState().pasteOffset;
  const { clearSelected } = usePointerStore.getState();

  const selectedIds = new Set(selected.map((s) => s.id));
  const serializedItems = doodles
    .filter((d) => selectedIds.has(d.shape.id))
    .map((d) => serializeDoodle(d));

  clearSelected();

  for (const serialized of serializedItems) {
    const offset = { ...serialized, x: serialized.x + pasteOffset, y: serialized.y + pasteOffset };
    const doodle = unserializeDoodle(offset);
    doodler.addDoodle(doodle);
    pushCreateCommand(doodle);
  }

  doodler.throttledTwoUpdate();
}

function doUpdate() { }

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

import { MouseEvent } from "react";

import { Rectangle } from "two.js/src/shapes/rectangle";
import { Shape } from "two.js/src/shape";
import { Vector } from "two.js/src/vector";
import { create } from "zustand";
import { useCanvasStore, useOptionsStore } from "../canvas.store";
import {
  ColorHighlight,
  eventToClientPosition,
  eventToSurfacePosition,
  isPointInRect,
  applyHighlight,
  restoreHighlight,
  syncHighlightClone,
  updateHighlightScales,
} from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushUpdateCommand } from "../history.service";
import {
  showResizeHandles,
  hideResizeHandles,
  updateResizeHandleScales,
  hitTestResizeHandle,
  isPointInGroupOutline,
  storeHandleOriginsForMove,
  moveHandlesByDelta,
} from "./resize.handles";
import {
  startResize,
  doResize as doResizeDrag,
  endResize,
  isResizing,
  startRotate,
  doRotate as doRotateDrag,
  endRotate,
  isRotating,
} from "./resize.tool";

export interface PointerState {
  origin: Vector;
  highlighted?: Shape;
  selected: Shape[];
  isMoving: boolean;
  origins: Vector[];
  clearSelected: () => void;
  addHighlightToSelection: (join: boolean) => void;
  setHighlight: (shape: Shape) => void;
  setOrigins: (origins: Vector[]) => void;
  clearHighlight: () => void;
  setIsMoving: (isMoving: boolean) => void;
  selectShapes: (shapes: Shape[]) => void;
}

export const usePointerStore = create<PointerState>()((set) => ({
  selected: [],
  origin: new Vector(),
  origins: [],
  highlighted: undefined,
  isMoving: false,
  setIsMoving: (isMoving) => set((state) => ({ ...state, isMoving })),
  setOrigins: (origins) => set((state) => ({ ...state, origins })),
  setHighlight: (shape) =>
    set((state) => doHighlightShape(state, shape)),
  clearHighlight: () => set((state) => doClearHighlight(state)),
  clearSelected: () => set((state) => clearSelected(state)),
  addHighlightToSelection: (join: boolean) =>
    set((state) => addToSelection(state, join)),
  selectShapes: (shapes: Shape[]) =>
    set((state) => selectShapesDirect(state, shapes)),
}));

// Clean up handles when switching away from pointer tool
let pointerCleanupInitialized = false;
export function initPointerToolCleanup(): void {
  if (pointerCleanupInitialized) return;
  pointerCleanupInitialized = true;
  useOptionsStore.subscribe((state, prevState) => {
    if (prevState.selectedTool === "pointer" && state.selectedTool !== "pointer") {
      cancelMarquee();
      const { clearSelected } = usePointerStore.getState();
      clearSelected();
      useOptionsStore.getState().setToolOption("");
      getDoodler().throttledTwoUpdate();
    }
  });
}

function doHighlightShape(
  state: PointerState,
  shape: Shape
): PointerState {
  if (state.highlighted) {
    restoreHighlight(state.highlighted);
  }
  applyHighlight(shape);
  state.highlighted = shape;
  return state;
}

function doClearHighlight(state: PointerState): PointerState {
  if (state.highlighted) {
    restoreHighlight(state.highlighted);
  }
  state.highlighted = undefined;
  return state;
}

function addToSelection(state: PointerState, join: boolean): PointerState {
  const highlighted = state.highlighted;

  if (!highlighted) {
    if (join) {
      return { ...state };
    } else {
      for (const s of state.selected) restoreHighlight(s);
      hideResizeHandles();
      return { ...state, selected: [] };
    }
  }

  // End hover state, then re-apply as selection highlight
  doClearHighlight(state);

  let selected = [...state.selected];
  const isAlreadySelected = state.selected.find(
    (shape) => shape.id === highlighted?.id
  );
  let selectionChanged = false;

  if (join && isAlreadySelected) {
    selected = selected.filter((item) => item.id !== highlighted.id);
    restoreHighlight(highlighted);
    selectionChanged = true;
  } else if (join && !isAlreadySelected) {
    selected.push(highlighted);
    applyHighlight(highlighted);
    selectionChanged = true;
  } else if (!join && !isAlreadySelected) {
    for (const s of state.selected) restoreHighlight(s);
    selected = [highlighted];
    applyHighlight(highlighted);
    selectionChanged = true;
  }

  if (selectionChanged) {
    if (selected.length > 0) {
      showResizeHandles(selected);
    } else {
      hideResizeHandles();
    }
  }
  return { ...state, selected };
}

function clearSelected(state: PointerState): PointerState {
  for (const s of state.selected) restoreHighlight(s);
  hideResizeHandles();
  return { ...state, selected: [] };
}

function selectShapesDirect(state: PointerState, shapes: Shape[]): PointerState {
  for (const s of state.selected) restoreHighlight(s);
  hideResizeHandles();

  if (shapes.length === 0) {
    return { ...state, selected: [] };
  }

  for (const shape of shapes) {
    applyHighlight(shape);
  }

  showResizeHandles(shapes);
  return { ...state, selected: shapes };
}

function startMoveSelection(): void {
  const { setToolOption } = useOptionsStore.getState();
  const { setIsMoving, setOrigins } = usePointerStore.getState();
  const selected = usePointerStore.getState().selected;
  setIsMoving(true);
  setToolOption("moving");
  const origins = selected.map((shape) => shape.translation.clone());

  storeHandleOriginsForMove();

  // Clear hover highlight before moving
  const { clearHighlight } = usePointerStore.getState();
  clearHighlight();

  setOrigins(origins);
}

// ── Marquee selection ──────────────────────────────────────────────

let marqueeRect: Rectangle | null = null;
let marqueeOriginX = 0;
let marqueeOriginY = 0;
let isMarqueeActive = false;

function startMarquee(surfacePos: { x: number; y: number }): void {
  const doodler = getDoodler();
  marqueeOriginX = surfacePos.x;
  marqueeOriginY = surfacePos.y;
  isMarqueeActive = true;

  const rect = doodler.two.makeRectangle(surfacePos.x, surfacePos.y, 0, 0);
  rect.noFill();
  rect.stroke = ColorHighlight;
  rect.linewidth = 1.5 / doodler.zui.scale;
  rect.opacity = 0.6;
  doodler.highlights.add(rect);
  marqueeRect = rect;
}

function updateMarquee(surfacePos: { x: number; y: number }): void {
  if (!marqueeRect) return;
  const w = surfacePos.x - marqueeOriginX;
  const h = surfacePos.y - marqueeOriginY;
  marqueeRect.width = Math.abs(w);
  marqueeRect.height = Math.abs(h);
  marqueeRect.translation.x = marqueeOriginX + w / 2;
  marqueeRect.translation.y = marqueeOriginY + h / 2;
  getDoodler().throttledTwoUpdate();
}

function endMarquee(shiftKey: boolean): void {
  if (!marqueeRect) return;
  const doodler = getDoodler();

  // Compute marquee bounds in client space for hit testing
  const minX = Math.min(marqueeOriginX, marqueeRect.translation.x + marqueeRect.width / 2);
  const maxX = Math.max(marqueeOriginX, marqueeRect.translation.x + marqueeRect.width / 2);
  const minY = Math.min(marqueeOriginY, marqueeRect.translation.y + marqueeRect.height / 2);
  const maxY = Math.max(marqueeOriginY, marqueeRect.translation.y + marqueeRect.height / 2);

  // Find all shapes whose bounding box overlaps the marquee
  const { doodles } = useCanvasStore.getState();
  const hits: Shape[] = [];
  for (const doodle of doodles) {
    const shape = doodle.shape;
    if (!(shape as any).getBoundingClientRect) continue;

    const item = (shape as any).getBoundingClientRect(false);
    const topLeft = doodler.zui.clientToSurface({ x: item.left, y: item.top });
    const bottomRight = doodler.zui.clientToSurface({ x: item.right, y: item.bottom });

    // Check overlap (not containment — any intersection counts)
    if (bottomRight.x >= minX && topLeft.x <= maxX &&
        bottomRight.y >= minY && topLeft.y <= maxY) {
      hits.push(shape);
    }
  }

  // Remove marquee visual
  marqueeRect.remove();
  marqueeRect = null;
  isMarqueeActive = false;

  if (hits.length > 0) {
    const { selectShapes } = usePointerStore.getState();
    if (shiftKey) {
      // Add to existing selection
      const { selected } = usePointerStore.getState();
      const existingIds = new Set(selected.map(s => s.id));
      const combined = [...selected, ...hits.filter(h => !existingIds.has(h.id))];
      selectShapes(combined);
    } else {
      selectShapes(hits);
    }
  }

  doodler.throttledTwoUpdate();
}

function cancelMarquee(): void {
  if (marqueeRect) {
    marqueeRect.remove();
    marqueeRect = null;
  }
  isMarqueeActive = false;
}

export function doPointerStart(e: MouseEvent<HTMLDivElement>): void {
  initPointerToolCleanup();
  const doodler = getDoodler();
  const { origin, addHighlightToSelection, clearSelected, selected } =
    usePointerStore.getState();
  // pointer to measure distance fro movement within the surface
  const surfacePointer = eventToSurfacePosition(e);
  // pointer to calculate if a client rect is within
  const clientPointer = eventToClientPosition(e);

  origin.set(surfacePointer.x, surfacePointer.y);

  // Check resize/rotate handles first (priority over move)
  if (selected.length > 0) {
    const hitHandle = hitTestResizeHandle(surfacePointer);
    if (hitHandle === "rotate") {
      startRotate(selected, new Map(), surfacePointer);
      doodler.throttledTwoUpdate();
      return;
    }
    if (hitHandle) {
      startResize(hitHandle, selected, new Map());
      doodler.throttledTwoUpdate();
      return;
    }
  }

  const { highlighted } = usePointerStore.getState();
  let isClickWithinHighlight = false;
  if (highlighted) {
    const box = (highlighted as any).getBoundingClientRect(false);
    isClickWithinHighlight = isPointInRect(
      clientPointer.x, clientPointer.y,
      box.left, box.top, box.right, box.bottom
    );
  }

  if (isClickWithinHighlight) {
    addHighlightToSelection(e.shiftKey);
    const selected = usePointerStore.getState().selected;
    if (selected.length) {
      startMoveSelection();
      doodler.throttledTwoUpdate();
      return;
    }
  }

  // Check if click is within any selected shape
  let isClickWithinSelected = false;
  for (const shape of selected) {
    if (!(shape as any).getBoundingClientRect) continue;
    const item = (shape as any).getBoundingClientRect(false);
    if (isPointInRect(clientPointer.x, clientPointer.y, item.left, item.top, item.right, item.bottom)) {
      isClickWithinSelected = true;
      break;
    }
  }

  if (isClickWithinSelected) {
    startMoveSelection();
    doodler.throttledTwoUpdate();
    return;
  }

  // Check if click is within the group outline (multi-select boundary)
  if (selected.length > 0 && isPointInGroupOutline(clientPointer)) {
    startMoveSelection();
    doodler.throttledTwoUpdate();
    return;
  }

  if (!e.shiftKey) {
    clearSelected();
  }

  // Start marquee selection drag
  startMarquee(surfacePointer);
  doodler.throttledTwoUpdate();
}

const HANDLE_CURSOR_OPTION: Record<string, string> = {
  nw: "handle-nwse",
  se: "handle-nwse",
  ne: "handle-nesw",
  sw: "handle-nesw",
  rotate: "handle-rotate",
};

function updateHandleHoverCursor(e: MouseEvent<HTMLDivElement>): void {
  const { selected } = usePointerStore.getState();
  const { toolOption, setToolOption } = useOptionsStore.getState();
  const desired =
    selected.length > 0
      ? HANDLE_CURSOR_OPTION[hitTestResizeHandle(eventToSurfacePosition(e)) ?? ""] ?? ""
      : "";
  if (desired !== toolOption) setToolOption(desired);
}

export function doPointerMove(e: MouseEvent<HTMLDivElement>): void {
  if (isRotating()) {
    doRotateDrag(eventToSurfacePosition(e), e.shiftKey);
    return;
  }
  if (isResizing()) {
    doResizeDrag(eventToSurfacePosition(e), e.shiftKey);
    return;
  }
  if (isMarqueeActive) {
    updateMarquee(eventToSurfacePosition(e));
    return;
  }
  const { isMoving } = usePointerStore.getState();
  if (isMoving) {
    doMoveShape(e);
  } else {
    updateHandleHoverCursor(e);
    doTryHighlight(e);
  }
}

export function doPointerEnd(e: MouseEvent<HTMLDivElement>) {
  if (isMarqueeActive) {
    endMarquee(e.shiftKey);
    return;
  }
  if (isRotating()) {
    endRotate();
    getDoodler().throttledTwoUpdate();
    return;
  }
  if (isResizing()) {
    endResize();
    getDoodler().throttledTwoUpdate();
    return;
  }
  const { isMoving, setIsMoving, selected, origins } =
    usePointerStore.getState();
  const { setToolOption } = useOptionsStore.getState();
  const doodler = getDoodler();

  if (isMoving && selected.length && origins.length === selected.length) {
    for (let i = 0; i < selected.length; i++) {
      const shape = selected[i];
      const origin = origins[i];
      pushUpdateCommand(
        shape.id,
        {
          "translation.x": shape.translation.x,
          "translation.y": shape.translation.y,
        },
        {
          "translation.x": origin.x,
          "translation.y": origin.y,
        }
      );
    }
  }

  setIsMoving(false);
  setToolOption("");
  doodler.throttledTwoUpdate();
}


function doMoveShape(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { origins, origin, selected } = usePointerStore.getState();
  const pointer = eventToSurfacePosition(e);
  if (selected.length !== origins.length) {
    return;
  }

  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  for (let i = 0; i < selected.length; ++i) {
    const shape = selected[i];
    const origin = origins[i];
    shape.translation.x = origin.x + dx;
    shape.translation.y = origin.y + dy;
    syncHighlightClone(shape);
  }

  // Move resize handles
  moveHandlesByDelta(dx, dy);

  doodler.throttledTwoUpdate();
}

export function doTryHighlight(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
  const { doodles } = useCanvasStore.getState();
  const { highlighted, setHighlight, clearHighlight } =
    usePointerStore.getState();

  const pointer = eventToClientPosition(e);

  for (const doodle of doodles) {
    const shape = doodle.shape;
    if (!(shape as any).getBoundingClientRect) {
      continue;
    }
    const item = (shape as any).getBoundingClientRect(false);
    const isShapeWithin = isPointInRect(
      pointer.x,
      pointer.y,
      item.left,
      item.top,
      item.right,
      item.bottom
    );

    const { selected } = usePointerStore.getState();
    const isSelected = selected.some((s) => s.id === shape.id);
    if (!isShapeWithin || isSelected) {
      continue;
    }

    if (highlighted === shape) {
      return;
    }

    setHighlight(shape);
    doodler.throttledTwoUpdate();
    return;
  }
  clearHighlight();
  doodler.throttledTwoUpdate();
}

/**
 * Rebuilds outlines and handles for the current zoom level. Called by zoom tools.
 */
export function updateOutlineScales(): void {
  const { selected } = usePointerStore.getState();
  updateResizeHandleScales(selected);
  updateHighlightScales();
}

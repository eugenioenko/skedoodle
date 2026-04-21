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

interface Outlines {
  selectedStrokes: Map<string, SavedStroke>;
}

interface SavedStroke {
  stroke: string;
  linewidth: number;
}

export interface PointerState {
  origin: Vector;
  highlighted?: Shape;
  highlightedOriginalStroke?: SavedStroke;
  selected: Shape[];
  isMoving: boolean;
  outlines: Outlines;
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
  outlines: {
    selectedStrokes: new Map(),
  },
  setIsMoving: (isMoving) => set((state) => ({ ...state, isMoving })),
  setOrigins: (origins) => set((state) => ({ ...state, origins })),
  setHighlight: (shape) =>
    set((state) => highlightShape(state, shape)),
  clearHighlight: () => set((state) => clearHighlight(state)),
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

function highlightShape(
  state: PointerState,
  shape: Shape
): PointerState {
  // Restore previous highlight if any
  if (state.highlighted && state.highlightedOriginalStroke) {
    const prev = state.highlighted as any;
    prev.stroke = state.highlightedOriginalStroke.stroke;
    prev.linewidth = state.highlightedOriginalStroke.linewidth;
  }

  // Save original stroke and apply highlight
  const s = shape as any;
  const originalStroke: SavedStroke = {
    stroke: (s.stroke as string) || "none",
    linewidth: s.linewidth || 0,
  };
  s.stroke = ColorHighlight;
  s.linewidth = Math.max(originalStroke.linewidth, 2);

  state.highlighted = shape;
  state.highlightedOriginalStroke = originalStroke;

  return state;
}

function clearHighlight(state: PointerState): PointerState {
  // Restore original stroke
  if (state.highlighted && state.highlightedOriginalStroke) {
    const s = state.highlighted as any;
    s.stroke = state.highlightedOriginalStroke.stroke;
    s.linewidth = state.highlightedOriginalStroke.linewidth;
  }
  state.highlighted = undefined;
  state.highlightedOriginalStroke = undefined;
  return state;
}

function applySelectionStroke(shape: Shape, outlines: Outlines): void {
  const s = shape as any;
  outlines.selectedStrokes.set(shape.id, {
    stroke: (s.stroke as string) || "none",
    linewidth: s.linewidth || 0,
  });
  s.stroke = ColorHighlight;
  s.linewidth = Math.max(s.linewidth || 0, 2);
}

function restoreSelectionStroke(shape: Shape, outlines: Outlines): void {
  const saved = outlines.selectedStrokes.get(shape.id);
  if (saved) {
    const s = shape as any;
    s.stroke = saved.stroke;
    s.linewidth = saved.linewidth;
    outlines.selectedStrokes.delete(shape.id);
  }
}


function removeAllSelectionHighlights(outlines: Outlines, selected: Shape[]): void {
  for (const shape of selected) {
    restoreSelectionStroke(shape, outlines);
  }
}

function addToSelection(state: PointerState, join: boolean): PointerState {
  const outlines = state.outlines;
  const highlighted = state.highlighted;

  if (!highlighted) {
    if (join) {
      return { ...state };
    } else {
      removeAllSelectionHighlights(outlines, state.selected);
      hideResizeHandles();
      return { ...state, selected: [] };
    }
  }

  // The click commits the hover into a selection action: end the hover state
  // and restore the original stroke so applySelectionStroke captures the true
  // baseline rather than the hover-highlight color.
  clearHighlight(state);

  let selected = [...state.selected];
  const isAlreadySelected = state.selected.find(
    (shape) => shape.id === highlighted?.id
  );
  let selectionChanged = false;

  if (join && isAlreadySelected) {
    // Remove from selection
    selected = selected.filter((item) => item.id !== highlighted.id);
    restoreSelectionStroke(highlighted, outlines);
    selectionChanged = true;
  } else if (join && !isAlreadySelected) {
    // Add to selection
    selected.push(highlighted);
    applySelectionStroke(highlighted, outlines);
    selectionChanged = true;
  } else if (!join && !isAlreadySelected) {
    // Replace selection
    removeAllSelectionHighlights(outlines, state.selected);
    selected = [highlighted];
    applySelectionStroke(highlighted, outlines);
    selectionChanged = true;
  }
  // !join && isAlreadySelected → selection unchanged, skip handle rebuild

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
  removeAllSelectionHighlights(state.outlines, state.selected);
  hideResizeHandles();
  return { ...state, selected: [] };
}

function selectShapesDirect(state: PointerState, shapes: Shape[]): PointerState {
  removeAllSelectionHighlights(state.outlines, state.selected);

  if (shapes.length === 0) {
    return { ...state, selected: [] };
  }

  for (const shape of shapes) {
    applySelectionStroke(shape, state.outlines);
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
  (rect as any).isHighlight = true;
  doodler.canvas.add(rect);
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
    if ((shape as any).isHighlight) continue;
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

  let desired = "";
  if (selected.length > 0) {
    const handle = hitTestResizeHandle(eventToSurfacePosition(e));
    if (handle) {
      desired = HANDLE_CURSOR_OPTION[handle] ?? "";
    } else {
      const clientPointer = eventToClientPosition(e);
      let overSelection = isPointInGroupOutline(clientPointer);
      if (!overSelection) {
        for (const shape of selected) {
          if (!(shape as any).getBoundingClientRect) continue;
          const box = (shape as any).getBoundingClientRect(false);
          if (isPointInRect(clientPointer.x, clientPointer.y, box.left, box.top, box.right, box.bottom)) {
            overSelection = true;
            break;
          }
        }
      }
      if (overSelection) desired = "grab";
    }
  }

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
    if (!isShapeWithin || (shape as any).isHighlight || isSelected) {
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
}

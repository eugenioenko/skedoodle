import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import { Path } from "two.js/src/path";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Vector } from "two.js/src/vector";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useCanvasStore } from "./canvas.store";
import {
  eventToClientPosition,
  eventToSurfacePosition,
  isPointInBoundingBox,
} from "./canvas.utils";
import { doTryHighlight } from "./shared.utils";

interface Outlines {
  highlight?: Rectangle;
  selected?: Rectangle;
  selection?: Rectangle;
  origin: Vector;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PointerSelection {
  shapes: Path[];
  border?: Rectangle;
}

export interface PointerState {
  origin: Vector;
  highlighted?: Path;
  selected: Path[];
  isMoving: boolean;
  outlines: Outlines;
  origins: Vector[];
  clearSelected: () => void;
  addHighlightToSelection: (join: boolean) => void;
  setHighlight: (shape: Path, border: Rect) => void;
  setOrigins: (origins: Vector[]) => void;
  clearHighlight: () => void;
  setIsMoving: (isMoving: boolean) => void;
}

export const usePointerStore = create<PointerState>()(
  devtools(
    (set) => ({
      selected: [],
      origin: new Vector(),
      origins: [],
      highlighted: undefined,
      isMoving: false,
      outlines: { origin: new Vector() },
      originTranslations: { shape: new Vector(), border: new Vector() },
      setIsMoving: (isMoving) => set((state) => ({ ...state, isMoving })),
      setOrigins: (origins) => set((state) => ({ ...state, origins })),
      setHighlight: (shape, border) =>
        set((state) => highlightShape(state, shape, border)),
      clearHighlight: () => set((state) => clearHighlight(state)),
      clearSelected: () => set((state) => clearSelected(state)),
      addHighlightToSelection: (join: boolean) =>
        set((state) => addToSelection(state, join)),
    }),
    { name: "pointerStore", enabled: true || envIsDevelopment }
  )
);

if (typeof window !== "undefined") {
  window.ps = usePointerStore;
}

function highlightShape(
  state: PointerState,
  shape: Path,
  border: Rect
): PointerState {
  const outlines = state.outlines;
  state.highlighted = shape;
  if (!outlines.highlight) {
    outlines.highlight = makeBorder(0, 0, 0, 0);
  }
  outlines.highlight.translation.x = border.x;
  outlines.highlight.translation.y = border.y;
  outlines.highlight.width = border.width;
  outlines.highlight.height = border.height;
  outlines.highlight.visible = true;

  return state;
}

function clearHighlight(state: PointerState): PointerState {
  const outlines = state.outlines;
  state.highlighted = undefined;
  if (outlines.highlight) {
    outlines.highlight.visible = false;
  }
  return state;
}

function addToSelection(state: PointerState, join: boolean): PointerState {
  const outlines = state.outlines;
  const highlighted = state.highlighted;

  if (!outlines.selected) {
    outlines.selected = makeBorder(0, 0, 0, 0);
  }

  if (!highlighted) {
    if (join) {
      return { ...state };
    } else {
      outlines.selected.visible = false;
      return { ...state, selected: [] };
    }
  }

  let selected = [...state.selected];
  const isAlreadySelected = state.selected.find(
    (shape) => shape.id === highlighted?.id
  );
  if (join && isAlreadySelected) {
    selected = selected.filter((item) => item.id !== highlighted.id);
  } else if (join && !isAlreadySelected) {
    selected.push(highlighted);
  } else if (!join && !isAlreadySelected) {
    selected = [highlighted];
  }

  setSelectionOutline(selected, outlines.selected);

  return { ...state, selected };
}

function setSelectionOutline(selected: Path[], outline: Rectangle): void {
  const { canvas, zui } = ctx();
  // calculate selection rectangle
  const boxes = selected.map((shape) => shape.getBoundingClientRect());
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.right));
  const bottom = Math.max(...boxes.map((box) => box.bottom));
  const width = right - left;
  const height = bottom - top;

  // set selection rectangle
  const pos = zui.clientToSurface({
    x: left + width / 2,
    y: top + height / 2,
  });
  outline.translation.x = pos.x;
  outline.translation.y = pos.y;
  outline.width = width / zui.scale;
  outline.height = height / zui.scale;
  outline.visible = true;
}

function clearSelected(state: PointerState): PointerState {
  if (state.outlines.selected) {
    state.outlines.selected.visible = false;
  }

  return { ...state, selected: [] };
}

function startMoveSelection(): void {
  const { setToolOption } = useCanvasStore.getState();
  const { setIsMoving, setOrigins, outlines } = usePointerStore.getState();
  const selected = usePointerStore.getState().selected;
  setIsMoving(true);
  setToolOption("moving");
  const origins = selected.map((shape) => shape.translation.clone());
  if (outlines.selected) {
    outlines.origin.set(
      outlines.selected.translation.x,
      outlines.selected.translation.y
    );
  }
  if (outlines.highlight) {
    outlines.highlight.visible = false;
  }
  setOrigins(origins);
}

export function doPointerStart(e: MouseEvent<HTMLDivElement>): void {
  const { origin, addHighlightToSelection, clearSelected, outlines } =
    usePointerStore.getState();
  // pointer to measure distance fro movement within the surface
  const surfacePointer = eventToSurfacePosition(e);
  // pointer to calculate if a client rect is within
  const clientPointer = eventToClientPosition(e);

  origin.set(surfacePointer.x, surfacePointer.y);

  let isClickWithinHighlight = false;
  if (outlines.highlight && outlines.highlight.visible) {
    const box = outlines.highlight.getBoundingClientRect();
    isClickWithinHighlight = isPointInBoundingBox(clientPointer, box);
  }

  if (isClickWithinHighlight) {
    addHighlightToSelection(e.shiftKey);
    const selected = usePointerStore.getState().selected;
    if (selected.length) {
      startMoveSelection();
      return;
    }
  }

  let isClickWithinSelected = false;
  if (outlines.selected && outlines.selected.visible) {
    const box = outlines.selected.getBoundingClientRect();
    isClickWithinSelected = isPointInBoundingBox(clientPointer, box);
  }

  if (isClickWithinSelected) {
    startMoveSelection();
    return;
  }

  if (!e.shiftKey) {
    clearSelected();
  }
}

export function doPointerMove(e: MouseEvent<HTMLDivElement>): void {
  const { isMoving } = usePointerStore.getState();
  if (isMoving) {
    doMoveShape(e);
  } else {
    doTryHighlight(e);
  }
}

export function doPointerEnd(e: MouseEvent<HTMLDivElement>) {
  const { setIsMoving } = usePointerStore.getState();
  const { setToolOption } = useCanvasStore.getState();

  setIsMoving(false);
  setToolOption("");
}

function makeBorder(
  x: number,
  y: number,
  width: number,
  height: number
): Rectangle {
  console.log("make border");
  const { two, zui, canvas } = ctx();
  const rect = two.makeRectangle(x, y, width, height);
  rect.stroke = "#0ea5cf";
  rect.noFill();
  rect.linewidth = 1.5 / zui.scale;
  rect.scale = 1.01;
  (rect as any).isHighlight = true;
  canvas.add(rect);
  return rect;
}

function doMoveShape(e: MouseEvent<HTMLDivElement>): void {
  const { outlines, origins, origin, selected } = usePointerStore.getState();
  const pointer = eventToSurfacePosition(e);
  if (selected.length !== origins.length) {
    return;
  }

  var dx = pointer.x - origin.x;
  var dy = pointer.y - origin.y;
  for (let i = 0; i < selected.length; ++i) {
    const shape = selected[i];
    const origin = origins[i];
    shape.translation.x = origin.x + dx;
    shape.translation.y = origin.y + dy;
  }
  if (outlines.selected) {
    outlines.selected.translation.x = outlines.origin.x + dx;
    outlines.selected.translation.y = outlines.origin.y + dy;
  }
}

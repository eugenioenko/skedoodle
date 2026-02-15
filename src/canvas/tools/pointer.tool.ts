import { MouseEvent } from "react";

import { Rectangle } from "two.js/src/shapes/rectangle";
import { Shape } from "two.js/src/shape";
import { Vector } from "two.js/src/vector";
import { create } from "zustand";
import { useCanvasStore, useOptionsStore } from "../canvas.store";
import {
  eventToClientPosition,
  eventToSurfacePosition,
  isPointInBoundingBox,
  isPointInRect,
} from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushUpdateCommand } from "../history.service";

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

export interface PointerState {
  origin: Vector;
  highlighted?: Shape;
  selected: Shape[];
  isMoving: boolean;
  outlines: Outlines;
  origins: Vector[];
  clearSelected: () => void;
  addHighlightToSelection: (join: boolean) => void;
  setHighlight: (shape: Shape, border: Rect) => void;
  setOrigins: (origins: Vector[]) => void;
  clearHighlight: () => void;
  setIsMoving: (isMoving: boolean) => void;
}

export const usePointerStore = create<PointerState>()((set) => ({
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
}));

function highlightShape(
  state: PointerState,
  shape: Shape,
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
    outlines.highlight.remove();
    outlines.highlight = undefined;
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
      outlines.selected.remove();
      outlines.selected = undefined;
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

function setSelectionOutline(selected: Shape[], outline: Rectangle): void {
  const doodler = getDoodler();
  // calculate selection rectangle
  const boxes = selected.map((shape) => (shape as any).getBoundingClientRect());
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.right));
  const bottom = Math.max(...boxes.map((box) => box.bottom));
  const width = right - left;
  const height = bottom - top;

  // set selection rectangle
  const pos = doodler.zui.clientToSurface({
    x: left + width / 2,
    y: top + height / 2,
  });
  outline.translation.x = pos.x;
  outline.translation.y = pos.y;
  outline.width = width / doodler.zui.scale;
  outline.height = height / doodler.zui.scale;
  outline.visible = true;
}

function clearSelected(state: PointerState): PointerState {
  if (state.outlines.selected) {
    state.outlines.selected.remove();
    state.outlines.selected = undefined;
  }

  return { ...state, selected: [] };
}

function startMoveSelection(): void {
  const { setToolOption } = useOptionsStore.getState();
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
    outlines.highlight.remove();
    outlines.highlight = undefined;
  }
  setOrigins(origins);
}

export function doPointerStart(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
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
      doodler.throttledTwoUpdate();
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
    doodler.throttledTwoUpdate();
    return;
  }

  if (!e.shiftKey) {
    clearSelected();
  }

  doodler.throttledTwoUpdate();
}

export function doPointerMove(e: MouseEvent<HTMLDivElement>): void {
  const { isMoving } = usePointerStore.getState();
  if (isMoving) {
    doMoveShape(e);
  } else {
    doTryHighlight(e);
  }
}

export function doPointerEnd(_: MouseEvent<HTMLDivElement>) {
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

function makeBorder(
  x: number,
  y: number,
  width: number,
  height: number
): Rectangle {
  const doodler = getDoodler();
  const rect = doodler.two.makeRectangle(x, y, width, height);
  rect.stroke = "#0ea5cf";
  rect.noFill();
  rect.linewidth = 1.5 / doodler.zui.scale;
  rect.scale = 1.01;
  (rect as any).isHighlight = true;
  doodler.canvas.add(rect);
  return rect;
}

function doMoveShape(e: MouseEvent<HTMLDivElement>): void {
  const doodler = getDoodler();
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

    if (!isShapeWithin || (shape as any).isHighlight) {
      continue;
    }

    if (highlighted === shape) {
      return;
    }

    const pos = doodler.zui.clientToSurface({
      x: item.left + item.width / 2,
      y: item.top + item.height / 2,
    });

    const border = {
      x: pos.x,
      y: pos.y,
      width: item.width / doodler.zui.scale,
      height: item.height / doodler.zui.scale,
    };
    setHighlight(shape, border);
    doodler.throttledTwoUpdate();
    return;
  }
  clearHighlight();
  doodler.throttledTwoUpdate();
}

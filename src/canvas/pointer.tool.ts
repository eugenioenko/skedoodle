import { MouseEvent } from "react";
import { ctx } from "./canvas.service";

import { envIsDevelopment } from "@/environment";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Path } from "two.js/src/path";
import {
  eventToGlobalPosition,
  isPointInRect,
  mouseEventToPosition,
} from "./canvas.utils";
import { Vector } from "two.js/src/vector";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { useCanvasStore } from "./canvas.store";

interface PointerSelection {
  shape: Path;
  border: Rectangle;
}

export interface PointerState {
  origin: Vector;
  highlight?: PointerSelection;
  selected: PointerSelection[];
  isMoving: boolean;
  originTranslations: { shape: Vector; border: Vector };
  setSelected: (selected: PointerSelection[]) => void;
  addSelected: (selected: PointerSelection[]) => void;
  setHighlight: (highlight?: PointerSelection) => void;
  setIsMoving: (isMoving: boolean) => void;
}

export const usePointerStore = create<PointerState>()(
  devtools(
    (set) => ({
      selected: [],
      origin: new Vector(),
      highlight: undefined,
      isMoving: false,
      originTranslations: { shape: new Vector(), border: new Vector() },
      setSelected: (selected) => set((state) => ({ ...state, selected })),
      setIsMoving: (isMoving) => set((state) => ({ ...state, isMoving })),
      setHighlight: (highlight) =>
        set((state) => {
          const { canvas } = ctx();
          if (state.highlight) {
            canvas.remove(state.highlight.border);
          }
          if (highlight?.border) {
            canvas.add(highlight.border);
          }
          return { ...state, highlight };
        }),
      addSelected: (selected) =>
        set((state) => {
          return { ...state, selected: [...state.selected, ...selected] };
        }),
    }),
    { name: "pointerStore", enabled: false || envIsDevelopment }
  )
);

export function doPointerStart(e: MouseEvent<HTMLDivElement>): void {
  const { canvas } = ctx();
  const { setToolOption } = useCanvasStore.getState();
  const {
    origin,
    selected,
    setSelected,
    setIsMoving,
    highlight,
    originTranslations,
  } = usePointerStore.getState();
  const pointer = eventToGlobalPosition(e);
  origin.set(pointer.x, pointer.y);

  // start move mode when clicking highlighted shape
  if (highlight) {
    originTranslations.border.copy(highlight.border.translation);
    originTranslations.shape.copy(highlight.shape.translation);
    setIsMoving(true);
    setToolOption("moving");
    return;
  }

  // clear previously selected if not a join selection
  if (!e.shiftKey) {
    for (const item of selected) {
      canvas.remove(item.border);
    }
    setSelected([]);
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
  const { zui, canvas } = ctx();
  const { selected, addSelected, setIsMoving } = usePointerStore.getState();
  const { setToolOption } = useCanvasStore.getState();

  const pointer = mouseEventToPosition(e);
  const shapes: Path[] = canvas.children.filter(
    (shape) => (shape as Path).getBoundingClientRect
  ) as Path[];

  const selection: PointerSelection[] = [];
  for (const shape of shapes) {
    const item = shape.getBoundingClientRect(false);
    const isShapeWithin = isPointInRect(
      pointer.x,
      pointer.y,
      item.left,
      item.top,
      item.right,
      item.bottom
    );
    const isShapeAlreadySelected = selected.find(
      (sh) => sh.shape.id === shape.id
    );

    if (
      (isShapeWithin && !isShapeAlreadySelected) ||
      (shape as any).isHighlight
    ) {
      const pos = zui.clientToSurface({
        x: item.left + item.width / 2,
        y: item.top + item.height / 2,
      });
      const border = makeBorder(
        pos.x,
        pos.y,
        item.width / zui.scale,
        item.height / zui.scale
      );
      canvas.add(border);
      selection.push({
        shape,
        border,
      });
      break;
    }
  }
  if (selection.length) {
    addSelected(selection);
  }
  setIsMoving(false);
  setToolOption("");
}

function makeBorder(
  x: number,
  y: number,
  width: number,
  height: number
): Rectangle {
  const { two, zui } = ctx();
  const rect = two.makeRectangle(x, y, width, height);
  rect.stroke = "#0ea5cf";
  rect.noFill();
  rect.linewidth = 1.5 / zui.scale;
  rect.scale = 1.01;
  (rect as any).isHighlight = true;
  return rect;
}

function doMoveShape(e: MouseEvent<HTMLDivElement>): void {
  const { zui, canvas } = ctx();
  const { highlight, originTranslations, origin } = usePointerStore.getState();
  if (!highlight) {
    return;
  }

  const pointer = eventToGlobalPosition(e);
  var dx = pointer.x - origin.x;
  var dy = pointer.y - origin.y;
  highlight.shape.translation.x = originTranslations.shape.x + dx;
  highlight.shape.translation.y = originTranslations.shape.y + dy;
  highlight.border.translation.x = originTranslations.border.x + dx;
  highlight.border.translation.y = originTranslations.border.y + dy;
}

function doTryHighlight(e: MouseEvent<HTMLDivElement>): void {
  const { zui, canvas } = ctx();
  const { highlight, setHighlight } = usePointerStore.getState();

  const pointer = mouseEventToPosition(e);
  const shapes: Path[] = canvas.children.filter(
    (shape) => (shape as Path).getBoundingClientRect && (shape as Path).visible
  ) as Path[];

  for (const shape of shapes) {
    const item = shape.getBoundingClientRect(false);
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

    if (highlight?.shape === shape) {
      return;
    }

    const pos = zui.clientToSurface({
      x: item.left + item.width / 2,
      y: item.top + item.height / 2,
    });

    const border = makeBorder(
      pos.x,
      pos.y,
      item.width / zui.scale,
      item.height / zui.scale
    );
    setHighlight({
      shape,
      border,
    });
    return;
  }
  setHighlight(undefined);
}

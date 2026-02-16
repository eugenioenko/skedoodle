
import { MouseEvent } from "react";
import { useCanvasStore } from "../canvas.store";
import {
  eventToSurfacePosition,
} from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { syncService } from "@/sync/sync.client";



export function doCursorUpdate(e: MouseEvent<HTMLDivElement>) {
  if (!useCanvasStore.getState().doodler?.two) {
    // prevents random getDoodler() instance error while in dev mode
    return;
  }

  const doodler = getDoodler();
  const cursor = eventToSurfacePosition(e, doodler?.zui);
  const { setCursor } = useCanvasStore.getState();
  setCursor(cursor);
  syncService.sendCursor(cursor.x, cursor.y);
};
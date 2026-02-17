import { MouseEvent } from "react";
import { create } from "zustand";
import { Shape } from "two.js/src/shape";
import { Path } from "two.js/src/path";
import { Circle } from "two.js/src/shapes/circle";
import Two from "two.js";
import { getDoodler } from "../doodler.client";
import { useCanvasStore, useOptionsStore } from "../canvas.store";
import {
  ColorHighlight,
  eventToClientPosition,
  eventToSurfacePosition,
  isPointInRect,
} from "../canvas.utils";
import { pushUpdateCommand } from "../history.service";
import { Doodle } from "../doodle.utils";
import { updateArrowHead } from "./line.tool";

const VERTEX_DOT_RADIUS = 5;
const CONTROL_DOT_RADIUS = 4;
const HIT_RADIUS = 10;

type DragTarget = {
  type: "vertex" | "control-left" | "control-right";
  vertexIndex: number;
} | null;

interface VertexSnapshot {
  x: number;
  y: number;
  lx: number;
  ly: number;
  rx: number;
  ry: number;
}

interface HandleEntry {
  dot: Circle;
  leftDot?: Circle;
  rightDot?: Circle;
  leftLine?: Path;
  rightLine?: Path;
}

interface NodeState {
  editingShape?: Shape;
  handleMap: Map<number, HandleEntry>;
  dragTarget: DragTarget;
  isDragging: boolean;
  vertexSnapshot: VertexSnapshot[];
}

export const useNodeStore = create<NodeState>()(() => ({
  editingShape: undefined,
  handleMap: new Map(),
  dragTarget: null,
  isDragging: false,
  vertexSnapshot: [],
}));

// --- Tool switch cleanup ---

let toolSwitchCleanupInitialized = false;

function initToolSwitchCleanup(): void {
  if (toolSwitchCleanupInitialized) return;
  toolSwitchCleanupInitialized = true;
  useOptionsStore.subscribe((state, prevState) => {
    if (prevState.selectedTool === "node" && state.selectedTool !== "node") {
      clearHandles();
      getDoodler().throttledTwoUpdate();
    }
  });
}

// --- Snapshot ---

function snapshotVertices(shape: Shape): VertexSnapshot[] {
  const path = shape as Path;
  if (!path.vertices) return [];
  return path.vertices.map((v: any) => ({
    x: v.x,
    y: v.y,
    lx: v.controls?.left?.x ?? 0,
    ly: v.controls?.left?.y ?? 0,
    rx: v.controls?.right?.x ?? 0,
    ry: v.controls?.right?.y ?? 0,
  }));
}

// --- Visual handle creation ---

function createDot(x: number, y: number, radius: number, fill: string, stroke: string, scale: number): Circle {
  const dot = new Circle(x, y, radius / scale);
  dot.fill = fill;
  dot.stroke = stroke;
  dot.linewidth = 1.5 / scale;
  (dot as any).isHighlight = true;
  return dot;
}

function createControlLine(ax: number, ay: number, hx: number, hy: number, scale: number): Path {
  const line = new Path(
    [new Two.Anchor(ax, ay), new Two.Anchor(hx, hy)],
    false,
    false
  );
  line.noFill().stroke = ColorHighlight;
  line.linewidth = 1 / scale;
  (line as any).isHighlight = true;
  return line;
}

function showHandles(shape: Shape): void {
  clearHandles();

  const doodler = getDoodler();
  const path = shape as Path;
  if (!path.vertices || path.vertices.length === 0) return;

  const scale = doodler.zui.scale;
  const tx = shape.translation.x;
  const ty = shape.translation.y;
  const handleMap = new Map<number, HandleEntry>();

  for (let i = 0; i < path.vertices.length; i++) {
    const v = path.vertices[i] as any;
    const wx = v.x + tx;
    const wy = v.y + ty;

    const dot = createDot(wx, wy, VERTEX_DOT_RADIUS, "#ffffff", ColorHighlight, scale);
    doodler.canvas.add(dot);

    const entry: HandleEntry = { dot };

    const hasLeft = v.controls?.left && (v.controls.left.x !== 0 || v.controls.left.y !== 0);
    const hasRight = v.controls?.right && (v.controls.right.x !== 0 || v.controls.right.y !== 0);

    if (hasLeft) {
      const lx = wx + v.controls.left.x;
      const ly = wy + v.controls.left.y;
      entry.leftLine = createControlLine(wx, wy, lx, ly, scale);
      doodler.canvas.add(entry.leftLine);
      entry.leftDot = createDot(lx, ly, CONTROL_DOT_RADIUS, ColorHighlight, ColorHighlight, scale);
      doodler.canvas.add(entry.leftDot);
    }

    if (hasRight) {
      const rx = wx + v.controls.right.x;
      const ry = wy + v.controls.right.y;
      entry.rightLine = createControlLine(wx, wy, rx, ry, scale);
      doodler.canvas.add(entry.rightLine);
      entry.rightDot = createDot(rx, ry, CONTROL_DOT_RADIUS, ColorHighlight, ColorHighlight, scale);
      doodler.canvas.add(entry.rightDot);
    }

    handleMap.set(i, entry);
  }

  useNodeStore.setState({
    editingShape: shape,
    handleMap,
  });
}

export function clearHandles(): void {
  const doodler = getDoodler();
  const { handleMap } = useNodeStore.getState();

  for (const entry of handleMap.values()) {
    doodler.canvas.remove(entry.dot);
    if (entry.leftDot) doodler.canvas.remove(entry.leftDot);
    if (entry.rightDot) doodler.canvas.remove(entry.rightDot);
    if (entry.leftLine) doodler.canvas.remove(entry.leftLine);
    if (entry.rightLine) doodler.canvas.remove(entry.rightLine);
  }

  useNodeStore.setState({
    editingShape: undefined,
    handleMap: new Map(),
    dragTarget: null,
    isDragging: false,
    vertexSnapshot: [],
  });
}

function updateHandlePositions(): void {
  const { editingShape, handleMap, dragTarget } = useNodeStore.getState();
  if (!editingShape || !dragTarget) return;

  const path = editingShape as Path;
  const tx = editingShape.translation.x;
  const ty = editingShape.translation.y;
  const i = dragTarget.vertexIndex;
  const v = path.vertices[i] as any;
  const wx = v.x + tx;
  const wy = v.y + ty;

  const entry = handleMap.get(i);
  if (!entry) return;

  // Update vertex dot
  entry.dot.translation.x = wx;
  entry.dot.translation.y = wy;

  // Update left control visuals
  if (entry.leftDot && v.controls?.left) {
    const lx = wx + v.controls.left.x;
    const ly = wy + v.controls.left.y;
    entry.leftDot.translation.x = lx;
    entry.leftDot.translation.y = ly;
    if (entry.leftLine) {
      entry.leftLine.vertices[0].x = wx;
      entry.leftLine.vertices[0].y = wy;
      entry.leftLine.vertices[1].x = lx;
      entry.leftLine.vertices[1].y = ly;
    }
  }

  // Update right control visuals
  if (entry.rightDot && v.controls?.right) {
    const rx = wx + v.controls.right.x;
    const ry = wy + v.controls.right.y;
    entry.rightDot.translation.x = rx;
    entry.rightDot.translation.y = ry;
    if (entry.rightLine) {
      entry.rightLine.vertices[0].x = wx;
      entry.rightLine.vertices[0].y = wy;
      entry.rightLine.vertices[1].x = rx;
      entry.rightLine.vertices[1].y = ry;
    }
  }
}

// --- Hit testing ---

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}

type HitResult =
  | { type: "vertex"; vertexIndex: number }
  | { type: "control-left"; vertexIndex: number }
  | { type: "control-right"; vertexIndex: number }
  | { type: "shape"; doodle: Doodle }
  | { type: "none" };

function findHitTarget(
  surfacePos: { x: number; y: number },
  clientPos: { x: number; y: number }
): HitResult {
  const doodler = getDoodler();
  const { editingShape } = useNodeStore.getState();
  const hitRadiusSurface = HIT_RADIUS / doodler.zui.scale;
  const hitRadiusSq = hitRadiusSurface * hitRadiusSurface;

  // Priority 1: check handles on the currently editing shape
  if (editingShape) {
    const path = editingShape as Path;
    const tx = editingShape.translation.x;
    const ty = editingShape.translation.y;

    // Check control handles first (smaller targets, higher priority)
    for (let i = 0; i < path.vertices.length; i++) {
      const v = path.vertices[i] as any;
      const wx = v.x + tx;
      const wy = v.y + ty;

      if (v.controls?.left && (v.controls.left.x !== 0 || v.controls.left.y !== 0)) {
        const lx = wx + v.controls.left.x;
        const ly = wy + v.controls.left.y;
        if (distanceSq(surfacePos.x, surfacePos.y, lx, ly) <= hitRadiusSq) {
          return { type: "control-left", vertexIndex: i };
        }
      }
      if (v.controls?.right && (v.controls.right.x !== 0 || v.controls.right.y !== 0)) {
        const rx = wx + v.controls.right.x;
        const ry = wy + v.controls.right.y;
        if (distanceSq(surfacePos.x, surfacePos.y, rx, ry) <= hitRadiusSq) {
          return { type: "control-right", vertexIndex: i };
        }
      }
    }

    // Then check vertex dots
    for (let i = 0; i < path.vertices.length; i++) {
      const v = path.vertices[i] as any;
      const wx = v.x + tx;
      const wy = v.y + ty;
      if (distanceSq(surfacePos.x, surfacePos.y, wx, wy) <= hitRadiusSq) {
        return { type: "vertex", vertexIndex: i };
      }
    }
  }

  // Priority 2: check if clicking a different shape
  const { doodles } = useCanvasStore.getState();
  for (const doodle of doodles) {
    const shape = doodle.shape;
    if ((shape as any).isHighlight) continue;
    if (!(shape as any).getBoundingClientRect) continue;
    // Skip non-editable types
    if (doodle.type === "text" || doodle.type === "rect" || doodle.type === "ellipse" || doodle.type === "circle") continue;

    const item = (shape as any).getBoundingClientRect(false);
    if (isPointInRect(clientPos.x, clientPos.y, item.left, item.top, item.right, item.bottom)) {
      return { type: "shape", doodle };
    }
  }

  return { type: "none" };
}

// --- Associated arrow updates ---

function updateAssociatedArrows(editingShape: Shape): void {
  const { doodles } = useCanvasStore.getState();

  const doodleIndex = doodles.findIndex(d => d.shape === editingShape);
  if (doodleIndex === -1) return;

  const doodle = doodles[doodleIndex];
  if (doodle.type !== "arrow") return;

  const path = editingShape as Path;
  if (!path.vertices || path.vertices.length !== 2) return;

  // Line endpoints in surface space
  const tx = editingShape.translation.x;
  const ty = editingShape.translation.y;
  const start = { x: path.vertices[0].x + tx, y: path.vertices[0].y + ty };
  const end = { x: path.vertices[1].x + tx, y: path.vertices[1].y + ty };
  const strokeWidth = (editingShape as any).linewidth || 3;

  // Arrowheads are the 1-2 doodles right after the line in the array
  let headFound = false;
  for (const offset of [1, 2]) {
    const idx = doodleIndex + offset;
    if (idx >= doodles.length) break;

    const adjacent = doodles[idx];
    if (adjacent.type !== "arrow") break;

    const adjPath = adjacent.shape as Path;
    if (!adjPath.vertices || adjPath.vertices.length !== 3) break;

    const atx = adjacent.shape.translation.x;
    const aty = adjacent.shape.translation.y;

    if (!headFound) {
      headFound = true;
      updateArrowHead(adjPath,
        { x: start.x - atx, y: start.y - aty },
        { x: end.x - atx, y: end.y - aty },
        strokeWidth
      );
    } else {
      updateArrowHead(adjPath,
        { x: end.x - atx, y: end.y - aty },
        { x: start.x - atx, y: start.y - aty },
        strokeWidth
      );
    }
  }
}

// --- Event handlers ---

export function doNodeStart(e: MouseEvent<HTMLDivElement>): void {
  initToolSwitchCleanup();

  const doodler = getDoodler();
  const surfacePos = doodler.zui.clientToSurface(eventToClientPosition(e));
  const clientPos = eventToClientPosition(e);
  const hit = findHitTarget(surfacePos, clientPos);

  if (hit.type === "vertex" || hit.type === "control-left" || hit.type === "control-right") {
    const { editingShape } = useNodeStore.getState();
    if (!editingShape) return;
    const snapshot = snapshotVertices(editingShape);
    useNodeStore.setState({
      isDragging: true,
      dragTarget: { type: hit.type, vertexIndex: hit.vertexIndex },
      vertexSnapshot: snapshot,
    });
    return;
  }

  if (hit.type === "shape") {
    const path = hit.doodle.shape as Path;
    if (!path.vertices || path.vertices.length === 0) return;
    showHandles(hit.doodle.shape);
    doodler.throttledTwoUpdate();
    return;
  }

  // Empty space
  clearHandles();
  doodler.throttledTwoUpdate();
}

export function doNodeMove(e: MouseEvent<HTMLDivElement>): void {
  const { isDragging, dragTarget, editingShape } = useNodeStore.getState();
  if (!isDragging || !dragTarget || !editingShape) return;

  const doodler = getDoodler();
  const surfacePos = eventToSurfacePosition(e);
  const path = editingShape as Path;
  const tx = editingShape.translation.x;
  const ty = editingShape.translation.y;

  const vertex = path.vertices[dragTarget.vertexIndex] as any;

  if (dragTarget.type === "vertex") {
    vertex.x = surfacePos.x - tx;
    vertex.y = surfacePos.y - ty;
  } else if (dragTarget.type === "control-left") {
    vertex.controls.left.x = surfacePos.x - tx - vertex.x;
    vertex.controls.left.y = surfacePos.y - ty - vertex.y;
  } else if (dragTarget.type === "control-right") {
    vertex.controls.right.x = surfacePos.x - tx - vertex.x;
    vertex.controls.right.y = surfacePos.y - ty - vertex.y;
  }

  updateHandlePositions();
  updateAssociatedArrows(editingShape);
  doodler.throttledTwoUpdate();
}

export function doNodeUp(): void {
  const { isDragging, editingShape, vertexSnapshot } = useNodeStore.getState();
  if (!isDragging || !editingShape) {
    useNodeStore.setState({ isDragging: false, dragTarget: null });
    return;
  }

  const newSnapshot = snapshotVertices(editingShape);
  pushUpdateCommand(
    editingShape.id,
    { _vertexData: newSnapshot },
    { _vertexData: vertexSnapshot }
  );

  useNodeStore.setState({
    isDragging: false,
    dragTarget: null,
    vertexSnapshot: [],
  });
}

// --- Zoom scaling ---

export function updateNodeHandleScales(): void {
  const { editingShape } = useNodeStore.getState();
  if (!editingShape) return;
  showHandles(editingShape);
}

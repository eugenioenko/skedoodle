import { useCanvasStore } from "./canvas.store";
import { Doodle, serializeDoodle, unserializeDoodle } from "./doodle.utils";
import { getDoodler } from "./doodler.client";
import { HistoryCommand, useHistoryStore } from "./history.store";
import { usePointerStore } from "./tools/pointer.tool";
import { Shape } from "two.js/src/shape";

function findDoodleById(id: string): Doodle | undefined {
  const { doodles } = useCanvasStore.getState();
  return doodles.find((d) => d.shape.id === id);
}

function clearSelection(): void {
  const { clearSelected, clearHighlight } = usePointerStore.getState();
  clearSelected();
  clearHighlight();
}

function setShapeField(shape: Shape, field: string, value: any): void {
  const props = field.split(".");
  if (props.length === 2) {
    (shape as any)[props[0]][props[1]] = value;
  } else {
    (shape as any)[field] = value;
  }
}

function addDoodleToCanvas(doodle: Doodle): void {
  const doodler = getDoodler();
  const { doodles, setDoodles } = useCanvasStore.getState();
  setDoodles([...doodles, doodle]);
  doodler.canvas.add(doodle.shape);
}

function removeDoodleFromCanvas(id: string): void {
  const doodler = getDoodler();
  const doodle = findDoodleById(id);
  if (!doodle) return;
  const { doodles, setDoodles } = useCanvasStore.getState();
  setDoodles(doodles.filter((d) => d.shape.id !== id));
  doodler.canvas.remove(doodle.shape);
}

function executeForward(cmd: HistoryCommand): void {
  switch (cmd.type) {
    case "create": {
      const doodle = unserializeDoodle(cmd.doodle);
      addDoodleToCanvas(doodle);
      break;
    }
    case "remove": {
      removeDoodleFromCanvas(cmd.doodle.id);
      break;
    }
    case "update": {
      const doodle = findDoodleById(cmd.shapeId);
      if (!doodle) return;
      for (const change of cmd.changes) {
        setShapeField(doodle.shape, change.field, change.newValue);
      }
      break;
    }
  }
}

function executeInverse(cmd: HistoryCommand): void {
  switch (cmd.type) {
    case "create": {
      removeDoodleFromCanvas(cmd.doodle.id);
      break;
    }
    case "remove": {
      const doodle = unserializeDoodle(cmd.doodle);
      addDoodleToCanvas(doodle);
      break;
    }
    case "update": {
      const doodle = findDoodleById(cmd.shapeId);
      if (!doodle) return;
      for (const change of cmd.changes) {
        setShapeField(doodle.shape, change.field, change.oldValue);
      }
      break;
    }
  }
}

export function pushCommand(cmd: HistoryCommand): void {
  useHistoryStore.getState().push(cmd);
}

export function undo(): void {
  const { undoStack } = useHistoryStore.getState();
  if (undoStack.length === 0) return;

  const cmd = undoStack[undoStack.length - 1];
  useHistoryStore.setState((state) => ({
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, cmd],
  }));

  clearSelection();
  executeInverse(cmd);
  getDoodler().throttledTwoUpdate();
}

export function redo(): void {
  const { redoStack } = useHistoryStore.getState();
  if (redoStack.length === 0) return;

  const cmd = redoStack[redoStack.length - 1];
  useHistoryStore.setState((state) => ({
    redoStack: state.redoStack.slice(0, -1),
    undoStack: [...state.undoStack, cmd],
  }));

  clearSelection();
  executeForward(cmd);
  getDoodler().throttledTwoUpdate();
}

export function pushCreateCommand(label: string, doodle: Doodle): void {
  pushCommand({ type: "create", label, doodle: serializeDoodle(doodle) });
}

export function pushRemoveCommand(label: string, doodle: Doodle): void {
  pushCommand({ type: "remove", label, doodle: serializeDoodle(doodle) });
}

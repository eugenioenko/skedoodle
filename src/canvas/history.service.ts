import { useCanvasStore } from "./canvas.store";
import {
  Doodle,
  serializeDoodle,
  unserializeDoodle,
} from "./doodle.utils";
import { getDoodler } from "./doodler.client";
import { Command, createCommand, useCommandLogStore } from "./history.store";
import { usePointerStore } from "./tools/pointer.tool";
import { Shape } from "two.js/src/shape";

// Stores old values for update commands, keyed by command ID
const preUpdateSnapshots = new Map<string, Record<string, any>>();

function findDoodleById(id: string): Doodle | undefined {
  const { doodles } = useCanvasStore.getState();
  return doodles.find((d) => d.shape.id === id);
}

function clearSelection(): void {
  const { clearSelected, clearHighlight } = usePointerStore.getState();
  clearSelected();
  clearHighlight();
}

function getShapeField(shape: Shape, field: string): any {
  const props = field.split(".");
  if (props.length === 2) {
    return (shape as any)[props[0]][props[1]];
  }
  return (shape as any)[field];
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

export function executeForward(cmd: Command): void {
  switch (cmd.type) {
    case "create": {
      if (!cmd.data) return;
      const doodle = unserializeDoodle(cmd.data);
      addDoodleToCanvas(doodle);
      break;
    }
    case "remove": {
      removeDoodleFromCanvas(cmd.shapeId);
      break;
    }
    case "update": {
      const doodle = findDoodleById(cmd.shapeId);
      if (!doodle || !cmd.changes) return;
      for (const [field, value] of Object.entries(cmd.changes)) {
        setShapeField(doodle.shape, field, value);
      }
      break;
    }
  }
}

// --- Debounced auto-save ---
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      getDoodler().saveDoodles();
    } catch {
      // doodler may not be ready yet
    }
  }, 1000);
}

// --- Public API ---

export function pushCommand(cmd: Command): void {
  useCommandLogStore.setState((state) => ({
    commandLog: [...state.commandLog, cmd],
    sessionUndoStack: [...state.sessionUndoStack, cmd.id],
    sessionRedoStack: [],
  }));
  scheduleSave();
}

export function undo(): void {
  const { sessionUndoStack, commandLog } = useCommandLogStore.getState();
  if (sessionUndoStack.length === 0) return;

  const lastId = sessionUndoStack[sessionUndoStack.length - 1];
  const originalCmd = commandLog.find((c) => c.id === lastId);
  if (!originalCmd) return;

  // Create inverse command
  const inverseCmd = createInverseCommand(originalCmd);
  if (!inverseCmd) return;

  // Append inverse to log + update session stacks atomically
  useCommandLogStore.setState((state) => ({
    commandLog: [...state.commandLog, inverseCmd],
    sessionUndoStack: state.sessionUndoStack.slice(0, -1),
    sessionRedoStack: [...state.sessionRedoStack, originalCmd],
  }));

  clearSelection();
  executeForward(inverseCmd);
  getDoodler().throttledTwoUpdate();
  scheduleSave();
}

export function redo(): void {
  const { sessionRedoStack } = useCommandLogStore.getState();
  if (sessionRedoStack.length === 0) return;

  const originalCmd = sessionRedoStack[sessionRedoStack.length - 1];

  // Re-create command with new id/ts
  const newCmd = createCommand(originalCmd.type, originalCmd.shapeId, {
    data: originalCmd.data,
    changes: originalCmd.changes,
  });

  // If original had preUpdateSnapshots, copy them for the new command
  const oldValues = preUpdateSnapshots.get(originalCmd.id);
  if (oldValues) {
    preUpdateSnapshots.set(newCmd.id, oldValues);
  }

  // Append to log + update session stacks atomically
  useCommandLogStore.setState((state) => ({
    commandLog: [...state.commandLog, newCmd],
    sessionRedoStack: state.sessionRedoStack.slice(0, -1),
    sessionUndoStack: [...state.sessionUndoStack, newCmd.id],
  }));

  clearSelection();
  executeForward(newCmd);
  getDoodler().throttledTwoUpdate();
  scheduleSave();
}

function createInverseCommand(cmd: Command): Command | null {
  switch (cmd.type) {
    case "create": {
      // create → remove: capture live doodle data before removing
      const doodle = findDoodleById(cmd.shapeId);
      const data = doodle ? serializeDoodle(doodle) : cmd.data;
      return createCommand("remove", cmd.shapeId, { data });
    }
    case "remove": {
      // remove → create: use stored data to recreate
      return createCommand("create", cmd.shapeId, { data: cmd.data });
    }
    case "update": {
      // update → update with previous values
      const doodle = findDoodleById(cmd.shapeId);
      if (!doodle || !cmd.changes) return null;

      // Capture current values before the forward command changed them
      // We use preUpdateSnapshots if available (set at push time),
      // otherwise read current shape values
      const oldValues = preUpdateSnapshots.get(cmd.id);
      if (oldValues) {
        // Store old values as the inverse changes, and current new values as snapshots
        const currentValues: Record<string, any> = {};
        for (const field of Object.keys(oldValues)) {
          currentValues[field] = getShapeField(doodle.shape, field);
        }
        const inverseCmd = createCommand("update", cmd.shapeId, {
          changes: currentValues,
        });
        preUpdateSnapshots.set(inverseCmd.id, cmd.changes);
        return inverseCmd;
      }

      // Fallback: read current values from shape
      const currentValues: Record<string, any> = {};
      for (const field of Object.keys(cmd.changes)) {
        currentValues[field] = getShapeField(doodle.shape, field);
      }
      const inverseCmd = createCommand("update", cmd.shapeId, {
        changes: currentValues,
      });
      preUpdateSnapshots.set(inverseCmd.id, cmd.changes);
      return inverseCmd;
    }
  }
}

export function pushCreateCommand(doodle: Doodle): void {
  const serialized = serializeDoodle(doodle);
  const cmd = createCommand("create", serialized.id, { data: serialized });
  pushCommand(cmd);
}

export function pushRemoveCommand(doodle: Doodle): void {
  const serialized = serializeDoodle(doodle);
  const cmd = createCommand("remove", serialized.id, { data: serialized });
  pushCommand(cmd);
}

export function pushUpdateCommand(
  shapeId: string,
  newValues: Record<string, any>,
  oldValues: Record<string, any>
): void {
  const cmd = createCommand("update", shapeId, { changes: newValues });
  preUpdateSnapshots.set(cmd.id, oldValues);
  pushCommand(cmd);
}

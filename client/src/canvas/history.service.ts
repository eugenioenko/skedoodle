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
import {
  storageClient,
  SketchMeta,
} from "@/services/storage.client";
import { syncService } from "@/services/sync.client";
import { ulid } from "ulid";
import { useAuthStore } from "@/stores/auth.store";

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
      removeDoodleFromCanvas(cmd.sid);
      break;
    }
    case "update": {
      const doodle = findDoodleById(cmd.sid);
      if (!doodle || !cmd.data) return;
      for (const [field, value] of Object.entries(cmd.data)) {
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

export function applyRemoteCommand(cmd: Command): void {
  const { commandLog, appendCommand } = useCommandLogStore.getState();

  // Avoid re-applying commands we already have
  if (commandLog.some(c => c.id === cmd.id)) {
    return;
  }

  appendCommand(cmd);
  executeForward(cmd);
  getDoodler().throttledTwoUpdate();
  scheduleSave();
}

export function pushCommand(cmd: Command): void {
  useCommandLogStore.setState((state) => ({
    commandLog: [...state.commandLog, cmd],
    sessionUndoStack: [...state.sessionUndoStack, cmd.id],
    sessionRedoStack: [],
  }));
  syncService.sendCommand(cmd);
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
  const newCmd = createCommand(originalCmd.type, originalCmd.sid, {
    data: originalCmd.data,
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
      const doodle = findDoodleById(cmd.sid);
      const data = doodle ? serializeDoodle(doodle) : cmd.data;
      return createCommand("remove", cmd.sid, { data });
    }
    case "remove": {
      // remove → create: use stored data to recreate
      return createCommand("create", cmd.sid, { data: cmd.data });
    }
    case "update": {
      // update → update with previous values
      const doodle = findDoodleById(cmd.sid);
      if (!doodle || !cmd.data) return null;

      const oldValues = preUpdateSnapshots.get(cmd.id);
      if (oldValues) {
        const currentValues: Record<string, any> = {};
        for (const field of Object.keys(oldValues)) {
          currentValues[field] = getShapeField(doodle.shape, field);
        }
        const inverseCmd = createCommand("update", cmd.sid, {
          data: currentValues,
        });
        preUpdateSnapshots.set(inverseCmd.id, cmd.data);
        return inverseCmd;
      }

      // Fallback: read current values from shape
      const currentValues: Record<string, any> = {};
      for (const field of Object.keys(cmd.data)) {
        currentValues[field] = getShapeField(doodle.shape, field);
      }
      const inverseCmd = createCommand("update", cmd.sid, {
        data: currentValues,
      });
      preUpdateSnapshots.set(inverseCmd.id, cmd.data);
      return inverseCmd;
    }
  }
  return null;
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
  sid: string,
  newValues: Record<string, any>,
  oldValues: Record<string, any>
): void {
  const cmd = createCommand("update", sid, { data: newValues });
  preUpdateSnapshots.set(cmd.id, oldValues);
  pushCommand(cmd);
}

// --- Time Travel ---

function clearCanvas(): void {
  const doodler = getDoodler();
  const { doodles, setDoodles } = useCanvasStore.getState();
  for (const d of doodles) {
    doodler.canvas.remove(d.shape);
  }
  setDoodles([]);
}

export function enterTimeTravelMode(): void {
  const { commandLog } = useCommandLogStore.getState();
  clearSelection();
  useCommandLogStore.setState({
    isTimeTraveling: true,
    timelinePosition: commandLog.length,
  });
}

export function exitTimeTravelMode(): void {
  const { commandLog } = useCommandLogStore.getState();
  clearCanvas();
  for (const cmd of commandLog) {
    try {
      executeForward(cmd);
    } catch {
      // skip failed commands
    }
  }
  useCommandLogStore.setState({
    isTimeTraveling: false,
    timelinePosition: 0,
  });
  getDoodler().throttledTwoUpdate();
}

export function scrubTo(position: number): void {
  const { commandLog } = useCommandLogStore.getState();
  clearCanvas();
  const cmds = commandLog.slice(0, position);
  for (const cmd of cmds) {
    try {
      executeForward(cmd);
    } catch {
      // skip failed commands
    }
  }
  useCommandLogStore.setState({ timelinePosition: position });
  getDoodler().throttledTwoUpdate();
}

export async function branchFromTimeline(): Promise<string> {
  const { commandLog, timelinePosition } = useCommandLogStore.getState();
  const doodler = getDoodler();
  const { user } = useAuthStore.getState();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const branchCommands = commandLog.slice(0, timelinePosition);
  const newId = ulid();

  await storageClient.setSketchCommands(newId, branchCommands);
  const existingMeta = await storageClient.getSketchMeta(doodler.sketchId);
  const now = Date.now();
  const newMeta: SketchMeta = {
    id: newId,
    name: `${existingMeta?.name ?? doodler.sketchId} (branch)`,
    createdAt: now,
    updatedAt: now,
    ownerId: user.id,
  };
  await storageClient.setSketchMeta(newId, newMeta);

  exitTimeTravelMode();
  return newId;
}

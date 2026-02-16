import { throttle } from "@/utils/throttle";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import {
  get,
  getSketchCommands,
  getSketchMeta,
  setSketchCommands,
  setSketchMeta,
  SketchMeta,
} from "@/services/storage.client";
import { useCanvasStore, useOptionsStore } from "./canvas.store";
import {
  Doodle,
  SerializedDoodle,
} from "./doodle.utils";
import { Command, createCommand, useCommandLogStore } from "./history.store";
import { executeForward } from "./history.service";
import { ulid } from "ulid";

interface DoodlerProps {
  two: Two;
  zui: ZUI;
  canvas: Group;
  sketchId: string;
  container: HTMLDivElement;
}

export class Doodler {
  two: Two;
  zui: ZUI;
  canvas: Group;
  sketchId: string;
  container: HTMLDivElement;

  constructor(props: DoodlerProps) {
    this.two = props.two;
    this.canvas = props.canvas;
    this.zui = props.zui;
    this.sketchId = props.sketchId || "default";
    this.container = props.container;

    if (typeof window !== "undefined") {
      (window as any).doodler = this;
    }
  }

  throttledTwoUpdate = () => {
    const updateFrequency = useOptionsStore.getState().updateFrequency;

    if (updateFrequency === 0) {
      if (typeof this.two?.update === "function") {
        this.two?.update?.();
      }
    } else {
      if (!this._throttledUpdate || this._lastFrequency !== updateFrequency) {
        this._lastFrequency = updateFrequency;
        this._throttledUpdate = throttle(() => {
          if (typeof this.two?.update === "function") {
            this.two?.update?.();
          }
        }, updateFrequency);
      }
      this._throttledUpdate();
    }
  };

  private _throttledUpdate?: () => void;
  private _lastFrequency?: number;

  doCenterCanvas(): void {
    this.canvas.position.x = 0;
    this.canvas.position.y = 0;
    this.throttledTwoUpdate();
  }

  addDoodle(doodle: Doodle): void {
    if (!doodle.shape.id) {
      doodle.shape.id = ulid();
    }
    const { doodles, setDoodles } = useCanvasStore.getState();
    const newDoodles = [...doodles, doodle];
    setDoodles(newDoodles);
    this.canvas.add(doodle.shape);
  }

  removeDoodle(doodle: Doodle): void {
    const { doodles, setDoodles } = useCanvasStore.getState();
    const newDoodles = doodles.filter((d) => d !== doodle);
    setDoodles(newDoodles);
    this.canvas.remove(doodle.shape);
  }

  saveDoodles(): void {
    const { commandLog } = useCommandLogStore.getState();
    setSketchCommands(this.sketchId, commandLog);

    // Update metadata
    const existing = getSketchMeta(this.sketchId);
    const now = Date.now();
    const meta: SketchMeta = existing
      ? { ...existing, updatedAt: now }
      : {
        id: this.sketchId,
        name: this.sketchId,
        createdAt: now,
        updatedAt: now,
      };
    setSketchMeta(this.sketchId, meta);
  }

  async loadDoodles(): Promise<void> {
    if (!this.sketchId) {
      return;
    }

    // Try new storage format first
    const commands = getSketchCommands(this.sketchId);
    if (commands && commands.length) {
      useCommandLogStore.getState().setCommandLog(commands);
      for (const cmd of commands) {
        try {
          executeForward(cmd);
        } catch (e) {
          console.warn("Failed to replay command:", e);
        }
      }
      this.throttledTwoUpdate();
      return;
    }

    // Legacy migration: try old format (generic key with SerializedDoodle[] or Command[])
    const stored = get<Command[] | SerializedDoodle[]>(this.sketchId);
    if (!stored || !stored.length) {
      return;
    }

    const first = stored[0] as any;
    const isCommandLog = "uid" in first && "type" in first;
    const migrated: Command[] = [];

    if (isCommandLog) {
      const cmds = stored as Command[];
      for (const cmd of cmds) {
        try {
          migrated.push(cmd);
          executeForward(cmd);
        } catch (e) {
          console.warn("Failed to replay command:", e);
        }
      }
    } else {
      const doodles = stored as SerializedDoodle[];
      for (const serialized of doodles) {
        try {
          const cmd = createCommand("create", serialized.id, {
            data: serialized,
          });
          migrated.push(cmd);
          executeForward(cmd);
        } catch (e) {
          console.warn("Failed to migrate doodle:", e);
        }
      }
    }

    // Save in new format and create metadata
    useCommandLogStore.getState().setCommandLog(migrated);
    setSketchCommands(this.sketchId, migrated);
    const now = Date.now();
    setSketchMeta(this.sketchId, {
      id: this.sketchId,
      name: this.sketchId,
      createdAt: now,
      updatedAt: now,
    });

    this.throttledTwoUpdate();
  }
}

let doodlerInstance: Doodler | undefined;

export function setDoodlerInstance(doodler: Doodler) {
  doodlerInstance = doodler;
}

export function getDoodler(): Doodler {
  if (!doodlerInstance) {
    throw new Error("Doodler instance is not set yet.");
  }
  return doodlerInstance as Doodler;
}

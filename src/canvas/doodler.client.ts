import { throttle } from "@/utils/throttle";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { get, set } from "@/services/storage.client";
import { useCanvasStore, useOptionsStore } from "./canvas.store";
import {
  Doodle,
  SerializedDoodle,
  serializeDoodle,
} from "./doodle.utils";
import { useToastStore } from "@/components/ui/toasts";
import { Command, createCommand, useCommandLogStore } from "./history.store";
import { executeForward } from "./history.service";

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
      // No throttle - call immediately
      if (typeof this.two?.update === "function") {
        this.two?.update?.();
      }
    } else {
      // Use throttle with configured frequency
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
    // TODO update ID generation
    doodle.shape.id = crypto.randomUUID();
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
    set(this.sketchId, commandLog);
  }

  async loadDoodles(): Promise<void> {
    if (!this.sketchId) {
      return;
    }

    // Try loading as Command[] first
    const stored = get<Command[] | SerializedDoodle[]>(this.sketchId);

    if (!stored || !stored.length) {
      return;
    }

    // Detect format: Command[] has `uid` field, SerializedDoodle[] has `t` field
    const first = stored[0] as any;
    const isCommandLog = "uid" in first && "type" in first;

    if (isCommandLog) {
      // New format: Command[]
      const commands = stored as Command[];
      useCommandLogStore.getState().setCommandLog(commands);
      for (const cmd of commands) {
        try {
          executeForward(cmd);
        } catch (e) {
          console.warn("Failed to replay command:", e);
        }
      }
    } else {
      // Legacy format: SerializedDoodle[] — migrate to Command[]
      const doodles = stored as SerializedDoodle[];
      const commands: Command[] = [];
      for (const serialized of doodles) {
        try {
          const cmd = createCommand("create", serialized.id, {
            data: serialized,
          });
          commands.push(cmd);
          executeForward(cmd);
        } catch (e) {
          console.warn("Failed to migrate doodle:", e);
        }
      }
      // Save in new format
      useCommandLogStore.getState().setCommandLog(commands);
      set(this.sketchId, commands);
    }

    this.throttledTwoUpdate();
  }
}

let doodlerInstance: Doodler | undefined;

export function setDoodlerInstance(doodler: Doodler) {
  doodlerInstance = doodler;
}

// doodler() is only called after instance is initialized
export function getDoodler(): Doodler {
  if (!doodlerInstance) {
    throw new Error("Doodler instance is not set yet.");
  }
  return doodlerInstance as Doodler;
}

import { throttle } from "@/utils/throttle";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import {
  storageClient,
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
import { useAuthStore } from "@/stores/auth.store";
import { colord } from "colord";
import { syncService } from "@/sync/sync.client";
import { useZoomStore } from "./tools/zoom.tool";
import { updateGrid } from "./canvas.grid";


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
  private _saveViewportTimer?: ReturnType<typeof setTimeout>;

  saveViewport(): void {
    clearTimeout(this._saveViewportTimer);
    this._saveViewportTimer = setTimeout(() => {
      const sm = this.zui.surfaceMatrix.elements;
      const color = colord(useOptionsStore.getState().canvasColor).toHex();
      syncService.sendMeta({
        color,
        positionX: sm[2],
        positionY: sm[5],
        zoom: this.zui.scale,
      });
    }, 1000);
  }

  doCenterCanvas(): void {
    this.canvas.position.x = 0;
    this.canvas.position.y = 0;
    this.throttledTwoUpdate();
  }

  addDoodle(doodle: Doodle): void {

    // override id to make it globally unique, preventing conflicts when merging command logs from multiple users
    doodle.shape.id = ulid();
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

  async saveDoodles(): Promise<void> {
    const { commandLog } = useCommandLogStore.getState();
    const { user } = useAuthStore.getState();
    if (!user) return;

    await storageClient.setSketchCommands(this.sketchId, commandLog);

    // Update metadata timestamp
    let existingMeta = await storageClient.getSketchMeta(this.sketchId);
    const now = Date.now();
    const meta: SketchMeta = existingMeta
      ? { ...existingMeta, updatedAt: now }
      : {
        id: this.sketchId,
        name: this.sketchId,
        createdAt: now,
        updatedAt: now,
        ownerId: user.id,
      };
    await storageClient.setSketchMeta(this.sketchId, meta);
  }

  async loadDoodles(): Promise<void> {
    if (!this.sketchId) {
      return;
    }

    const meta = await storageClient.getSketchMeta(this.sketchId);
    if (meta?.color) {
      useOptionsStore.getState().setCanvasColor(colord(meta.color).toRgb());
    }

    const commands = await storageClient.getSketchCommands(this.sketchId);
    if (!commands) {
      console.warn(`No commands found for sketch ${this.sketchId}`);
    } else {
      if (commands.length) {
        useCommandLogStore.getState().setCommandLog(commands);
      }
      for (const cmd of commands) {
        try {
          executeForward(cmd);
        } catch (e) {
          console.warn("Failed to replay command:", e);
        }
      }
    }

    // Restore viewport position and zoom
    if (meta?.zoom && meta.zoom !== 1) {
      const ratio = meta.zoom - 1;
      const cx = this.two.width / 2;
      const cy = this.two.height / 2;
      this.zui.zoomBy(ratio, cx, cy);
      useZoomStore.getState().setZoom(Math.floor(meta.zoom * 100));
    }
    if (meta?.positionX != null && meta?.positionY != null) {
      this.zui.translateSurface(meta.positionX, meta.positionY);
    }
    if (meta?.zoom || meta?.positionX != null) {
      const sm = this.zui.surfaceMatrix.elements;
      updateGrid(this.zui.scale, sm[2], sm[5]);
    }

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


/*
 // TODO: update here to handle errors on loading local storage
    doodlerInstance.loadDoodles().finally(() => {
        onReady?.();
        syncService.connect(sketchId);
    });


syncService.disconnect();
useCommandLogStore.getState().clearSession();
*/
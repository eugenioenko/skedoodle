import { throttle } from "@/utils/throttle";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { get, set } from "@/services/storage.client";
import { useCanvasStore } from "./canvas.store";
import {
  Doodle,
  SerializedDoodle,
  serializeDoodle,
  unserializeDoodle,
} from "./doodle.utils";
import { useToastStore } from "@/components/ui/toasts";

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

  throttledTwoUpdate = throttle(() => {
    if (typeof this.two?.update === "function") {
      this.two?.update?.();
    }
  }, 1);

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

  async saveDoodles(): Promise<void> {
    const { doodles } = useCanvasStore.getState();
    const data = doodles.map((doodle) => serializeDoodle(doodle));
    set(this.sketchId, data);

    const addToast = useToastStore.getState().addToast;
    addToast("Sketch saved successfully");
  }

  async loadDoodles(): Promise<void> {
    if (!this.sketchId) {
      return;
    }

    const doodles = get<SerializedDoodle[]>(this.sketchId);

    if (!doodles || !doodles?.length) {
      return;
    }

    for (const serialized of doodles) {
      try {
        const doodle = unserializeDoodle(serialized);
        this.addDoodle(doodle);
      } catch (e) {
        console.warn(e);
        continue;
      }
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

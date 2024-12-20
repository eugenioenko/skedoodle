import { throttle } from "@/utils/throttle";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { Path } from "two.js/src/path";
import { useCanvasStore } from "./canvas.store";

interface DoodlerProps {
  two: Two;
  zui: ZUI;
  canvas: Group;
  sketchId: string;
}

export class Doodler {
  two: Two;
  zui: ZUI;
  canvas: Group;
  sketchId: string;

  constructor(props: DoodlerProps) {
    this.two = props.two;
    this.canvas = props.canvas;
    this.zui = props.zui;
    this.sketchId = props.sketchId;

    if (typeof window !== "undefined") {
      (window as any).doodler = this;
    }
  }

  throttledTwoUpdate = throttle(() => {
    this.two.update();
  }, 1);

  doCenterCanvas(): void {
    this.canvas.position.x = 0;
    this.canvas.position.y = 0;
    this.throttledTwoUpdate();
  }

  addDoodle(doodle: Doodle): void {
    // TODO update ID generation
    // doodle.shape.id = generateId();
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

export type DoodleType = "brush" | "rect" | "ellipse" | "circle";

interface DoodleProps {
  shape: Path;
  type: DoodleType;
}

export class Doodle {
  shape: Path;
  type: DoodleType;

  constructor(props: DoodleProps) {
    this.shape = props.shape;
    this.type = props.type;
  }
}

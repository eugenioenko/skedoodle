import { throttle } from "@/utils/throttle";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { Path } from "two.js/src/path";
import { useCanvasStore } from "./canvas.store";
import { get, set } from "idb-keyval";
import { Point } from "@/models/point.model";

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
    this.sketchId = props.sketchId || "default";

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

  saveDoodles(): void {
    return;
    /*
    const { doodles } = useCanvasStore.getState();
    const data = doodles.map((doodle) => ({
      type: doodle.type,
      shape: doodle.shape.toObject(),
    }));
    set(this.sketchId, data);
    */
  }

  async loadDoodles(): Promise<void> {
    return;
    /*

    if (!this.sketchId) {
      return;
    }

    const doodles = await get<DoodleProps[]>(this.sketchId);

    if (!doodles || !doodles?.length) {
      return;
    }

    for (const doodle of doodles) {
      if (doodle.type === "brush") {
        const data = doodle.shape;
        const path = this.two.makeCurve();
        path.cap = "round";
        path.closed = false;
        path.noFill().stroke = data.stroke;
        path.linewidth = data.linewidth;
        path.vertices = data.vertices.map(
          (v: Point) => new Two.Anchor(v.x, v.y)
        );
        path.translation.x = data.translation.x;
        path.translation.y = data.translation.y;
        this.addDoodle({ shape: path, type: "brush" });
      } else if (doodle.type === "rect") {
        const data = doodle.shape as any;
        const shape = this.two.makeRoundedRectangle(
          data.translation.x,
          data.translation.y,
          data.width,
          data.height,
          data.radius
        );
        shape.stroke = data.stroke;
        shape.fill = data.fill;
        shape.linewidth = data.linewidth;
        this.addDoodle({ shape: shape, type: "rect" });
      }
    }
    this.throttledTwoUpdate();
    */
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

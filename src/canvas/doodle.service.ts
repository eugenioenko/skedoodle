import { throttle } from "@/utils/throttle";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { Path } from "two.js/src/path";

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
}

type DoodleType = "brush" | "rect" | "highlight";

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

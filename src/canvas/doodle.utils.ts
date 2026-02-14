import { Point } from "@/models/point.model";
import Two from "two.js";
import { Path } from "two.js/src/path";
import { Shape } from "two.js/src/shape";
import { RoundedRectangle } from "two.js/src/shapes/rounded-rectangle";
import { Text } from "two.js/src/text";

export type DoodleType = "brush" | "rect" | "line" | "arrow" | "text" | "ellipse" | "circle" | "bezier";

export interface Doodle {
  shape: Shape;
  type: DoodleType;
}

type SerializedPoint = [number, number];
export interface SerializedDoodle {
  id: string;
  t: DoodleType; // type
  x: number; // translation.x position
  y: number; // translation.y
  w: number; // width
  h: number; // height
  r: number; // radius
  sc: string; // stroke color
  fc: string; // fill color
  lw: number; // linewidth
  v: SerializedPoint[]; // vertices
  // text-specific fields
  txt?: string; // text value
  ff?: string; // font family
  fs?: number; // font size
  fa?: string; // font alignment
  fw?: number | string; // font weight
  // bezier-specific fields
  bv?: [number, number, number, number, number, number, string][]; // [x, y, lx, ly, rx, ry, command]
  cl?: boolean; // closed path
}

/**
 * Serializes a Doodle into SerializedDoodle format.
 */
export function serializeDoodle(doodle: Doodle): SerializedDoodle {
  const { shape, type } = doodle;
  const { translation, id } = shape;
  const stroke = (shape as any).stroke;
  const fill = (shape as any).fill;
  const linewidth = (shape as any).linewidth;
  const vertices = (shape as Path).vertices;
  const width = (shape as any).width || 0;
  const height = (shape as any).height || 0;
  const radius = (shape as any).radius || 0;

  const serialized: SerializedDoodle = {
    id,
    t: type,
    x: translation.x,
    y: translation.y,
    w: width,
    h: height,
    r: radius,
    sc: (stroke as string) || "none",
    fc: (fill as string) || "none",
    lw: linewidth || 1,
    v: (vertices || []).map((v: Point) => [v.x, v.y]),
  };

  if (type === "text") {
    const text = shape as Text;
    serialized.txt = text.value;
    serialized.ff = text.family;
    serialized.fs = text.size;
    serialized.fa = text.alignment;
    serialized.fw = text.weight;
  }

  if (type === "bezier") {
    // Controls are relative offsets from anchor position
    serialized.bv = (vertices || []).map((v: any) => [
      v.x,
      v.y,
      v.controls?.left?.x ?? 0,
      v.controls?.left?.y ?? 0,
      v.controls?.right?.x ?? 0,
      v.controls?.right?.y ?? 0,
      v.command || "C",
    ]);
    serialized.cl = (shape as Path).closed;
  }

  return serialized;
}

/**
 * Unserializes a SerializedDoodle back into a Doodle.
 */
export function unserializeDoodle(serialized: SerializedDoodle): Doodle {
  const { t: type, x, y, sc, fc, lw, v, w, h, r, id } = serialized;

  if (type === "brush") {
    const vertices = v.map(
      (vv: SerializedPoint) => new Two.Anchor(vv[0], vv[1])
    );
    const shape = new Path(vertices, false, true);
    shape.id = id;
    shape.cap = "round";
    shape.closed = false;
    shape.noFill().stroke = sc;
    shape.linewidth = lw;
    shape.translation.x = x;
    shape.translation.y = y;

    return { type, shape };
  } else if (type === "line" || type === "arrow") {
    const vertices = v.map(
      (vv: SerializedPoint) => new Two.Anchor(vv[0], vv[1])
    );
    const shape = new Path(vertices, false, false);
    shape.id = id;
    shape.cap = "round";
    shape.closed = false;
    shape.noFill().stroke = sc;
    shape.linewidth = lw;
    shape.translation.x = x;
    shape.translation.y = y;

    return { type, shape };
  } else if (type === "rect") {
    const shape = new RoundedRectangle(x, y, w, h);
    shape.radius = r;
    shape.id = id;
    shape.stroke = sc;
    shape.fill = fc;
    shape.linewidth = lw;
    return { shape: shape, type: "rect" };
  } else if (type === "text") {
    const shape = new Text(serialized.txt || "", x, y);
    shape.id = id;
    shape.fill = fc;
    shape.stroke = sc;
    shape.linewidth = lw;
    shape.family = serialized.ff || "sans-serif";
    shape.size = serialized.fs || 24;
    shape.alignment = (serialized.fa || "left") as "left" | "center" | "right";
    shape.weight = serialized.fw || 400;
    return { shape, type: "text" };
  } else if (type === "bezier") {
    const vertices = (serialized.bv || []).map(
      (bv) =>
        new Two.Anchor(
          bv[0], bv[1], // position
          bv[2], bv[3], // left control
          bv[4], bv[5], // right control
          bv[6] as never      // command
        )
    );
    const shape = new Path(vertices, false, false, true);
    shape.id = id;
    shape.cap = "round";
    shape.join = "round";
    shape.closed = !!serialized.cl;
    shape.noFill().stroke = sc;
    shape.linewidth = lw;
    shape.translation.x = x;
    shape.translation.y = y;

    return { type, shape };
  } else {
    throw new Error(`Unknown doodle unserialization of type "${type}"`);
  }
}

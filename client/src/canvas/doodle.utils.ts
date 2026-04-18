import { Point } from "@/models/point.model";
import Two from "two.js";
import { Path } from "two.js/src/path";
import { Shape } from "two.js/src/shape";
import { Circle } from "two.js/src/shapes/circle";
import { Ellipse } from "two.js/src/shapes/ellipse";
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
  type: DoodleType;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  stroke: string;
  fill: string;
  linewidth: number;
  vertices: SerializedPoint[];
  // text-specific fields
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontAlignment?: string;
  fontWeight?: number | string;
  // bezier-specific fields
  bezierVertices?: [number, number, number, number, number, number, string][];
  closed?: boolean;
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
    type,
    x: translation.x,
    y: translation.y,
    width,
    height,
    radius,
    stroke: (stroke as string) || "none",
    fill: (fill as string) || "none",
    linewidth: linewidth || 1,
    vertices: (vertices || []).map((v: Point) => [v.x, v.y]),
  };

  if (type === "text") {
    const text = shape as Text;
    serialized.text = text.value;
    serialized.fontFamily = text.family;
    serialized.fontSize = text.size;
    serialized.fontAlignment = text.alignment;
    serialized.fontWeight = text.weight;
  }

  if (type === "bezier") {
    serialized.bezierVertices = (vertices || []).map((v: any) => [
      v.x,
      v.y,
      v.controls?.left?.x ?? 0,
      v.controls?.left?.y ?? 0,
      v.controls?.right?.x ?? 0,
      v.controls?.right?.y ?? 0,
      v.command || "C",
    ]);
    serialized.closed = (shape as Path).closed;
  }

  return serialized;
}

/**
 * Unserializes a SerializedDoodle back into a Doodle.
 */
export function unserializeDoodle(serialized: SerializedDoodle): Doodle {
  const { type, x, y, stroke, fill, linewidth, vertices, width, height, radius, id } = serialized;

  if (type === "brush") {
    const anchors = vertices.map(
      (vv: SerializedPoint) => new Two.Anchor(vv[0], vv[1])
    );
    const shape = new Path(anchors, false, true);
    shape.id = id;
    shape.cap = "round";
    shape.closed = false;
    shape.noFill().stroke = stroke;
    shape.linewidth = linewidth;
    shape.translation.x = x;
    shape.translation.y = y;

    return { type, shape };
  } else if (type === "line" || type === "arrow") {
    const anchors = vertices.map(
      (vv: SerializedPoint) => new Two.Anchor(vv[0], vv[1])
    );
    const shape = new Path(anchors, false, false);
    shape.id = id;
    shape.cap = "round";
    shape.closed = false;
    shape.noFill().stroke = stroke;
    shape.linewidth = linewidth;
    shape.translation.x = x;
    shape.translation.y = y;

    return { type, shape };
  } else if (type === "rect") {
    const shape = new RoundedRectangle(x, y, width, height);
    shape.radius = radius;
    shape.id = id;
    shape.stroke = stroke;
    shape.fill = fill;
    shape.linewidth = linewidth;
    return { shape, type: "rect" };
  } else if (type === "ellipse") {
    const shape = new Ellipse(x, y, width / 2, height / 2);
    shape.id = id;
    shape.stroke = stroke;
    shape.fill = fill;
    shape.linewidth = linewidth;
    return { shape, type: "ellipse" };
  } else if (type === "text") {
    const shape = new Text(serialized.text || "", x, y);
    shape.id = id;
    shape.fill = fill;
    shape.stroke = stroke;
    shape.linewidth = linewidth;
    shape.family = serialized.fontFamily || "sans-serif";
    shape.size = serialized.fontSize || 24;
    shape.alignment = (serialized.fontAlignment || "left") as "left" | "center" | "right";
    shape.weight = serialized.fontWeight || 400;
    return { shape, type: "text" };
  } else if (type === "bezier") {
    const anchors = (serialized.bezierVertices || []).map(
      (bv) =>
        new Two.Anchor(
          bv[0], bv[1],
          bv[2], bv[3],
          bv[4], bv[5],
          bv[6] as never
        )
    );
    const shape = new Path(anchors, false, false, true);
    shape.id = id;
    shape.cap = "round";
    shape.join = "round";
    shape.closed = !!serialized.closed;
    shape.noFill().stroke = stroke;
    shape.linewidth = linewidth;
    shape.translation.x = x;
    shape.translation.y = y;

    return { type, shape };
  } else if (type === "circle") {
    const shape = new Circle(x, y, radius);
    shape.id = id;
    shape.fill = fill;
    shape.noStroke();
    return { shape, type: "circle" };
  } else {
    throw new Error(`Unknown doodle unserialization of type "${type}"`);
  }
}

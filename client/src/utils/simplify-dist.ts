import { Point } from "@/models/point.model";

export function simplifyPathPointsByMinDist(
  points: Point[],
  minDistance: number
): Point[] {
  if (points.length <= 2) {
    return points;
  }

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );

    if (distance >= minDistance) {
      result.push(curr);
    }
  }

  return result;
}

export function simplifyRDP(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;

  const distanceToLine = (p: Point, start: Point, end: Point): number => {
    const numerator = Math.abs(
      (end.y - start.y) * p.x -
        (end.x - start.x) * p.y +
        end.x * start.y -
        end.y * start.x
    );
    const denominator = Math.sqrt(
      Math.pow(end.y - start.y, 2) + Math.pow(end.x - start.x, 2)
    );
    return numerator / denominator;
  };

  let maxDistance = 0;
  let index = -1;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToLine(
      points[i],
      points[0],
      points[points.length - 1]
    );
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = simplifyRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyRDP(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

export function simplifyRDPWithAngles(
  points: Point[],
  epsilon: number,
  angleThreshold: number
): Point[] {
  if (points.length < 3) return points;

  const distanceToLine = (p: Point, start: Point, end: Point): number => {
    const numerator = Math.abs(
      (end.y - start.y) * p.x -
        (end.x - start.x) * p.y +
        end.x * start.y -
        end.y * start.x
    );
    const denominator = Math.sqrt(
      Math.pow(end.y - start.y, 2) + Math.pow(end.x - start.x, 2)
    );
    return numerator / denominator;
  };

  const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
    const dx1 = p2.x - p1.x;
    const dy1 = p2.y - p1.y;
    const dx2 = p3.x - p2.x;
    const dy2 = p3.y - p2.y;

    const dotProduct = dx1 * dx2 + dy1 * dy2;
    const magnitude1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const magnitude2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    const cosineTheta = dotProduct / (magnitude1 * magnitude2);
    return Math.acos(Math.max(-1, Math.min(1, cosineTheta))); // Clamp to [-1, 1]
  };

  let maxDistance = 0;
  let index = -1;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToLine(
      points[i],
      points[0],
      points[points.length - 1]
    );
    const angle = calculateAngle(points[i - 1], points[i], points[i + 1]);

    if (distance > maxDistance && angle > angleThreshold) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = simplifyRDPWithAngles(
      points.slice(0, index + 1),
      epsilon,
      angleThreshold
    );
    const right = simplifyRDPWithAngles(
      points.slice(index),
      epsilon,
      angleThreshold
    );
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

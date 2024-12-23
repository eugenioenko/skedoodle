/*
 (c) 2017, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js

 Douglas-Peucker
*/

interface Point {
  x: number;
  y: number;
}

function getSqSegDist(p: Point, p1: Point, p2: Point): number {
  var x = p1.x,
    y = p1.y,
    dx = p2.x - x,
    dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
}

function simplifyDPStep(
  points: Point[],
  first: number,
  last: number,
  sqTolerance: number,
  simplified: Point[]
): void {
  let maxSqDist = sqTolerance;
  let index = 1;

  for (var i = first + 1; i < last; i++) {
    var sqDist = getSqSegDist(points[i], points[first], points[last]);

    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1)
      simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1)
      simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

// simplification using Ramer-Douglas-Peucker algorithm
function simplifyDouglasPeucker(points: Point[], sqTolerance: number): Point[] {
  var last = points.length - 1;

  var simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);

  return simplified;
}

// both algorithms combined for awesome performance
export function simplifyPath(
  points: Point[],
  tolerance: number,
  highestQuality: boolean
): Point[] {
  if (points.length <= 2) {
    return points;
  }

  var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;
  //points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
  points = simplifyDouglasPeucker(points, sqTolerance);

  return points;
}

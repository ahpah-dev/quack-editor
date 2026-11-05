import type { Bounds, Point, ShapeObject } from '../types';

export const TAU = Math.PI * 2;

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function uid(prefix = 'q'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function boundsOfPoints(points: Point[]): Bounds {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function baseObjectBounds(object: ShapeObject): Bounds {
  if (object.kind === 'text') {
    const anchor = object.points[0] || { x: 0, y: 0 };
    const size = object.fontSize || 64;
    const text = object.text || '';
    return {
      x: anchor.x,
      y: anchor.y,
      width: Math.max(size * 0.6, text.length * size * 0.56),
      height: size * 1.16,
    };
  }
  return boundsOfPoints(object.points);
}

export function normalizeDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

export function rotatePoint(point: Point, center: Point, degrees: number): Point {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function rotatePointsAround(points: Point[], center: Point, degrees: number): Point[] {
  return points.map(point => rotatePoint(point, center, degrees));
}

export function objectFramePoints(object: ShapeObject, padding = 0): Point[] {
  const base = baseObjectBounds(object);
  const center = { x: base.x + base.width / 2, y: base.y + base.height / 2 };
  const rotation = object.rotation || 0;
  return [
    { x: base.x - padding, y: base.y - padding },
    { x: base.x + base.width + padding, y: base.y - padding },
    { x: base.x + base.width + padding, y: base.y + base.height + padding },
    { x: base.x - padding, y: base.y + base.height + padding },
  ].map(point => rotatePoint(point, center, rotation));
}

export function objectBounds(object: ShapeObject): Bounds {
  const base = baseObjectBounds(object);
  const rotation = object.rotation || 0;
  if (!rotation) return base;
  return boundsOfPoints(objectFramePoints(object));
}

export function centerOfPoints(points: Point[]): Point {
  const bounds = boundsOfPoints(points);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function createRectangle(x: number, y: number, width: number, height: number): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function createEllipse(cx: number, cy: number, rx: number, ry: number, count = 72): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * TAU;
    points.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  return points;
}

export function createStar(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  spikes = 5,
  rotation = -Math.PI / 2,
): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < spikes * 2; index++) {
    const angle = rotation + (index / (spikes * 2)) * TAU;
    const radius = index % 2 === 0 ? outer : inner;
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return points;
}

export function catmullRomClosed(anchors: Point[], samplesPerSegment = 10): Point[] {
  if (anchors.length < 3) return anchors.slice();
  const points: Point[] = [];
  const count = anchors.length;
  for (let index = 0; index < count; index++) {
    const p0 = anchors[(index - 1 + count) % count];
    const p1 = anchors[index];
    const p2 = anchors[(index + 1) % count];
    const p3 = anchors[(index + 2) % count];
    for (let step = 0; step < samplesPerSegment; step++) {
      const t = step / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      points.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return points;
}

export function createDuck(cx: number, cy: number, scale: number): Point[] {
  const anchors: Point[] = [
    { x: -0.55, y: -0.2 },
    { x: -0.36, y: -0.42 },
    { x: -0.16, y: -0.56 },
    { x: 0.04, y: -0.6 },
    { x: 0.19, y: -0.54 },
    { x: 0.32, y: -0.47 },
    { x: 0.51, y: -0.41 },
    { x: 0.33, y: -0.34 },
    { x: 0.18, y: -0.32 },
    { x: 0.29, y: -0.13 },
    { x: 0.32, y: 0.11 },
    { x: 0.14, y: 0.33 },
    { x: -0.16, y: 0.38 },
    { x: -0.43, y: 0.24 },
    { x: -0.62, y: 0.11 },
  ];
  return catmullRomClosed(
    anchors.map(point => ({ x: cx + point.x * scale, y: cy + point.y * scale })),
    8,
  );
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, a);
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function hitTestObject(object: ShapeObject, point: Point, tolerance = 8): boolean {
  const base = baseObjectBounds(object);
  const center = { x: base.x + base.width / 2, y: base.y + base.height / 2 };
  const localPoint = object.rotation ? rotatePoint(point, center, -(object.rotation || 0)) : point;
  if (
    localPoint.x < base.x - tolerance ||
    localPoint.y < base.y - tolerance ||
    localPoint.x > base.x + base.width + tolerance ||
    localPoint.y > base.y + base.height + tolerance
  ) {
    return false;
  }

  if (object.kind === 'text') return true;
  if (object.closed && object.fill && pointInPolygon(localPoint, object.points)) return true;

  const threshold = Math.max(tolerance, object.strokeWidth / 2 + 2);
  const points = object.closed ? [...object.points, object.points[0]] : object.points;
  for (let index = 0; index < points.length - 1; index++) {
    if (distanceToSegment(localPoint, points[index], points[index + 1]) <= threshold) return true;
  }
  return false;
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

export function unionBounds(boundsList: Bounds[]): Bounds {
  if (!boundsList.length) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const bounds of boundsList) {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function smoothPolyline(points: Point[], iterations = 2): Point[] {
  if (points.length < 3) return points.map(point => ({ ...point }));
  let current = points.map(point => ({ ...point }));
  const rounds = Math.max(1, Math.min(3, iterations));
  for (let round = 0; round < rounds; round++) {
    if (current.length < 3) break;
    const next: Point[] = [{ ...current[0] }];
    for (let index = 0; index < current.length - 1; index++) {
      const a = current[index];
      const b = current[index + 1];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    next.push({ ...current[current.length - 1] });
    current = next;
  }
  return current;
}

export function transformPoints(points: Point[], dx: number, dy: number): Point[] {
  return points.map(point => ({ x: point.x + dx, y: point.y + dy }));
}

export function scalePointsAround(
  points: Point[],
  anchor: Point,
  scaleX: number,
  scaleY: number,
): Point[] {
  return points.map(point => ({
    x: anchor.x + (point.x - anchor.x) * scaleX,
    y: anchor.y + (point.y - anchor.y) * scaleY,
  }));
}

export function signedArea(points: Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

export function resampleContour(points: Point[], closed: boolean, count: number): Point[] {
  if (!points.length) return [];
  if (points.length === 1) return Array.from({ length: count }, () => ({ ...points[0] }));

  const source = closed ? [...points, points[0]] : points;
  const lengths: number[] = [];
  let total = 0;
  for (let index = 0; index < source.length - 1; index++) {
    const length = distance(source[index], source[index + 1]);
    lengths.push(length);
    total += length;
  }
  if (total <= 0.00001) return Array.from({ length: count }, () => ({ ...points[0] }));

  const result: Point[] = [];
  for (let sample = 0; sample < count; sample++) {
    const fraction = closed ? sample / count : sample / Math.max(1, count - 1);
    let remaining = total * fraction;
    let segment = 0;
    while (segment < lengths.length - 1 && remaining > lengths[segment]) {
      remaining -= lengths[segment];
      segment++;
    }
    const local = lengths[segment] === 0 ? 0 : remaining / lengths[segment];
    result.push({
      x: lerp(source[segment].x, source[segment + 1].x, local),
      y: lerp(source[segment].y, source[segment + 1].y, local),
    });
  }
  return result;
}

function bestClosedRotation(source: Point[], destination: Point[]): Point[] {
  const stride = Math.max(1, Math.floor(destination.length / 36));
  let bestShift = 0;
  let bestScore = Infinity;

  for (let shift = 0; shift < destination.length; shift += stride) {
    let score = 0;
    for (let index = 0; index < source.length; index += stride) {
      const target = destination[(index + shift) % destination.length];
      score += (source[index].x - target.x) ** 2 + (source[index].y - target.y) ** 2;
    }
    if (score < bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }

  for (let shift = bestShift - stride; shift <= bestShift + stride; shift++) {
    const normalized = ((shift % destination.length) + destination.length) % destination.length;
    let score = 0;
    for (let index = 0; index < source.length; index++) {
      const target = destination[(index + normalized) % destination.length];
      score += (source[index].x - target.x) ** 2 + (source[index].y - target.y) ** 2;
    }
    if (score < bestScore) {
      bestScore = score;
      bestShift = normalized;
    }
  }

  return destination.slice(bestShift).concat(destination.slice(0, bestShift));
}

export function interpolateContours(
  source: Point[],
  destination: Point[],
  closed: boolean,
  t: number,
): Point[] {
  const count = closed ? 112 : 80;
  let from = resampleContour(source, closed, count);
  let to = resampleContour(destination, closed, count);

  if (closed) {
    if (Math.sign(signedArea(from)) !== Math.sign(signedArea(to))) {
      to = to.slice().reverse();
    }
    to = bestClosedRotation(from, to);
  } else {
    const straight =
      distance(from[0], to[0]) + distance(from[from.length - 1], to[to.length - 1]);
    const reversed =
      distance(from[0], to[to.length - 1]) + distance(from[from.length - 1], to[0]);
    if (reversed < straight) to = to.slice().reverse();
  }

  return from.map((point, index) => ({
    x: lerp(point.x, to[index].x, t),
    y: lerp(point.y, to[index].y, t),
  }));
}

export function transformInterpolateContours(
  source: Point[],
  destination: Point[],
  t: number,
): Point[] {
  const from = boundsOfPoints(source);
  const to = boundsOfPoints(destination);
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const scaleX = 1 + ((to.width || from.width) / Math.max(1, from.width) - 1) * t;
  const scaleY = 1 + ((to.height || from.height) / Math.max(1, from.height) - 1) * t;
  const center = {
    x: lerp(fromCenter.x, toCenter.x, t),
    y: lerp(fromCenter.y, toCenter.y, t),
  };

  return source.map(point => ({
    x: center.x + (point.x - fromCenter.x) * scaleX,
    y: center.y + (point.y - fromCenter.y) * scaleY,
  }));
}

export function polygonPath(points: Point[], closed: boolean, smooth: boolean): Path2D {
  const path = new Path2D();
  if (!points.length) return path;
  path.moveTo(points[0].x, points[0].y);
  if (points.length < 3 || !smooth) {
    for (let index = 1; index < points.length; index++) {
      path.lineTo(points[index].x, points[index].y);
    }
  } else if (closed) {
    for (let index = 0; index < points.length; index++) {
      const p0 = points[(index - 1 + points.length) % points.length];
      const p1 = points[index];
      const p2 = points[(index + 1) % points.length];
      const p3 = points[(index + 2) % points.length];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      if (index === 0) path.moveTo(p1.x, p1.y);
      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  } else {
    for (let index = 0; index < points.length - 1; index++) {
      const p0 = points[Math.max(0, index - 1)];
      const p1 = points[index];
      const p2 = points[index + 1];
      const p3 = points[Math.min(points.length - 1, index + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }
  if (closed) path.closePath();
  return path;
}

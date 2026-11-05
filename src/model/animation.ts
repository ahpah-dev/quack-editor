import type { Project, ShapeObject } from '../types';
import { mixColor } from './colors';
import {
  boundsOfPoints,
  interpolateContours,
  lerp,
  smoothstep,
  transformInterpolateContours,
} from './geometry';
import { keyframeAt, nextKeyframe, previousKeyframe } from './project';

function cloneObject(object: ShapeObject): ShapeObject {
  return { ...object, points: object.points.map(point => ({ ...point })) };
}

function isText(object: ShapeObject) {
  return object.kind === 'text';
}

function lerpRotation(source: number, destination: number, t: number): number {
  const delta = ((destination - source + 540) % 360) - 180;
  return source + delta * t;
}

function centerOf(object: ShapeObject) {
  const bounds = boundsOfPoints(object.points);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function pairObjects(source: ShapeObject[], destination: ShapeObject[]) {
  const pairs: Array<{ source: ShapeObject; destination: ShapeObject }> = [];
  const usedDestination = new Set<string>();
  const destinationById = new Map(destination.map(object => [object.id, object]));

  for (const sourceObject of source) {
    const matched = destinationById.get(sourceObject.id);
    if (matched && !usedDestination.has(matched.id)) {
      pairs.push({ source: sourceObject, destination: matched });
      usedDestination.add(matched.id);
    }
  }

  const remainingSource = source.filter(
    object => !pairs.some(pair => pair.source.id === object.id),
  );
  const remainingDestination = destination.filter(object => !usedDestination.has(object.id));

  for (const sourceObject of remainingSource) {
    let best: ShapeObject | null = null;
    let bestScore = Infinity;
    for (const destinationObject of remainingDestination) {
      if (usedDestination.has(destinationObject.id)) continue;
      if (isText(sourceObject) !== isText(destinationObject)) continue;
      const a = centerOf(sourceObject);
      const b = centerOf(destinationObject);
      const score = Math.hypot(a.x - b.x, a.y - b.y);
      if (score < bestScore) {
        bestScore = score;
        best = destinationObject;
      }
    }
    if (best) {
      pairs.push({ source: sourceObject, destination: best });
      usedDestination.add(best.id);
    }
  }

  return {
    pairs,
    fadeOut: source.filter(object => !pairs.some(pair => pair.source.id === object.id)),
    fadeIn: destination.filter(object => !usedDestination.has(object.id)),
  };
}

function fadeObject(object: ShapeObject, factor: number, suffix: string): ShapeObject {
  return {
    ...cloneObject(object),
    id: `${object.id}${suffix}`,
    opacity: object.opacity * factor,
  };
}

function interpolateText(source: ShapeObject, destination: ShapeObject, t: number): ShapeObject[] {
  if ((source.text || '') !== (destination.text || '') || source.fontSize !== destination.fontSize) {
    return [
      fadeObject(source, 1 - t, '-out'),
      fadeObject(destination, t, '-in'),
    ];
  }

  const a = source.points[0] || { x: 0, y: 0 };
  const b = destination.points[0] || { x: 0, y: 0 };
  return [
    {
      ...source,
      points: [{ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }],
      fill: mixColor(source.fill, destination.fill, t),
      stroke: mixColor(source.stroke, destination.stroke, t),
      strokeWidth: lerp(source.strokeWidth, destination.strokeWidth, t),
      opacity: lerp(source.opacity, destination.opacity, t),
      rotation: lerpRotation(source.rotation || 0, destination.rotation || 0, t),
      fontSize: lerp(source.fontSize || 64, destination.fontSize || 64, t),
    },
  ];
}

function morphObject(
  source: ShapeObject,
  destination: ShapeObject,
  t: number,
  shapeMorph: boolean,
): ShapeObject[] {
  if (isText(source) && isText(destination)) {
    return interpolateText(source, destination, t);
  }
  if (isText(source) || isText(destination)) {
    return [
      fadeObject(source, 1 - t, '-out'),
      fadeObject(destination, t, '-in'),
    ];
  }

  const closed = source.closed || destination.closed;
  const points = shapeMorph
    ? interpolateContours(source.points, destination.points, closed, t)
    : transformInterpolateContours(source.points, destination.points, t);

  return [
    {
      ...source,
      id: source.id,
      kind: 'path',
      points,
      closed,
      smooth: source.smooth || destination.smooth,
      fill: mixColor(source.fill, destination.fill, t),
      stroke: mixColor(source.stroke, destination.stroke, t),
      strokeWidth: lerp(source.strokeWidth, destination.strokeWidth, t),
      opacity: lerp(source.opacity, destination.opacity, t),
      rotation: lerpRotation(source.rotation || 0, destination.rotation || 0, t),
      text: undefined,
    },
  ];
}

export function sceneAt(project: Project, frame: number): ShapeObject[] {
  const keyframes = project.keyframes.slice().sort((a, b) => a.at - b.at);
  if (!keyframes.length) return [];

  const exact = keyframeAt(project, frame);
  if (exact) return exact.objects.map(cloneObject);

  const before = previousKeyframe(project, frame);
  const after = nextKeyframe(project, frame);
  if (!before && after) return after.objects.map(cloneObject);
  if (before && !after) return before.objects.map(cloneObject);
  if (!before || !after) return [];

  if (!project.autoTween) return before.objects.map(cloneObject);

  const rawT = (frame - before.at) / Math.max(1, after.at - before.at);
  const t = smoothstep(Math.max(0, Math.min(1, rawT)));
  const { pairs, fadeOut, fadeIn } = pairObjects(before.objects, after.objects);
  const scene: ShapeObject[] = [];

  for (const pair of pairs) {
    scene.push(...morphObject(pair.source, pair.destination, t, project.shapeMorph));
  }
  for (const object of fadeOut) {
    if (t < 0.999) scene.push(fadeObject(object, 1 - t, '-out'));
  }
  for (const object of fadeIn) {
    if (t > 0.001) scene.push(fadeObject(object, t, '-in'));
  }

  return scene.filter(object => object.opacity > 0.002);
}

export function sceneHasContent(scene: ShapeObject[]): boolean {
  return scene.some(object => object.opacity > 0.01 && (object.points.length > 0 || object.kind === 'text'));
}

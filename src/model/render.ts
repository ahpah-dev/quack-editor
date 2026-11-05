import type { Project, ShapeObject } from '../types';
import { polygonPath } from './geometry';
import { sceneAt } from './animation';
import { projectDuration } from './project';

export const TEXT_FONT = '"Manrope Variable", "Manrope", system-ui, sans-serif';

export function drawShape(ctx: CanvasRenderingContext2D, object: ShapeObject): void {
  if (object.opacity <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = object.opacity;

  if (object.kind === 'text') {
    const anchor = object.points[0] || { x: 0, y: 0 };
    const size = object.fontSize || 64;
    ctx.font = `800 ${size}px ${TEXT_FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    if (object.fill) {
      ctx.fillStyle = object.fill;
      ctx.fillText(object.text || '', anchor.x, anchor.y);
    }
    if (object.stroke && object.strokeWidth > 0) {
      ctx.strokeStyle = object.stroke;
      ctx.lineWidth = object.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(object.text || '', anchor.x, anchor.y);
    }
    ctx.restore();
    return;
  }

  const path = polygonPath(object.points, object.closed, object.smooth);
  if (object.fill && object.closed) {
    ctx.fillStyle = object.fill;
    ctx.fill(path);
  }
  if (object.stroke && object.strokeWidth > 0) {
    ctx.strokeStyle = object.stroke;
    ctx.lineWidth = object.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  }
  ctx.restore();
}

export function drawSceneObjects(
  ctx: CanvasRenderingContext2D,
  objects: ShapeObject[],
): void {
  objects.forEach(object => drawShape(ctx, object));
}

function drawTintedShape(
  ctx: CanvasRenderingContext2D,
  object: ShapeObject,
  tint: string,
  strength: number,
): void {
  if (object.opacity <= 0.01) return;
  const alpha = Math.max(0, Math.min(1, strength * object.opacity));
  ctx.save();

  if (object.kind === 'text') {
    const anchor = object.points[0] || { x: 0, y: 0 };
    const size = object.fontSize || 64;
    ctx.globalAlpha = alpha * 0.72;
    ctx.fillStyle = tint;
    ctx.font = `800 ${size}px ${TEXT_FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(object.text || '', anchor.x, anchor.y);
    ctx.restore();
    return;
  }

  const path = polygonPath(object.points, object.closed, object.smooth);

  if (object.closed) {
    ctx.globalAlpha = alpha * 0.12;
    ctx.fillStyle = tint;
    ctx.fill(path);
  }

  ctx.globalAlpha = alpha * 0.78;
  ctx.strokeStyle = tint;
  ctx.lineWidth = Math.max(1.4, Math.min(3, object.strokeWidth || 2));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path);
  ctx.restore();
}

export function drawOnionSkin(
  ctx: CanvasRenderingContext2D,
  project: Project,
  frame: number,
  range: number,
): void {
  const duration = projectDuration(project);
  const layers = Math.max(1, Math.min(4, Math.round(range)));

  for (let offset = layers; offset >= 1; offset--) {
    const strength = 0.42 / offset;
    const previousFrame = frame - offset;
    const nextFrame = frame + offset;

    if (previousFrame >= 1) {
      drawTintedScene(ctx, sceneAt(project, previousFrame), '#ff9f43', strength);
    }
    if (nextFrame <= duration) {
      drawTintedScene(ctx, sceneAt(project, nextFrame), '#3ee6c4', strength);
    }
  }
}

function drawTintedScene(
  ctx: CanvasRenderingContext2D,
  objects: ShapeObject[],
  tint: string,
  strength: number,
): void {
  objects.forEach(object => drawTintedShape(ctx, object, tint, strength));
}

export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  frame: number,
): void {
  ctx.save();
  ctx.clearRect(0, 0, project.width, project.height);
  ctx.fillStyle = project.background;
  ctx.fillRect(0, 0, project.width, project.height);
  drawSceneObjects(ctx, sceneAt(project, frame));
  ctx.restore();
}

export function renderThumbnail(
  canvas: HTMLCanvasElement,
  project: Project,
  objects: ShapeObject[],
  width: number,
  height: number,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = project.background;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / project.width, height / project.height);
  const offsetX = (width - project.width * scale) / 2;
  const offsetY = (height - project.height * scale) / 2;
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  drawSceneObjects(ctx, objects);
}

import type { Project, ShapeObject } from '../types';
import { polygonPath } from './geometry';
import { sceneAt } from './animation';

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

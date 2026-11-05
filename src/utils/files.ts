import type { Project } from '../types';
import { renderProjectFrame } from '../model/render';
import { serializeProject } from '../model/project';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'quack-project'
  );
}

export function saveProjectFile(project: Project): void {
  const blob = new Blob([serializeProject(project)], { type: 'application/json' });
  downloadBlob(blob, `${slugify(project.name)}.quack`);
}

export function exportFramePng(project: Project, frame: number, scale = 2): void {
  const canvas = document.createElement('canvas');
  canvas.width = project.width * scale;
  canvas.height = project.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);
  renderProjectFrame(ctx, project, frame);
  canvas.toBlob(blob => {
    if (blob) downloadBlob(blob, `${slugify(project.name)}-frame-${frame}.png`);
  }, 'image/png');
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

import type { AudioTrack, Keyframe, Project, ShapeObject } from '../types';
import { createDemoDuck, demoStar } from './demo';
import { uid } from './geometry';

export const MAX_HISTORY = 60;

export function createEmptyProject(name = 'Untitled Quack'): Project {
  return {
    format: 'quack-project',
    version: 1,
    name,
    width: 960,
    height: 540,
    fps: 24,
    background: '#fffdf4',
    keyframes: [
      {
        id: uid('key'),
        at: 1,
        objects: [],
      },
    ],
    autoTween: true,
    shapeMorph: true,
    loop: true,
    gap: 8,
  };
}

export function createDemoProject(): Project {
  const body = createDemoDuck();
  const eye: ShapeObject = {
    id: uid('eye'),
    kind: 'ellipse',
    points: demoStar.eye,
    closed: true,
    smooth: true,
    fill: '#0a2a24',
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
  };

  const destination = {
    ...body,
    points: demoStar.points,
    kind: 'star' as const,
    smooth: false,
    fill: '#3ee6c4',
    stroke: '#0d4a3d',
    strokeWidth: 5,
  };

  const sparkles: ShapeObject[] = demoStar.sparkles.map((points, index) => ({
    id: uid(`spark${index}`),
    kind: 'star',
    points,
    closed: true,
    smooth: false,
    fill: index % 2 === 0 ? '#ffd166' : '#ff9f43',
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
  }));

  return {
    format: 'quack-project',
    version: 1,
    name: 'Duck to Star',
    width: 960,
    height: 540,
    fps: 24,
    background: '#fffdf4',
    keyframes: [
      { id: uid('key'), at: 1, objects: [body, eye] },
      { id: uid('key'), at: 13, objects: [destination, ...sparkles] },
    ],
    autoTween: true,
    shapeMorph: true,
    loop: true,
    gap: 12,
  };
}

export function projectDuration(project: Project): number {
  const last = project.keyframes.reduce((max, frame) => Math.max(max, frame.at), 1);
  const audioFrames = project.audio
    ? Math.ceil((project.audio.offset + project.audio.duration) * project.fps)
    : 0;
  const explicitEnd = project.endFrame
    ? Math.max(1, Math.round(project.endFrame))
    : 0;
  return Math.max(24, last + 12, audioFrames + 1, explicitEnd);
}

function sanitizeAudio(value: unknown): AudioTrack | null {
  if (!value || typeof value !== 'object') return null;
  const audio = value as Partial<AudioTrack>;
  if (typeof audio.dataUrl !== 'string' || !audio.dataUrl.startsWith('data:audio/')) return null;
  return {
    id: typeof audio.id === 'string' ? audio.id : uid('audio'),
    name: typeof audio.name === 'string' ? audio.name : 'Audio track',
    dataUrl: audio.dataUrl,
    duration: Math.max(0.05, asNumber(audio.duration, 1)),
    volume: Math.max(0, Math.min(1, asNumber(audio.volume, 0.8))),
    offset: Math.max(0, asNumber(audio.offset, 0)),
  };
}

export function keyframeAt(project: Project, frame: number): Keyframe | null {
  return project.keyframes.find(keyframe => keyframe.at === frame) || null;
}

export function previousKeyframe(project: Project, frame: number): Keyframe | null {
  return (
    project.keyframes
      .filter(keyframe => keyframe.at <= frame)
      .sort((a, b) => b.at - a.at)[0] || null
  );
}

export function nextKeyframe(project: Project, frame: number): Keyframe | null {
  return (
    project.keyframes
      .filter(keyframe => keyframe.at >= frame)
      .sort((a, b) => a.at - b.at)[0] || null
  );
}

export function sortedKeyframes(project: Project): Keyframe[] {
  return project.keyframes.slice().sort((a, b) => a.at - b.at);
}

export function uniqueKeyframePosition(project: Project, desired: number): number {
  let frame = Math.max(2, desired);
  while (project.keyframes.some(keyframe => keyframe.at === frame)) frame++;
  return frame;
}

export function withKeyframe(project: Project, keyframe: Keyframe): Project {
  return {
    ...project,
    keyframes: [...project.keyframes.filter(item => item.at !== keyframe.at), keyframe].sort(
      (a, b) => a.at - b.at,
    ),
  };
}

export function updateKeyframe(
  project: Project,
  keyframeId: string,
  update: (keyframe: Keyframe) => Keyframe,
): Project {
  return {
    ...project,
    keyframes: project.keyframes.map(keyframe =>
      keyframe.id === keyframeId ? update(keyframe) : keyframe,
    ),
  };
}

export function cloneProject(project: Project): Project {
  return structuredClone(project);
}

export function serializeProject(project: Project): string {
  return JSON.stringify(
    {
      format: 'quack-editor',
      version: 1,
      app: 'Quack Editor',
      savedAt: new Date().toISOString(),
      project,
    },
    null,
    2,
  );
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeObject(value: unknown): ShapeObject | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as Partial<ShapeObject>;
  if (!Array.isArray(object.points) || !object.points.length) return null;
  const points = object.points
    .filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y))
    .map(point => ({ x: point.x, y: point.y }));
  if (!points.length) return null;

  return {
    id: typeof object.id === 'string' ? object.id : uid('obj'),
    kind: ['path', 'rect', 'ellipse', 'line', 'star', 'text'].includes(object.kind || '')
      ? (object.kind as ShapeObject['kind'])
      : 'path',
    points,
    closed: object.closed !== false,
    smooth: object.smooth !== false,
    fill: typeof object.fill === 'string' ? object.fill : null,
    stroke: typeof object.stroke === 'string' ? object.stroke : null,
    strokeWidth: Math.max(0, asNumber(object.strokeWidth, 4)),
    opacity: Math.max(0, Math.min(1, asNumber(object.opacity, 1))),
    rotation: asNumber(object.rotation, 0),
    text: typeof object.text === 'string' ? object.text : undefined,
    fontSize: Math.max(8, asNumber(object.fontSize || 64, 64)),
  };
}

export function parseProjectFile(text: string): Project {
  const raw = JSON.parse(text);
  const project = raw?.project || raw;
  if (!project || typeof project !== 'object') throw new Error('Not a Quack project.');
  if (!Array.isArray(project.keyframes) || !project.keyframes.length) {
    throw new Error('Project has no keyframes.');
  }

  const keyframes: Keyframe[] = project.keyframes
    .map((value: unknown) => {
      if (!value || typeof value !== 'object') return null;
      const frame = value as Partial<Keyframe>;
      const objects = Array.isArray(frame.objects)
        ? frame.objects.map(sanitizeObject).filter(Boolean) as ShapeObject[]
        : [];
      return {
        id: typeof frame.id === 'string' ? frame.id : uid('key'),
        at: Math.max(1, Math.round(asNumber(frame.at, 1))),
        objects,
      };
    })
    .filter(Boolean) as Keyframe[];

  if (!keyframes.length) throw new Error('Project has no usable keyframes.');
  const deduped = Array.from(new Map(keyframes.map(frame => [frame.at, frame])).values()).sort(
    (a, b) => a.at - b.at,
  );

  return {
    format: 'quack-project',
    version: 1,
    name: typeof project.name === 'string' ? project.name : 'Imported Quack',
    width: Math.max(64, Math.round(asNumber(project.width, 960))),
    height: Math.max(64, Math.round(asNumber(project.height, 540))),
    fps: Math.max(1, Math.min(60, Math.round(asNumber(project.fps, 24)))),
    background: typeof project.background === 'string' ? project.background : '#fffdf4',
    keyframes: deduped,
    audio: sanitizeAudio((project as { audio?: unknown }).audio),
    endFrame: Math.max(
      24,
      Math.round(asNumber((project as { endFrame?: unknown }).endFrame, 24)),
    ),
    autoTween: project.autoTween !== false,
    shapeMorph: project.shapeMorph !== false,
    loop: project.loop !== false,
    gap: Math.max(1, Math.min(48, Math.round(asNumber(project.gap, 8)))),
  };
}

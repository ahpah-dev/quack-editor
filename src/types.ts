export type Point = { x: number; y: number };

export type ShapeKind = 'path' | 'rect' | 'ellipse' | 'line' | 'star' | 'text';

export type Tool =
  | 'select'
  | 'brush'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'star'
  | 'text'
  | 'eraser'
  | 'pan';

export interface ShapeObject {
  id: string;
  kind: ShapeKind;
  points: Point[];
  closed: boolean;
  smooth: boolean;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
}

export interface Keyframe {
  id: string;
  at: number;
  objects: ShapeObject[];
}

export interface AudioTrack {
  id: string;
  name: string;
  dataUrl: string;
  duration: number;
  volume: number;
  offset: number;
}

export interface Project {
  format: 'quack-project';
  version: 1;
  name: string;
  width: number;
  height: number;
  fps: number;
  background: string;
  keyframes: Keyframe[];
  audio?: AudioTrack | null;
  endFrame?: number;
  autoTween: boolean;
  shapeMorph: boolean;
  loop: boolean;
  gap: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewTransform {
  scale: number;
  x: number;
  y: number;
}

export type NoticeTone = 'mint' | 'amber' | 'coral' | 'ink';

export interface Notice {
  id: number;
  message: string;
  tone: NoticeTone;
}

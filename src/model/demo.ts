import type { ShapeObject } from '../types';
import { createDuck, createEllipse, createStar, uid } from './geometry';

export function createDemoDuck(): ShapeObject {
  return {
    id: uid('body'),
    kind: 'path',
    points: createDuck(300, 272, 350),
    closed: true,
    smooth: true,
    fill: '#ffd166',
    stroke: '#123c32',
    strokeWidth: 5,
    opacity: 1,
  };
}

export const demoStar = {
  points: createStar(652, 270, 190, 78, 5),
  eye: createEllipse(329, 101, 11, 11, 20),
  sparkles: [
    createStar(796, 126, 26, 10, 5),
    createStar(824, 348, 18, 7, 5),
    createStar(510, 86, 14, 5, 5),
  ],
};

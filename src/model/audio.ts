import type { AudioTrack } from '../types';
import { uid } from './geometry';

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read the audio file.'));
    reader.readAsDataURL(file);
  });
}

export async function decodeAudioDataUrl(dataUrl: string): Promise<AudioBuffer> {
  const response = await fetch(dataUrl);
  const bytes = await response.arrayBuffer();
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(bytes);
  } finally {
    void context.close();
  }
}

export async function createAudioTrack(file: File): Promise<{
  track: AudioTrack;
  buffer: AudioBuffer;
}> {
  const [dataUrl, bytes] = await Promise.all([readFileAsDataUrl(file), file.arrayBuffer()]);
  const context = new AudioContext();
  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(bytes);
  } finally {
    void context.close();
  }
  return {
    track: {
      id: uid('audio'),
      name: file.name.replace(/\.[^.]+$/, '') || 'Audio track',
      dataUrl,
      duration: buffer.duration,
      volume: 0.8,
      offset: 0,
    },
    buffer,
  };
}

export function peaksFromBuffer(buffer: AudioBuffer, buckets = 1400): number[] {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  if (!channels.length) return [];
  const count = Math.max(24, Math.min(buckets, Math.floor(buffer.length / 24) || 24));
  const step = buffer.length / count;
  const peaks: number[] = [];

  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor(bucket * step);
    const end = Math.min(buffer.length, Math.floor((bucket + 1) * step));
    let peak = 0;
    for (let index = start; index < end; index += 1) {
      for (const channel of channels) {
        const value = Math.abs(channel[index] || 0);
        if (value > peak) peak = value;
      }
    }
    peaks.push(peak);
  }

  const loudest = peaks.reduce((max, value) => Math.max(max, value), 0.0001);
  return peaks.map(value => Math.min(1, value / loudest));
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

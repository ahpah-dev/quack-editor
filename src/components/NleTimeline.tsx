import { useEffect, useRef, useState } from 'react';
import type { AudioTrack, Project } from '../types';
import { formatAudioTime } from '../model/audio';
import { keyframeAt, projectDuration, sortedKeyframes } from '../model/project';
import { Icon } from './Icons';

interface NleTimelineProps {
  project: Project;
  currentFrame: number;
  playing: boolean;
  audioPeaks: number[];
  onSelectFrame: (frame: number) => void;
  onPinKeyframe: () => void;
  onMoveKeyframe: (id: string, frame: number) => void;
  onBeginEdit: () => void;
  onEndEdit: () => void;
}

function chooseTickStep(frameWidth: number): number {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  return steps.find(step => step * frameWidth >= 52) || 500;
}

export default function NleTimeline(props: NleTimelineProps) {
  const {
    project,
    currentFrame,
    playing,
    audioPeaks,
    onSelectFrame,
    onPinKeyframe,
    onMoveKeyframe,
    onBeginEdit,
    onEndEdit,
  } = props;

  const duration = projectDuration(project);
  const keyframes = sortedKeyframes(project);
  const active = keyframeAt(project, currentFrame);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const scrubRef = useRef(false);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startFrame: number;
    pointerId: number;
  } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(900);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) setViewportWidth(width);
    });
    observer.observe(scroller);
    setViewportWidth(scroller.clientWidth);
    return () => observer.disconnect();
  }, []);

  const frameWidth = Math.max(
    5,
    Math.min(26, (Math.max(160, viewportWidth) - 18) / Math.max(1, duration)),
  );
  const contentWidth = Math.max(300, duration * frameWidth);
  const tickStep = chooseTickStep(frameWidth);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || playing) return;
    const x = (currentFrame - 1) * frameWidth;
    const left = scroller.scrollLeft;
    const right = left + scroller.clientWidth;
    if (x < left + 40 || x > right - 40) {
      scroller.scrollTo({
        left: Math.max(0, x - scroller.clientWidth / 2),
        behavior: 'smooth',
      });
    }
  }, [currentFrame, frameWidth, playing]);

  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const height = 46;
    canvas.width = Math.round(contentWidth * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${contentWidth}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, contentWidth, height);

    const audio = project.audio as AudioTrack | null | undefined;
    if (!audio || !audioPeaks.length) {
      ctx.fillStyle = 'rgba(151, 204, 190, 0.32)';
      ctx.font = '600 10px Manrope, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        audio ? 'Building waveform…' : 'No audio yet — add a track in the studio panel.',
        14,
        height / 2,
      );
      return;
    }

    const start = audio.offset * project.fps * frameWidth;
    const width = audio.duration * project.fps * frameWidth;
    const center = height / 2;
    const amplitude = height * 0.36;
    const buckets = Math.max(12, Math.min(audioPeaks.length, Math.floor(width / 2)));

    ctx.fillStyle = 'rgba(62, 230, 196, 0.1)';
    ctx.beginPath();
    ctx.roundRect(start, 3, width, height - 6, 5);
    ctx.fill();

    const gradient = ctx.createLinearGradient(start, 0, start + width, 0);
    gradient.addColorStop(0, 'rgba(62, 230, 196, 0.48)');
    gradient.addColorStop(0.55, '#57f5d2');
    gradient.addColorStop(1, 'rgba(62, 230, 196, 0.55)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let index = 0; index < buckets; index++) {
      const x = start + (index / Math.max(1, buckets - 1)) * width;
      const normalized = index / Math.max(1, buckets - 1);
      const peakIndex = Math.min(
        audioPeaks.length - 1,
        Math.floor(normalized * (audioPeaks.length - 1)),
      );
      const peak = audioPeaks[peakIndex] || 0;
      const y = Math.max(0.7, peak * amplitude);
      ctx.moveTo(x, center - y);
      ctx.lineTo(x, center + y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(214, 255, 246, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(start, center);
    ctx.lineTo(start + width, center);
    ctx.stroke();
  }, [audioPeaks, contentWidth, frameWidth, project.audio, project.fps]);

  const frameFromPointer = (clientX: number): number => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return currentFrame;
    const frame = Math.floor((clientX - rect.left) / frameWidth) + 1;
    return Math.max(1, Math.min(duration, frame));
  };

  const startScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubRef.current = true;
    onSelectFrame(frameFromPointer(event.clientX));
  };

  const moveScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubRef.current) return;
    onSelectFrame(frameFromPointer(event.clientX));
  };

  const endScrub = () => {
    scrubRef.current = false;
  };

  const startKeyDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    id: string,
    frame: number,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      startX: event.clientX,
      startFrame: frame,
      pointerId: event.pointerId,
    };
    onBeginEdit();
  };

  const moveKeyDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.stopPropagation();
    const delta = Math.round((event.clientX - drag.startX) / frameWidth);
    onMoveKeyframe(drag.id, drag.startFrame + delta);
  };

  const endKeyDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    event.stopPropagation();
    dragRef.current = null;
    onEndEdit();
  };

  const ticks: number[] = [];
  for (let frame = 1; frame <= duration; frame += tickStep) ticks.push(frame);
  if (ticks[ticks.length - 1] !== duration) ticks.push(duration);

  return (
    <div className="nle-timeline">
      <div className="nle-toolbar">
        <span className="nle-mode-label"><Icon name="video" size={14} /> Frame timeline</span>
        <span className="nle-toolbar-hint">Drag keyframes to retime · click anywhere to scrub</span>
        <button
          type="button"
          className="nle-pin-btn"
          onClick={onPinKeyframe}
          disabled={!!active}
          title={active ? 'This frame is already a keyframe' : 'Pin the current frame as a keyframe'}
        >
          <Icon name="pin" size={14} /> Pin at playhead
        </button>
      </div>

      <div className="nle-grid">
        <div className="nle-labels">
          <div className="nle-label-spacer">FRAME</div>
          <div className="nle-label"><span className="nle-track-dot nle-track-dot--video" /> VIDEO</div>
          <div className="nle-label"><span className="nle-track-dot nle-track-dot--audio" /> AUDIO</div>
        </div>

        <div className="nle-scroll" ref={scrollRef}>
          <div
            className="nle-content"
            ref={contentRef}
            style={{ width: `${contentWidth}px` }}
            onPointerDown={startScrub}
            onPointerMove={moveScrub}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
          >
            <div className="nle-ruler">
              {ticks.map(frame => (
                <span
                  key={frame}
                  className="nle-tick"
                  style={{ left: `${(frame - 1) * frameWidth}px` }}
                >
                  <i />
                  <b>{frame}</b>
                </span>
              ))}
            </div>

            <div className="nle-track nle-track--video">
              {keyframes.slice(0, -1).map((keyframe, index) => {
                const next = keyframes[index + 1];
                return (
                  <span
                    key={`span-${keyframe.id}`}
                    className={`nle-span ${project.autoTween ? '' : 'is-cut'}`}
                    style={{
                      left: `${(keyframe.at - 1) * frameWidth + 8}px`,
                      width: `${Math.max(4, (next.at - keyframe.at) * frameWidth - 16)}px`,
                    }}
                  />
                );
              })}
              {keyframes.map(keyframe => (
                <button
                  key={keyframe.id}
                  type="button"
                  className={`nle-key ${keyframe.at === currentFrame ? 'is-current' : ''}`}
                  style={{ left: `${(keyframe.at - 1) * frameWidth}px` }}
                  onPointerDown={event => startKeyDrag(event, keyframe.id, keyframe.at)}
                  onPointerMove={moveKeyDrag}
                  onPointerUp={endKeyDrag}
                  onPointerCancel={endKeyDrag}
                  title={`Keyframe ${keyframe.at} · drag to retime`}
                >
                  <span>{keyframe.at}</span>
                </button>
              ))}
            </div>

            <div className="nle-track nle-track--audio">
              <canvas ref={waveformRef} className="nle-waveform" aria-hidden="true" />
              {project.audio && (
                <span
                  className="nle-audio-label"
                  style={{ left: `${project.audio.offset * project.fps * frameWidth + 10}px` }}
                >
                  {project.audio.name} · {formatAudioTime(project.audio.duration)}
                </span>
              )}
            </div>

            <div
              className={`nle-playhead ${playing ? 'is-playing' : ''}`}
              style={{ left: `${(currentFrame - 1) * frameWidth}px` }}
            >
              <span className="nle-playhead-grip" />
              <span className="nle-playhead-line" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

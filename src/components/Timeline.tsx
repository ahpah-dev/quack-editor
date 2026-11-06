import { useEffect, useRef, useState } from 'react';
import type { AudioTrack, Project, ShapeObject } from '../types';
import { keyframeAt, projectDuration, sortedKeyframes } from '../model/project';
import { renderThumbnail } from '../model/render';
import { Icon } from './Icons';
import NleTimeline from './NleTimeline';

interface TimelineProps {
  project: Project;
  currentFrame: number;
  playing: boolean;
  canAdd: boolean;
  mode: 'cards' | 'nle';
  audio: AudioTrack | null;
  audioPeaks: number[];
  onModeChange: (mode: 'cards' | 'nle') => void;
  onSelectFrame: (frame: number) => void;
  onTogglePlay: () => void;
  onAddFrame: () => void;
  onExtend: (frames: number) => void;
  onPinKeyframe: () => void;
  onMoveKeyframe: (id: string, frame: number) => void;
  onBeginEdit: () => void;
  onEndEdit: () => void;
  onDeleteKeyframe: () => void;
}

function KeyframeThumb({
  project,
  objects,
}: {
  project: Project;
  objects: ShapeObject[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) renderThumbnail(ref.current, project, objects, 48, 27);
  }, [objects, project]);

  return <canvas ref={ref} className="keyframe-thumb" aria-hidden="true" />;
}

export default function Timeline(props: TimelineProps) {
  const {
    project,
    currentFrame,
    playing,
    canAdd,
    mode,
    audioPeaks,
    onModeChange,
    onSelectFrame,
    onTogglePlay,
    onAddFrame,
    onExtend,
    onPinKeyframe,
    onMoveKeyframe,
    onBeginEdit,
    onEndEdit,
    onDeleteKeyframe,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const extendRef = useRef<HTMLDivElement>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendAmount, setExtendAmount] = useState('24');
  const duration = projectDuration(project);
  const keyframes = sortedKeyframes(project);
  const activeKeyframe = keyframeAt(project, currentFrame);
  const keyframeByFrame = new Map(keyframes.map(keyframe => [keyframe.at, keyframe]));

  useEffect(() => {
    const scroller = scrollRef.current;
    const element = currentRef.current;
    if (!scroller || !element) return;
    const target = element.offsetLeft - scroller.clientWidth / 2 + element.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [currentFrame]);

  useEffect(() => {
    if (!extendOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!extendRef.current?.contains(event.target as Node)) setExtendOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExtendOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [extendOpen]);

  const applyExtend = (value: number) => {
    const amount = Math.max(1, Math.min(2000, Math.round(value)));
    if (!Number.isFinite(amount)) return;
    onExtend(amount);
    setExtendOpen(false);
  };

  const customAmount = Number(extendAmount);
  const customValid = Number.isFinite(customAmount) && customAmount >= 1;

  const cells = [];
  for (let frame = 1; frame <= duration; frame++) {
    const keyframe = keyframeByFrame.get(frame);
    const current = frame === currentFrame;
    if (keyframe) {
      cells.push(
        <button
          key={frame}
          ref={current ? currentRef : null}
          type="button"
          className={`timeline-key ${current ? 'is-current' : ''}`}
          onClick={() => onSelectFrame(frame)}
          title={`Keyframe ${frame}`}
        >
          <KeyframeThumb project={project} objects={keyframe.objects} />
          <span className="timeline-key-meta">
            <strong>{frame}</strong>
            <span>KEY</span>
          </span>
        </button>,
      );
    } else {
      const isHold = !project.autoTween || frame > keyframes[keyframes.length - 1]?.at;
      cells.push(
        <button
          key={frame}
          ref={current ? currentRef : null}
          type="button"
          className={`timeline-tween ${current ? 'is-current' : ''} ${isHold ? 'is-hold' : ''}`}
          onClick={() => onSelectFrame(frame)}
          title={`Frame ${frame}${isHold ? (project.autoTween ? ' · hold' : ' · hard cut') : ' · auto in-between'}`}
          aria-label={`Frame ${frame}`}
        >
          <span />
        </button>,
      );
    }
  }

  return (
    <section className="timeline" aria-label="Motion timeline">
      <div className="timeline-top">
        <div className="timeline-heading">
          <span className="eyebrow">Motion timeline</span>
          <div className="timeline-title-row">
            <h2>
              {keyframes.length} keyframe{keyframes.length === 1 ? '' : 's'}
            </h2>
            <span className="timeline-frame-count">{duration} frames</span>
            {project.autoTween && (
              <span className="auto-badge">
                <span className="live-dot" />
                Auto tween
              </span>
            )}
            {activeKeyframe ? (
              <span className="position-badge">Editing keyframe</span>
            ) : (
              <span className="position-badge position-badge--preview">Preview</span>
            )}
            <div className="timeline-mode-switch" role="group" aria-label="Timeline view">
              <button
                type="button"
                className={mode === 'cards' ? 'is-active' : ''}
                onClick={() => onModeChange('cards')}
              >
                Cards
              </button>
              <button
                type="button"
                className={mode === 'nle' ? 'is-active' : ''}
                onClick={() => onModeChange('nle')}
              >
                <Icon name="video" size={12} /> Timeline
              </button>
            </div>
          </div>
        </div>

        <div className="timeline-actions">
          <div className="transport">
            <button
              type="button"
              className="icon-btn"
              onClick={() => onSelectFrame(Math.max(1, currentFrame - 1))}
              disabled={currentFrame <= 1}
              title="Previous frame"
            >
              <Icon name="back" size={16} />
            </button>
            <span className="frame-readout">
              Frame <strong>{String(currentFrame).padStart(2, '0')}</strong>
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onSelectFrame(Math.min(duration, currentFrame + 1))}
              disabled={currentFrame >= duration}
              title="Next frame"
            >
              <Icon name="forward" size={16} />
            </button>
          </div>

          <button
            type="button"
            className={`play-btn ${playing ? 'is-playing' : ''}`}
            onClick={onTogglePlay}
            title={playing ? 'Pause' : 'Play'}
          >
            <Icon name={playing ? 'pause' : 'play'} size={15} />
            {playing ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            className="icon-btn danger-hover"
            onClick={onDeleteKeyframe}
            disabled={!activeKeyframe || keyframes.length <= 1}
            title="Delete keyframe"
          >
            <Icon name="trash" size={16} />
          </button>

          <div className="extend-wrap" ref={extendRef}>
            <button
              type="button"
              className="extend-btn"
              onClick={() => setExtendOpen(open => !open)}
              aria-haspopup="dialog"
              aria-expanded={extendOpen}
              title="Add more frames to the end of the animation"
            >
              <Icon name="plus" size={14} />
              Extend
            </button>

            {extendOpen && (
              <div className="extend-popover" role="dialog" aria-label="Extend animation">
                <span className="eyebrow">Extend animation</span>
                <strong className="extend-title">Add more screen time</strong>
                <p>Current end · frame {duration}</p>

                <div className="extend-presets">
                  {[12, 24, 48, 96].map(amount => (
                    <button key={amount} type="button" onClick={() => applyExtend(amount)}>
                      <span>+{amount}</span>
                      <small>frames</small>
                    </button>
                  ))}
                </div>

                <div className="extend-custom">
                  <label>
                    <span>Custom</span>
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={extendAmount}
                      onChange={event => setExtendAmount(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && customValid) applyExtend(customAmount);
                      }}
                      aria-label="Custom frames to extend"
                    />
                    <small>frames</small>
                  </label>
                  <button
                    type="button"
                    className="extend-apply"
                    onClick={() => applyExtend(customAmount)}
                    disabled={!customValid}
                  >
                    Extend
                  </button>
                </div>

                <div className="extend-preview">
                  New end · frame {duration + (customValid ? Math.round(customAmount) : 0)}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="add-frame-btn"
            onClick={onAddFrame}
            disabled={!canAdd}
            title="Copy this moment forward and auto-animate the gap"
          >
            <Icon name="plus" size={16} />
            Add frame
          </button>
        </div>
      </div>

      {mode === 'nle' ? (
        <NleTimeline
          project={project}
          currentFrame={currentFrame}
          playing={playing}
          audioPeaks={audioPeaks}
          onSelectFrame={onSelectFrame}
          onPinKeyframe={onPinKeyframe}
          onMoveKeyframe={onMoveKeyframe}
          onBeginEdit={onBeginEdit}
          onEndEdit={onEndEdit}
        />
      ) : (
        <div className="timeline-strip-wrap">
          <div className="timeline-strip" ref={scrollRef}>
            {cells}
          </div>
        </div>
      )}

      <div className="timeline-footer">
        <span>
          {mode === 'nle'
            ? 'Drag keyframes to retime them against the audio. Click the ruler to move the playhead.'
            : activeKeyframe
              ? project.autoTween ? 'Click any frame to scrub. Edit a keyframe and the in-betweens follow.' : 'Auto Tween is off. Frames cut straight between keyframes.'
              : 'You are previewing an automatic in-between. Pin it to make it editable.'}
        </span>
        <span className="timeline-shortcuts">
          <kbd>Space</kbd> play
          <kbd>←</kbd><kbd>→</kbd> step
        </span>
      </div>
    </section>
  );
}

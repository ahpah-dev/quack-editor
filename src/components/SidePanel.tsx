import type { Project, ShapeObject } from '../types';
import { toHex } from '../model/colors';
import { normalizeDegrees, objectBounds, unionBounds } from '../model/geometry';
import { formatAudioTime } from '../model/audio';
import { Icon } from './Icons';

interface SidePanelProps {
  className?: string;
  project: Project;
  frame: number;
  activeKeyframe: { id: string; at: number; objects: ShapeObject[] } | null;
  selectedObjects: ShapeObject[];
  fillColor: string;
  strokeColor: string;
  onFillColorChange: (color: string) => void;
  onStrokeColorChange: (color: string) => void;
  onionSkin: boolean;
  onionRange: number;
  onToggleOnionSkin: (enabled: boolean) => void;
  onOnionRangeChange: (range: number) => void;
  onUpdateProject: (patch: Partial<Project>) => void;
  onUpdateSelected: (patch: Partial<ShapeObject>) => void;
  onRotateSelection: (degrees: number) => void;
  onAddAudio: () => void;
  onRemoveAudio: () => void;
  onAudioVolumeChange: (volume: number) => void;
  onAudioOffsetChange: (frames: number) => void;
  audioBusy: boolean;
  onAddFrame: () => void;
  onPinKeyframe: () => void;
  onDeleteKeyframe: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  canAdd: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <div className={`toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span>
        <span className="toggle-label">{label}</span>
        <span className="toggle-hint">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className="toggle-track"><span className="toggle-thumb" /></span>
      </button>
    </div>
  );
}

function ColorRow({
  label,
  value,
  enabled,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  enabled: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className={`style-color-row ${enabled ? '' : 'is-off'}`}>
      <label className="style-swatch">
        <span style={{ background: enabled ? value : 'transparent' }} />
        <input
          type="color"
          value={toHex(value)}
          onChange={event => onChange(event.target.value)}
          disabled={!enabled}
        />
      </label>
      <span className="style-color-label">{label}</span>
      <code>{enabled ? value.toUpperCase() : 'NONE'}</code>
      <button
        type="button"
        className={`mini-power ${enabled ? 'is-on' : ''}`}
        onClick={onToggle}
        title={enabled ? `Disable ${label.toLowerCase()}` : `Enable ${label.toLowerCase()}`}
        aria-label={enabled ? `Disable ${label.toLowerCase()}` : `Enable ${label.toLowerCase()}`}
      >
        <span />
      </button>
    </div>
  );
}

export default function SidePanel(props: SidePanelProps) {
  const {
    className,
    project,
    frame,
    activeKeyframe,
    selectedObjects,
    fillColor,
    strokeColor,
    onFillColorChange,
    onStrokeColorChange,
    onionSkin,
    onionRange,
    onToggleOnionSkin,
    onOnionRangeChange,
    onUpdateProject,
    onUpdateSelected,
    onRotateSelection,
    onAddAudio,
    onRemoveAudio,
    onAudioVolumeChange,
    onAudioOffsetChange,
    audioBusy,
    onAddFrame,
    onPinKeyframe,
    onDeleteKeyframe,
    onDuplicateSelected,
    onDeleteSelected,
    canAdd,
  } = props;

  const nextFrame = Math.min(999, frame + project.gap);
  const selectedObject = selectedObjects[0] || null;
  const selectionCount = selectedObjects.length;
  const multi = selectionCount > 1;
  const bounds = selectedObjects.length
    ? unionBounds(selectedObjects.map(object => objectBounds(object)))
    : null;

  return (
    <aside className={`side-panel ${className || ''}`} aria-label="Studio controls">
      <div className="panel-intro">
        <span className="eyebrow">Quack studio</span>
        <h1>Motion,<br /><em>minus the maze.</em></h1>
        <p>Draw. Add a frame. Change the copy. The middle handles itself.</p>
      </div>

      <section className="panel-card motion-card">
        <div className="card-heading">
          <span className="card-icon card-icon--spark"><Icon name="sparkle" size={17} /></span>
          <div>
            <h2>Auto animate</h2>
            <p>Every gap becomes an in-between.</p>
          </div>
        </div>

        <Toggle
          checked={project.autoTween}
          onChange={next => onUpdateProject({ autoTween: next })}
          label="Auto Tween"
          hint="Generate frames between keyframes."
        />
        <Toggle
          checked={project.shapeMorph}
          onChange={next => onUpdateProject({ shapeMorph: next })}
          label="Shape Morph"
          hint="Blend outlines, not just positions."
          disabled={!project.autoTween}
        />
        <Toggle
          checked={onionSkin}
          onChange={onToggleOnionSkin}
          label="Onion skin"
          hint="Ghost the frames around the playhead."
        />

        {onionSkin && (
          <div className="gap-control onion-control">
            <div className="gap-label">
              <span>Onion range</span>
              <strong>±{onionRange}</strong>
            </div>
            <div className="segmented" role="group" aria-label="Onion skin range">
              {[1, 2, 3].map(range => (
                <button
                  key={range}
                  type="button"
                  className={onionRange === range ? 'is-active' : ''}
                  onClick={() => onOnionRangeChange(range)}
                >
                  ±{range}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="gap-control">
          <div className="gap-label">
            <span>Space between frames</span>
            <strong>{project.gap} frames</strong>
          </div>
          <div className="segmented" role="group" aria-label="Space between frames">
            {[4, 6, 8, 12, 16].map(gap => (
              <button
                key={gap}
                type="button"
                className={project.gap === gap ? 'is-active' : ''}
                onClick={() => onUpdateProject({ gap })}
                disabled={!project.autoTween}
              >
                {gap}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="panel-add" onClick={onAddFrame} disabled={!canAdd}>
          <span className="panel-add-plus">+</span>
          <span>
            <strong>Add frame</strong>
            <small>{project.autoTween ? `Next keyframe around ${nextFrame}` : `Hard cut at ${nextFrame}`}</small>
          </span>
          <Icon name="forward" size={16} />
        </button>
      </section>

      <section className="panel-card audio-card">
        <div className="card-heading">
          <span className="card-icon card-icon--audio"><Icon name="music" size={16} /></span>
          <div>
            <h2>Audio</h2>
            <p>Bring your own track and sync it on the timeline.</p>
          </div>
        </div>

        {project.audio ? (
          <>
            <div className="audio-file-row">
              <span className="audio-file-icon"><Icon name="music" size={17} /></span>
              <span className="audio-file-copy">
                <strong>{project.audio.name}</strong>
                <small>{formatAudioTime(project.audio.duration)} · starts at frame {Math.round(project.audio.offset * project.fps) + 1}</small>
              </span>
              <button type="button" className="icon-btn" onClick={onRemoveAudio} aria-label="Remove audio">
                <Icon name="trash" size={14} />
              </button>
            </div>

            <div className="audio-control">
              <div className="audio-control-label">
                <span>Volume</span>
                <strong>{Math.round(project.audio.volume * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(project.audio.volume * 100)}
                onChange={event => onAudioVolumeChange(Number(event.target.value) / 100)}
                aria-label="Audio volume"
              />
            </div>

            <div className="audio-control audio-offset">
              <div className="audio-control-label">
                <span>Start at</span>
                <strong>frame {Math.round(project.audio.offset * project.fps) + 1}</strong>
              </div>
              <input
                type="number"
                min="1"
                max="9999"
                value={Math.max(1, Math.round(project.audio.offset * project.fps) + 1)}
                onChange={event =>
                  onAudioOffsetChange((Number(event.target.value) || 1) - 1)
                }
                aria-label="Audio start frame"
              />
            </div>

            <div className="audio-timeline-hint">
              <Icon name="wave" size={14} />
              Switch the timeline to Timeline view to line up the waveform.
            </div>

            <button type="button" className="soft-btn soft-btn--wide" onClick={onAddAudio} disabled={audioBusy}>
              <Icon name="music" size={14} /> {audioBusy ? 'Reading audio…' : 'Replace audio'}
            </button>
          </>
        ) : (
          <button type="button" className="audio-add" onClick={onAddAudio} disabled={audioBusy}>
            <span className="audio-add-icon"><Icon name="plus" size={18} /></span>
            <span>
              <strong>{audioBusy ? 'Reading audio…' : 'Add audio track'}</strong>
              <small>MP3, WAV, M4A, or OGG · under 25 MB</small>
            </span>
            <Icon name="forward" size={15} />
          </button>
        )}
      </section>

      {selectedObject && activeKeyframe ? (
        <section className="panel-card style-card">
          <div className="card-heading">
            <span className="card-icon"><Icon name={multi ? 'select' : selectedObject.kind === 'text' ? 'text' : 'brush'} size={16} /></span>
            <div>
              <h2>{multi ? `${selectionCount} parts selected` : selectedObject.kind === 'text' ? 'Text' : 'Shape'}</h2>
              <p>{multi ? 'Styles apply to the whole selection.' : `${Math.round(bounds?.width || 0)} × ${Math.round(bounds?.height || 0)} px`}</p>
            </div>
          </div>

          {multi && (
            <div className="multi-hint">
              <Icon name="select" size={14} />
              Drag to move the group. Shift-click to add or remove parts.
            </div>
          )}

          {!multi && selectedObject.kind === 'text' && (
            <div className="text-fields">
              <label>
                <span>Words</span>
                <input
                  type="text"
                  value={selectedObject.text || ''}
                  onChange={event => onUpdateSelected({ text: event.target.value })}
                  placeholder="Type something..."
                />
              </label>
              <label className="range-row">
                <span>Size</span>
                <input
                  type="range"
                  min="14"
                  max="180"
                  step="1"
                  value={selectedObject.fontSize || 64}
                  onChange={event => onUpdateSelected({ fontSize: Number(event.target.value) })}
                />
                <strong>{Math.round(selectedObject.fontSize || 64)}</strong>
              </label>
            </div>
          )}

          <ColorRow
            label="Fill"
            value={selectedObject.fill || fillColor}
            enabled={!!selectedObject.fill}
            onChange={value => onUpdateSelected({ fill: value })}
            onToggle={() =>
              onUpdateSelected({ fill: selectedObject.fill ? null : fillColor })
            }
          />
          <ColorRow
            label="Stroke"
            value={selectedObject.stroke || strokeColor}
            enabled={!!selectedObject.stroke}
            onChange={value => onUpdateSelected({ stroke: value })}
            onToggle={() =>
              onUpdateSelected({
                stroke: selectedObject.stroke ? null : strokeColor,
                strokeWidth: selectedObject.stroke ? selectedObject.strokeWidth : Math.max(2, selectedObject.strokeWidth),
              })
            }
          />

          <label className="range-row">
            <span>Stroke</span>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={selectedObject.strokeWidth}
              onChange={event => onUpdateSelected({ strokeWidth: Number(event.target.value) })}
            />
            <strong>{selectedObject.strokeWidth}</strong>
          </label>

          <label className="range-row">
            <span>Opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedObject.opacity}
              onChange={event => onUpdateSelected({ opacity: Number(event.target.value) })}
            />
            <strong>{Math.round(selectedObject.opacity * 100)}%</strong>
          </label>

          <div className="rotate-block">
            <div className="rotate-label">
              <span>Rotate</span>
              <strong>
                {multi ? 'Group' : `${Math.round(normalizeDegrees(selectedObject.rotation || 0))}°`}
              </strong>
            </div>
            <div className="rotate-buttons">
              <button type="button" onClick={() => onRotateSelection(-90)} title="Rotate 90° left">−90°</button>
              <button type="button" onClick={() => onRotateSelection(-15)} title="Rotate 15° left">−15°</button>
              <button type="button" onClick={() => onRotateSelection(15)} title="Rotate 15° right">+15°</button>
              <button type="button" onClick={() => onRotateSelection(90)} title="Rotate 90° right">+90°</button>
            </div>
            <small>Or drag the round handle above the selection.</small>
          </div>

          <div className="geometry-row">
            <span>X <strong>{Math.round(bounds?.x || 0)}</strong></span>
            <span>Y <strong>{Math.round(bounds?.y || 0)}</strong></span>
            <span>W <strong>{Math.round(bounds?.width || 0)}</strong></span>
            <span>H <strong>{Math.round(bounds?.height || 0)}</strong></span>
          </div>

          <div className="style-actions">
            <button type="button" className="soft-btn" onClick={onDuplicateSelected}>
              <Icon name="copy" size={14} /> {multi ? 'Duplicate all' : 'Duplicate'}
            </button>
            <button type="button" className="soft-btn soft-btn--danger" onClick={onDeleteSelected}>
              <Icon name="trash" size={14} /> {multi ? 'Delete all' : 'Delete'}
            </button>
          </div>
        </section>
      ) : (
        <section className="panel-card selection-card">
          <div className="card-heading">
            <span className="card-icon"><Icon name="select" size={16} /></span>
            <div>
              <h2>{activeKeyframe ? 'Keyframe' : project.autoTween ? 'In-between' : 'Hold frame'}</h2>
              <p>{activeKeyframe ? `Frame ${activeKeyframe.at} is editable.` : project.autoTween ? `Frame ${frame} is generated.` : `Frame ${frame} holds the previous keyframe.`}</p>
            </div>
          </div>

          {activeKeyframe ? (
            <>
              <div className="selection-hint">
                <Icon name="select" size={18} />
                <div>
                  <strong>Pick a shape to style it.</strong>
                  <span>Or grab a corner handle to resize.</span>
                </div>
              </div>
              <div className="selection-stats">
                <span><strong>{activeKeyframe.objects.length}</strong> object{activeKeyframe.objects.length === 1 ? '' : 's'}</span>
                <span>Frame <strong>{String(activeKeyframe.at).padStart(2, '0')}</strong></span>
              </div>
              <button
                type="button"
                className="soft-btn soft-btn--wide"
                onClick={onDeleteKeyframe}
                disabled={project.keyframes.length <= 1}
              >
                <Icon name="trash" size={14} /> Delete this keyframe
              </button>
            </>
          ) : (
            <>
              <div className="selection-hint selection-hint--amber">
                <Icon name="pin" size={18} />
                <div>
                  <strong>{project.autoTween ? 'This frame is auto-generated.' : 'This frame is a hold.'}</strong>
                  <span>{project.autoTween ? 'Pin it to make changes here, or edit either keyframe.' : 'Pin it to make an editable copy of the held moment.'}</span>
                </div>
              </div>
              <button type="button" className="soft-btn soft-btn--wide" onClick={onPinKeyframe}>
                <Icon name="pin" size={14} /> Pin keyframe here
              </button>
            </>
          )}
        </section>
      )}

      <section className="panel-card project-card">
        <details>
          <summary>
            <span><Icon name="settings" size={15} /> Canvas &amp; playback</span>
            <Icon name="chevron" size={15} />
          </summary>
          <div className="project-fields">
            <label>
              <span>Width</span>
              <input
                key={`w-${project.width}`}
                type="number"
                defaultValue={project.width}
                min="64"
                max="4000"
                onBlur={event => {
                  const value = Math.max(64, Math.min(4000, Number(event.target.value) || 960));
                  onUpdateProject({ width: value });
                }}
              />
            </label>
            <label>
              <span>Height</span>
              <input
                key={`h-${project.height}`}
                type="number"
                defaultValue={project.height}
                min="64"
                max="4000"
                onBlur={event => {
                  const value = Math.max(64, Math.min(4000, Number(event.target.value) || 540));
                  onUpdateProject({ height: value });
                }}
              />
            </label>
            <label>
              <span>FPS</span>
              <input
                key={`f-${project.fps}`}
                type="number"
                defaultValue={project.fps}
                min="1"
                max="60"
                onBlur={event => {
                  const value = Math.max(1, Math.min(60, Number(event.target.value) || 24));
                  onUpdateProject({ fps: value });
                }}
              />
            </label>
            <label className="project-bg">
              <span>Paper</span>
              <input
                type="color"
                value={toHex(project.background, '#fffdf4')}
                onChange={event => onUpdateProject({ background: event.target.value })}
              />
            </label>
          </div>
          <Toggle
            checked={project.loop}
            onChange={next => onUpdateProject({ loop: next })}
            label="Loop playback"
            hint="Start over at the end."
          />
        </details>
      </section>

      <footer className="panel-footer">
        <span className="footer-duck">Q</span>
        <span>
          Quack Editor <strong>1.5</strong><br />
          <small>From scratch · Unlicense</small>
        </span>
        <a
          href="https://github.com/ahpah-dev/quack-editor"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source
        </a>
      </footer>
    </aside>
  );
}

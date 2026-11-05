import { useEffect, useRef, useState } from 'react';
import { DuckMark, Icon } from './Icons';

interface TopBarProps {
  projectName: string;
  canUndo: boolean;
  canRedo: boolean;
  savedLabel: string;
  onRename: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExport: () => void;
  onToggleControls: () => void;
}

export default function TopBar(props: TopBarProps) {
  const {
    projectName,
    canUndo,
    canRedo,
    savedLabel,
    onRename,
    onUndo,
    onRedo,
    onNew,
    onOpen,
    onSave,
    onExport,
    onToggleControls,
  } = props;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(projectName), [projectName]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const finishRename = () => {
    const next = draft.trim() || 'Untitled Quack';
    setEditing(false);
    if (next !== projectName) onRename(next);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <DuckMark size={40} />
        <div className="wordmark">
          <span className="wordmark-name">Quack<span>Editor</span></span>
          <span className="wordmark-tag">Motion, minus the maze.</span>
        </div>
      </div>

      <div className="project-pill-wrap">
        {editing ? (
          <input
            ref={inputRef}
            className="project-name-input"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onBlur={finishRename}
            onKeyDown={event => {
              if (event.key === 'Enter') finishRename();
              if (event.key === 'Escape') {
                setDraft(projectName);
                setEditing(false);
              }
            }}
            maxLength={48}
          />
        ) : (
          <button type="button" className="project-pill" onClick={() => setEditing(true)}>
            <span className="project-dot" />
            <span>{projectName}</span>
            <Icon name="chevron" size={12} />
          </button>
        )}
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="mobile-controls-button"
          onClick={onToggleControls}
          aria-label="Open studio controls"
          title="Studio controls"
        >
          <Icon name="settings" size={17} />
        </button>
        <div className="history-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Icon name="undo" size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Icon name="redo" size={16} />
          </button>
        </div>
        <span className="saved-state">{savedLabel}</span>
        <button type="button" className="top-action" onClick={onNew} title="New project">
          <Icon name="plus" size={15} /><span>New</span>
        </button>
        <button type="button" className="top-action" onClick={onOpen} title="Open .quack project">
          <Icon name="folder" size={15} /><span>Open</span>
        </button>
        <button type="button" className="top-action" onClick={onSave} title="Save project (Ctrl+S)">
          <Icon name="save" size={15} /><span>Save</span>
        </button>
        <button type="button" className="top-action top-action--primary" onClick={onExport} title="Export animation">
          <Icon name="download" size={15} /><span>Export</span>
        </button>
      </div>
    </header>
  );
}

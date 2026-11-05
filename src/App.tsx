import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Notice, Project, ShapeObject, Tool } from './types';
import { useProjectHistory } from './hooks/useProjectHistory';
import {
  createDemoProject,
  createEmptyProject,
  keyframeAt,
  parseProjectFile,
  projectDuration,
  serializeProject,
  uniqueKeyframePosition,
  updateKeyframe,
} from './model/project';
import { sceneAt, sceneHasContent } from './model/animation';
import { uid } from './model/geometry';
import { renderProjectFrame } from './model/render';
import { downloadBlob, exportFramePng, readFileAsText, saveProjectFile, slugify } from './utils/files';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import CanvasStage from './components/CanvasStage';
import Timeline from './components/Timeline';
import SidePanel from './components/SidePanel';
import Welcome from './components/Welcome';
import ExportModal from './components/ExportModal';
import NewProjectModal from './components/NewProjectModal';
import Toasts from './components/Toasts';

const AUTOSAVE_KEY = 'quack.project.v1';
const WELCOME_KEY = 'quack.welcome.v1';

function loadAutosave(): Project | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return parseProjectFile(raw);
  } catch (error) {
    console.warn('Could not restore Quack autosave.', error);
    return null;
  }
}

function normalizedObjects(objects: ShapeObject[]): ShapeObject[] {
  const byId = new Map<string, ShapeObject>();
  objects.forEach(object => {
    const cleanId = object.id.replace(/-(out|in)$/, '');
    const clean = {
      ...object,
      id: cleanId,
      points: object.points.map(point => ({ ...point })),
    };
    const existing = byId.get(cleanId);
    if (!existing || clean.opacity > existing.opacity) byId.set(cleanId, clean);
  });
  return Array.from(byId.values());
}

export default function App() {
  const restoredRef = useRef<Project | null>(null);
  const initialProject = useMemo(() => {
    const restored = loadAutosave();
    restoredRef.current = restored;
    return restored || createEmptyProject();
  }, []);

  const history = useProjectHistory(initialProject);
  const {
    project,
    projectRef,
    canUndo,
    canRedo,
    commit,
    updateLive,
    replaceProject,
    beginTransaction,
    endTransaction,
    undo,
    redo,
  } = history;

  const [tool, setTool] = useState<Tool>('brush');
  const [fillColor, setFillColor] = useState('#ffd166');
  const [strokeColor, setStrokeColor] = useState('#0d4a3d');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [smoothDrawing, setSmoothDrawing] = useState(
    () => localStorage.getItem('quack.smoothDrawing.v1') !== 'false',
  );
  const [onionSkin, setOnionSkin] = useState(
    () => localStorage.getItem('quack.onionSkin.v1') === 'true',
  );
  const [onionRange, setOnionRange] = useState(() => {
    const stored = Number(localStorage.getItem('quack.onionRange.v1'));
    return Number.isFinite(stored) && stored >= 1 && stored <= 3 ? stored : 2;
  });
  const [playing, setPlaying] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(() => localStorage.getItem(WELCOME_KEY) !== 'yes');
  const [exportOpen, setExportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [savedLabel, setSavedLabel] = useState('Saved');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noticeId = useRef(1);

  const duration = projectDuration(project);
  const activeKeyframe = keyframeAt(project, currentFrame);
  const scene = useMemo(() => sceneAt(project, currentFrame), [project, currentFrame]);
  const selectedObjects = activeKeyframe
    ? activeKeyframe.objects.filter(object => selectedIds.includes(object.id))
    : [];
  const canAdd = sceneHasContent(scene);

  const notify = useCallback((message: string, tone: Notice['tone'] = 'mint') => {
    const id = noticeId.current++;
    setNotices(current => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setNotices(current => current.filter(notice => notice.id !== id));
    }, 3600);
  }, []);

  useEffect(() => {
    document.title = `${project.name} · Quack Editor`;
  }, [project.name]);

  useEffect(() => {
    setSavedLabel('Saving…');
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, serializeProject(projectRef.current));
        setSavedLabel('Saved just now');
      } catch {
        setSavedLabel('Local save unavailable');
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [project, projectRef]);

  useEffect(() => {
    if (restoredRef.current) {
      notify('Picked up exactly where you left off.', 'mint');
      restoredRef.current = null;
    }
  }, [notify]);

  useEffect(() => {
    if (currentFrame > duration) setCurrentFrame(duration);
  }, [currentFrame, duration]);

  useEffect(() => {
    if (!activeKeyframe) {
      if (selectedIds.length) setSelectedIds([]);
      return;
    }
    const valid = selectedIds.filter(id =>
      activeKeyframe.objects.some(object => object.id === id),
    );
    if (valid.length !== selectedIds.length) setSelectedIds(valid);
  }, [activeKeyframe, selectedIds]);

  useEffect(() => {
    localStorage.setItem('quack.smoothDrawing.v1', String(smoothDrawing));
  }, [smoothDrawing]);

  useEffect(() => {
    localStorage.setItem('quack.onionSkin.v1', String(onionSkin));
    localStorage.setItem('quack.onionRange.v1', String(onionRange));
  }, [onionRange, onionSkin]);

  useEffect(() => {
    if (!playing) return undefined;
    const interval = window.setInterval(() => {
      setCurrentFrame(frame => {
        const next = frame + 1;
        if (next <= duration) return next;
        if (project.loop) return 1;
        setPlaying(false);
        return duration;
      });
    }, 1000 / project.fps);
    return () => window.clearInterval(interval);
  }, [duration, playing, project.fps, project.loop]);

  const closeWelcome = () => {
    localStorage.setItem(WELCOME_KEY, 'yes');
    setWelcomeOpen(false);
  };

  const selectFrame = (frame: number) => {
    setPlaying(false);
    setCurrentFrame(Math.max(1, Math.min(duration, Math.round(frame))));
  };

  const togglePlay = () => {
    setSelectedIds([]);
    if (!playing && currentFrame >= duration) setCurrentFrame(1);
    setPlaying(value => !value);
  };

  const addFrame = () => {
    const objects = normalizedObjects(
      activeKeyframe ? activeKeyframe.objects : sceneAt(project, currentFrame),
    );
    if (!objects.length) {
      notify('Draw something first, then add a frame.', 'amber');
      return;
    }
    const target = uniqueKeyframePosition(project, currentFrame + project.gap);
    const keyframe = { id: uid('key'), at: target, objects };
    commit(draft => ({
      ...draft,
      keyframes: [...draft.keyframes, keyframe].sort((a, b) => a.at - b.at),
    }));
    setPlaying(false);
    setCurrentFrame(target);
    setSelectedIds([]);
    const inbetweens = Math.max(0, target - currentFrame - 1);
    notify(
      project.autoTween
        ? `Frame ${target} added with ${inbetweens} auto in-between${inbetweens === 1 ? '' : 's'}.`
        : `Frame ${target} added as a hard cut.`,
      'mint',
    );
  };

  const pinKeyframe = () => {
    if (activeKeyframe) return;
    const objects = normalizedObjects(sceneAt(project, currentFrame));
    const keyframe = { id: uid('key'), at: currentFrame, objects };
    commit(draft => ({
      ...draft,
      keyframes: [...draft.keyframes, keyframe].sort((a, b) => a.at - b.at),
    }));
    setSelectedIds([]);
    notify(`Pinned keyframe ${currentFrame}.`, 'mint');
  };

  const deleteKeyframe = () => {
    if (!activeKeyframe) return;
    if (project.keyframes.length <= 1) {
      notify('A project needs at least one keyframe.', 'amber');
      return;
    }
    const remaining = project.keyframes.filter(keyframe => keyframe.id !== activeKeyframe.id);
    commit(draft => ({ ...draft, keyframes: remaining }));
    const previous = remaining
      .filter(keyframe => keyframe.at < activeKeyframe.at)
      .sort((a, b) => b.at - a.at)[0];
    setSelectedIds([]);
    setCurrentFrame(previous?.at || remaining[0].at);
    notify(`Keyframe ${activeKeyframe.at} removed.`, 'ink');
  };

  const updateProject = (patch: Partial<Project>) => {
    commit(draft => ({ ...draft, ...patch }));
  };

  const updateSelected = (patch: Partial<ShapeObject>) => {
    if (!activeKeyframe || !selectedIds.length) return;
    const selected = new Set(selectedIds);
    commit(draft =>
      updateKeyframe(draft, activeKeyframe.id, keyframe => ({
        ...keyframe,
        objects: keyframe.objects.map(object =>
          selected.has(object.id) ? { ...object, ...patch } : object,
        ),
      })),
    );
  };

  const createObject = (object: ShapeObject) => {
    if (!activeKeyframe) return;
    commit(draft =>
      updateKeyframe(draft, activeKeyframe.id, keyframe => ({
        ...keyframe,
        objects: [...keyframe.objects, object],
      })),
    );
    setSelectedIds([object.id]);
    if (object.kind === 'text') {
      setTool('select');
    }
  };

  const updateObjectsPoints = (
    updates: Array<{ id: string; points: ShapeObject['points'] }>,
  ) => {
    if (!activeKeyframe || !updates.length) return;
    const byId = new Map(updates.map(update => [update.id, update.points]));
    updateLive(draft =>
      updateKeyframe(draft, activeKeyframe.id, keyframe => ({
        ...keyframe,
        objects: keyframe.objects.map(object =>
          byId.has(object.id) ? { ...object, points: byId.get(object.id)! } : object,
        ),
      })),
    );
  };

  const deleteObject = (id: string) => {
    if (!activeKeyframe) return;
    commit(draft =>
      updateKeyframe(draft, activeKeyframe.id, keyframe => ({
        ...keyframe,
        objects: keyframe.objects.filter(object => object.id !== id),
      })),
    );
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(item => item !== id));
    notify('Shape removed.', 'ink');
  };

  const duplicateSelected = () => {
    if (!activeKeyframe || !selectedObjects.length) return;
    const copies: ShapeObject[] = selectedObjects.map(selectedObject => ({
      ...selectedObject,
      id: uid(selectedObject.kind),
      points: selectedObject.points.map(point => ({ x: point.x + 24, y: point.y + 24 })),
    }));
    commit(draft =>
      updateKeyframe(draft, activeKeyframe.id, keyframe => ({
        ...keyframe,
        objects: [...keyframe.objects, ...copies],
      })),
    );
    setSelectedIds(copies.map(copy => copy.id));
    notify(`${copies.length} shape${copies.length === 1 ? '' : 's'} duplicated.`, 'mint');
  };

  const deleteSelected = () => {
    if (!activeKeyframe || !selectedIds.length) return;
    const selected = new Set(selectedIds);
    commit(draft =>
      updateKeyframe(draft, activeKeyframe.id, keyframe => ({
        ...keyframe,
        objects: keyframe.objects.filter(object => !selected.has(object.id)),
      })),
    );
    setSelectedIds([]);
    notify(`${selectedIds.length} shape${selectedIds.length === 1 ? '' : 's'} removed.`, 'ink');
  };

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedObjects.length || !activeKeyframe) return;
    const selected = new Set(selectedIds);
    commit(draft =>
      updateKeyframe(draft, activeKeyframe.id, keyframe => ({
        ...keyframe,
        objects: keyframe.objects.map(object =>
          selected.has(object.id)
            ? {
                ...object,
                points: object.points.map(point => ({ x: point.x + dx, y: point.y + dy })),
              }
            : object,
        ),
      })),
    );
  };

  const performUndo = () => {
    if (undo()) {
      setPlaying(false);
      setSelectedIds([]);
    } else {
      notify('Nothing to undo yet.', 'amber');
    }
  };

  const performRedo = () => {
    if (redo()) {
      setPlaying(false);
      setSelectedIds([]);
    } else {
      notify('Nothing to redo.', 'amber');
    }
  };

  const newProject = () => {
    replaceProject(createEmptyProject());
    setCurrentFrame(1);
    setSelectedIds([]);
    setPlaying(false);
    setNewOpen(false);
    setTool('brush');
    notify('Fresh pond. Go make a mark.', 'mint');
  };

  const loadDemo = () => {
    replaceProject(createDemoProject());
    setCurrentFrame(1);
    setSelectedIds([]);
    setPlaying(false);
    closeWelcome();
    setTool('select');
    notify('Duck demo loaded. Press play, or scrub the timeline.', 'mint');
  };

  const openProject = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const parsed = parseProjectFile(text);
      replaceProject(parsed);
      setCurrentFrame(1);
      setSelectedIds([]);
      setPlaying(false);
      notify(`Opened ${file.name}.`, 'mint');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not open that project.', 'coral');
    }
  };

  const saveProject = () => {
    saveProjectFile(project);
    setSavedLabel('Saved just now');
    notify('Project file saved.', 'mint');
  };

  const exportWebm = async () => {
    if (!('MediaRecorder' in window)) {
      setExportError('This browser cannot record WebM. Try the project file or a PNG frame.');
      return;
    }
    setExportError(null);
    setExporting(true);
    setExportProgress(0);

    const canvas = document.createElement('canvas');
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setExporting(false);
      setExportError('Could not create an export canvas.');
      return;
    }

    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
    const stream = canvas.captureStream(project.fps);
    const chunks: BlobPart[] = [];

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 7_000_000,
      });
      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };

      const finished = new Promise<void>(resolve => {
        recorder.onstop = () => resolve();
      });

      renderProjectFrame(ctx, project, 1);
      recorder.start(80);

      const frameDelay = 1000 / project.fps;
      for (let frame = 1; frame <= duration; frame++) {
        renderProjectFrame(ctx, project, frame);
        setExportProgress((frame / duration) * 100);
        await new Promise(resolve => window.setTimeout(resolve, frameDelay));
      }

      recorder.stop();
      await finished;
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      downloadBlob(blob, `${slugify(project.name)}.webm`);
      setExportProgress(100);
      setExporting(false);
      setExportOpen(false);
      notify('Motion clip exported as WebM.', 'mint');
    } catch (error) {
      stream.getTracks().forEach(track => track.stop());
      setExporting(false);
      setExportError('The browser stopped the recording. Try a shorter timeline or the PNG export.');
      console.error(error);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (inField) return;

      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) performRedo();
        else performUndo();
        return;
      }
      if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        performRedo();
        return;
      }
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
        return;
      }
      if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (command && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        if (activeKeyframe) {
          setSelectedIds(activeKeyframe.objects.map(object => object.id));
        }
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedIds.length) {
          event.preventDefault();
          deleteSelected();
        }
        return;
      }

      if (event.key.startsWith('Arrow')) {
        if (event.key === 'ArrowLeft' && !selectedIds.length) {
          event.preventDefault();
          selectFrame(currentFrame - 1);
        } else if (event.key === 'ArrowRight' && !selectedIds.length) {
          event.preventDefault();
          selectFrame(currentFrame + 1);
        } else if (selectedIds.length) {
          event.preventDefault();
          const amount = event.shiftKey ? 10 : 1;
          if (event.key === 'ArrowLeft') nudgeSelected(-amount, 0);
          if (event.key === 'ArrowRight') nudgeSelected(amount, 0);
          if (event.key === 'ArrowUp') nudgeSelected(0, -amount);
          if (event.key === 'ArrowDown') nudgeSelected(0, amount);
        }
        return;
      }

      if (event.key === 'Escape') {
        setSelectedIds([]);
        setPlaying(false);
        setControlsOpen(false);
        return;
      }

      const shortcuts: Record<string, Tool> = {
        v: 'select',
        b: 'brush',
        l: 'line',
        r: 'rect',
        o: 'ellipse',
        s: 'star',
        t: 'text',
        e: 'eraser',
        h: 'pan',
      };
      const nextTool = shortcuts[event.key.toLowerCase()];
      if (nextTool && !command) setTool(nextTool);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="app">
      <TopBar
        projectName={project.name}
        canUndo={canUndo}
        canRedo={canRedo}
        savedLabel={savedLabel}
        onRename={name => updateProject({ name })}
        onUndo={performUndo}
        onRedo={performRedo}
        onNew={() => setNewOpen(true)}
        onOpen={() => fileInputRef.current?.click()}
        onSave={saveProject}
        onExport={() => setExportOpen(true)}
        onToggleControls={() => setControlsOpen(open => !open)}
      />

      <div className="workspace">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          undo={performUndo}
          redo={performRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <main className="studio">
          <CanvasStage
            project={project}
            frame={currentFrame}
            scene={scene}
            tool={tool}
            setTool={setTool}
            editable={!!activeKeyframe}
            onionSkin={onionSkin && !playing}
            onionRange={onionRange}
            selectedIds={selectedIds}
            selectedObjects={selectedObjects}
            fillColor={fillColor}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            smoothDrawing={smoothDrawing}
            onFillColorChange={setFillColor}
            onStrokeColorChange={setStrokeColor}
            onStrokeWidthChange={setStrokeWidth}
            onSmoothDrawingChange={setSmoothDrawing}
            onSelectionChange={setSelectedIds}
            onCreateObject={createObject}
            onUpdateObjectsPoints={updateObjectsPoints}
            onBeginEdit={beginTransaction}
            onEndEdit={endTransaction}
            onDeleteObject={deleteObject}
            onPinKeyframe={pinKeyframe}
          />

          <Timeline
            project={project}
            currentFrame={currentFrame}
            playing={playing}
            canAdd={canAdd}
            onSelectFrame={selectFrame}
            onTogglePlay={togglePlay}
            onAddFrame={addFrame}
            onDeleteKeyframe={deleteKeyframe}
          />
        </main>

        <div
          className={`panel-scrim ${controlsOpen ? 'is-open' : ''}`}
          onClick={() => setControlsOpen(false)}
          aria-hidden="true"
        />

        <SidePanel
          className={controlsOpen ? 'is-open' : ''}
          project={project}
          frame={currentFrame}
          activeKeyframe={activeKeyframe}
          selectedObjects={selectedObjects}
          fillColor={fillColor}
          strokeColor={strokeColor}
          onFillColorChange={setFillColor}
          onStrokeColorChange={setStrokeColor}
          onionSkin={onionSkin}
          onionRange={onionRange}
          onToggleOnionSkin={setOnionSkin}
          onOnionRangeChange={setOnionRange}
          onUpdateProject={updateProject}
          onUpdateSelected={updateSelected}
          onAddFrame={addFrame}
          onPinKeyframe={pinKeyframe}
          onDeleteKeyframe={deleteKeyframe}
          onDuplicateSelected={duplicateSelected}
          onDeleteSelected={deleteSelected}
          canAdd={canAdd}
        />
      </div>

      <Welcome open={welcomeOpen} onStart={closeWelcome} onDemo={loadDemo} />
      <ExportModal
        open={exportOpen}
        frame={currentFrame}
        projectName={project.name}
        exporting={exporting}
        progress={exportProgress}
        error={exportError}
        onClose={() => {
          if (!exporting) {
            setExportOpen(false);
            setExportError(null);
          }
        }}
        onExportPng={() => {
          exportFramePng(project, currentFrame);
          notify('Still frame exported as PNG.', 'mint');
        }}
        onExportWebm={exportWebm}
        onExportProject={() => {
          saveProjectFile(project);
          setExportOpen(false);
          notify('Quack project file exported.', 'mint');
        }}
      />
      <NewProjectModal
        open={newOpen}
        onCancel={() => setNewOpen(false)}
        onConfirm={newProject}
      />
      <Toasts
        notices={notices}
        onDismiss={id => setNotices(current => current.filter(notice => notice.id !== id))}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".quack,.json,application/json"
        hidden
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) void openProject(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

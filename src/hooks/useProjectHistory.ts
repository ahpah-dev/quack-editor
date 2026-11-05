import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { Project } from '../types';
import { cloneProject, MAX_HISTORY } from '../model/project';

interface HistoryApi {
  project: Project;
  projectRef: MutableRefObject<Project>;
  canUndo: boolean;
  canRedo: boolean;
  commit: (producer: (draft: Project) => Project) => void;
  updateLive: (producer: (draft: Project) => Project) => void;
  replaceProject: (project: Project) => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  undo: () => boolean;
  redo: () => boolean;
}

export function useProjectHistory(initial: Project): HistoryApi {
  const [project, setProjectState] = useState(initial);
  const projectRef = useRef(project);
  const pastRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const transactionRef = useRef<Project | null>(null);
  const [, setHistoryVersion] = useState(0);

  const notifyHistoryChange = useCallback(() => setHistoryVersion(version => version + 1), []);

  const setProject = useCallback((next: Project) => {
    projectRef.current = next;
    setProjectState(next);
  }, []);

  const pushPast = useCallback((snapshot: Project) => {
    pastRef.current.push(snapshot);
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
    futureRef.current = [];
    notifyHistoryChange();
  }, [notifyHistoryChange]);

  const commit = useCallback((producer: (draft: Project) => Project) => {
    const previous = projectRef.current;
    const draft = cloneProject(previous);
    const next = producer(draft);
    if (next === previous) return;
    pushPast(previous);
    setProject(next);
  }, [pushPast, setProject]);

  const updateLive = useCallback((producer: (draft: Project) => Project) => {
    const next = producer(cloneProject(projectRef.current));
    setProject(next);
  }, [setProject]);

  const beginTransaction = useCallback(() => {
    transactionRef.current = cloneProject(projectRef.current);
  }, []);

  const endTransaction = useCallback(() => {
    const snapshot = transactionRef.current;
    transactionRef.current = null;
    if (!snapshot) return;
    if (JSON.stringify(snapshot) === JSON.stringify(projectRef.current)) return;
    pushPast(snapshot);
  }, [pushPast]);

  const replaceProject = useCallback((next: Project) => {
    pastRef.current = [];
    futureRef.current = [];
    transactionRef.current = null;
    setProject(next);
    notifyHistoryChange();
  }, [notifyHistoryChange, setProject]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return false;
    futureRef.current.push(cloneProject(projectRef.current));
    setProject(previous);
    notifyHistoryChange();
    return true;
  }, [notifyHistoryChange, setProject]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return false;
    pastRef.current.push(cloneProject(projectRef.current));
    setProject(next);
    notifyHistoryChange();
    return true;
  }, [notifyHistoryChange, setProject]);

  return {
    project,
    projectRef,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    commit,
    updateLive,
    replaceProject,
    beginTransaction,
    endTransaction,
    undo,
    redo,
  };
}

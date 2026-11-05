import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Bounds, Point, Project, ShapeObject, Tool } from '../types';
import {
  boundsOfPoints,
  clamp,
  createEllipse,
  createRectangle,
  createStar,
  distance,
  hitTestObject,
  objectBounds,
  scalePointsAround,
  transformPoints,
  uid,
} from '../model/geometry';
import { drawSceneObjects, drawShape } from '../model/render';
import { Icon } from './Icons';
import type { IconName } from './Icons';

interface CanvasStageProps {
  project: Project;
  frame: number;
  scene: ShapeObject[];
  tool: Tool;
  setTool: (tool: Tool) => void;
  editable: boolean;
  selectedObject: ShapeObject | null;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  onFillColorChange: (color: string) => void;
  onStrokeColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onSelectObject: (id: string | null) => void;
  onCreateObject: (object: ShapeObject) => void;
  onUpdateObjectPoints: (id: string, points: Point[]) => void;
  onBeginEdit: () => void;
  onEndEdit: () => void;
  onDeleteObject: (id: string) => void;
  onPinKeyframe: () => void;
}

type Handle = 'nw' | 'ne' | 'sw' | 'se';

type Interaction =
  | {
      mode: 'pan';
      startScreen: Point;
      startPan: Point;
    }
  | {
      mode: 'draw';
      start: Point;
      pointer: Point;
      preview: ShapeObject;
    }
  | {
      mode: 'move';
      start: Point;
      originals: Point[];
      startObject: ShapeObject;
      moved: boolean;
    }
  | {
      mode: 'resize';
      handle: Handle;
      originals: Point[];
      bounds: Bounds;
      moved: boolean;
    }
  | null;

const toolLabels: Record<Tool, string> = {
  select: 'Select',
  brush: 'Brush',
  line: 'Line',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  star: 'Star',
  text: 'Text',
  eraser: 'Eraser',
  pan: 'Pan',
};

const toolIcons: Record<Tool, IconName> = {
  select: 'select',
  brush: 'brush',
  line: 'line',
  rect: 'square',
  ellipse: 'circle',
  star: 'star',
  text: 'text',
  eraser: 'eraser',
  pan: 'hand',
};

function normalizeBox(a: Point, b: Point): Bounds {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function shapeFromDrag(
  tool: Tool,
  start: Point,
  current: Point,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
): ShapeObject {
  const base: ShapeObject = {
    id: uid('shape'),
    kind: 'path',
    points: [],
    closed: true,
    smooth: false,
    fill: fillColor,
    stroke: strokeWidth > 0 ? strokeColor : null,
    strokeWidth,
    opacity: 1,
  };

  if (tool === 'line') {
    return { ...base, kind: 'line', points: [start, current], closed: false, fill: null };
  }
  if (tool === 'brush') {
    return {
      ...base,
      kind: 'path',
      points: [start, { x: start.x + 0.01, y: start.y + 0.01 }],
      closed: false,
      smooth: true,
      fill: null,
    };
  }

  const box = normalizeBox(start, current);
  if (tool === 'rect') {
    return { ...base, kind: 'rect', points: createRectangle(box.x, box.y, box.width, box.height) };
  }
  if (tool === 'ellipse') {
    return {
      ...base,
      kind: 'ellipse',
      smooth: true,
      points: createEllipse(
        box.x + box.width / 2,
        box.y + box.height / 2,
        Math.max(0.5, box.width / 2),
        Math.max(0.5, box.height / 2),
      ),
    };
  }
  return {
    ...base,
    kind: 'star',
    points: createStar(
      box.x + box.width / 2,
      box.y + box.height / 2,
      Math.max(box.width, box.height) / 2,
      Math.max(box.width, box.height) / 5,
    ),
  };
}

export default function CanvasStage(props: CanvasStageProps) {
  const {
    project,
    frame,
    scene,
    tool,
    editable,
    selectedObject,
    fillColor,
    strokeColor,
    strokeWidth,
    onFillColorChange,
    onStrokeColorChange,
    onStrokeWidthChange,
    onSelectObject,
    onCreateObject,
    onUpdateObjectPoints,
    onBeginEdit,
    onEndEdit,
    onDeleteObject,
    onPinKeyframe,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [pointer, setPointer] = useState<Point | null>(null);
  const [preview, setPreview] = useState<ShapeObject | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [project.width, project.height]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const baseScale = useMemo(() => {
    if (!size.width || !size.height) return 1;
    return Math.min(
      Math.max(0.1, (size.width - 104) / project.width),
      Math.max(0.1, (size.height - 104) / project.height),
    );
  }, [project.width, project.height, size.height, size.width]);

  const scale = baseScale * zoom;
  const view = useMemo(
    () => ({
      scale,
      x: (size.width - project.width * scale) / 2 + pan.x,
      y: (size.height - project.height * scale) / 2 + pan.y,
    }),
    [pan.x, pan.y, project.height, project.width, scale, size.height, size.width],
  );

  const toProject = useCallback(
    (screen: Point): Point => ({
      x: (screen.x - view.x) / view.scale,
      y: (screen.y - view.y) / view.scale,
    }),
    [view],
  );

  const localPoint = (event: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const selectionScreen = useMemo(() => {
    if (!selectedObject) return null;
    const bounds = objectBounds(selectedObject);
    return {
      x: view.x + bounds.x * view.scale,
      y: view.y + bounds.y * view.scale,
      width: bounds.width * view.scale,
      height: bounds.height * view.scale,
    };
  }, [selectedObject, view]);

  const handlePoints = useMemo(() => {
    if (!selectionScreen) return [];
    const pad = 7;
    const left = selectionScreen.x - pad;
    const top = selectionScreen.y - pad;
    const right = selectionScreen.x + selectionScreen.width + pad;
    const bottom = selectionScreen.y + selectionScreen.height + pad;
    return [
      { handle: 'nw' as Handle, point: { x: left, y: top } },
      { handle: 'ne' as Handle, point: { x: right, y: top } },
      { handle: 'sw' as Handle, point: { x: left, y: bottom } },
      { handle: 'se' as Handle, point: { x: right, y: bottom } },
    ];
  }, [selectionScreen]);

  const hitHandle = useCallback(
    (screen: Point): Handle | null => {
      if (!editable || !selectedObject || selectedObject.kind === 'text') return null;
      for (const handle of handlePoints) {
        if (distance(screen, handle.point) <= 12) return handle.handle;
      }
      return null;
    },
    [editable, handlePoints, selectedObject],
  );

  const topObjectAt = useCallback(
    (point: Point): ShapeObject | null => {
      for (let index = scene.length - 1; index >= 0; index--) {
        if (hitTestObject(scene[index], point, 8 / view.scale)) return scene[index];
      }
      return null;
    },
    [scene, view.scale],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = '#061a16';
    ctx.fillRect(0, 0, size.width, size.height);

    const spacing = 24;
    ctx.fillStyle = 'rgba(134, 255, 226, 0.075)';
    for (let x = spacing / 2; x < size.width; x += spacing) {
      for (let y = spacing / 2; y < size.height; y += spacing) {
        ctx.fillRect(x, y, 1.25, 1.25);
      }
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = project.background;
    ctx.fillRect(view.x, view.y, project.width * view.scale, project.height * view.scale);
    ctx.restore();

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath();
    ctx.rect(0, 0, project.width, project.height);
    ctx.clip();
    ctx.fillStyle = project.background;
    ctx.fillRect(0, 0, project.width, project.height);
    drawSceneObjects(ctx, scene);
    if (preview) drawShape(ctx, preview);
    ctx.restore();

    ctx.strokeStyle = 'rgba(203, 255, 242, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      view.x + 0.5,
      view.y + 0.5,
      project.width * view.scale - 1,
      project.height * view.scale - 1,
    );

    if (selectedObject && editable && selectionScreen) {
      const pad = 7;
      ctx.save();
      ctx.strokeStyle = '#57f5d2';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.shadowColor = 'rgba(87, 245, 210, 0.35)';
      ctx.shadowBlur = 8;
      ctx.strokeRect(
        selectionScreen.x - pad,
        selectionScreen.y - pad,
        selectionScreen.width + pad * 2,
        selectionScreen.height + pad * 2,
      );
      ctx.restore();

      if (selectedObject.kind !== 'text') {
        for (const handle of handlePoints) {
          ctx.fillStyle = '#eafff9';
          ctx.strokeStyle = '#0b332a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.rect(handle.point.x - 4.5, handle.point.y - 4.5, 9, 9);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }, [
    editable,
    frame,
    handlePoints,
    preview,
    project.background,
    project.height,
    project.width,
    scene,
    selectedObject,
    selectionScreen,
    size.height,
    size.width,
    view,
  ]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const screen = localPoint(event);
    const point = toProject(screen);
    canvasRef.current?.setPointerCapture(event.pointerId);

    if (event.button === 1 || tool === 'pan') {
      interactionRef.current = {
        mode: 'pan',
        startScreen: screen,
        startPan: pan,
      };
      return;
    }

    if (!editable) return;

    if (tool === 'select') {
      const handle = hitHandle(screen);
      if (handle && selectedObject) {
        const bounds = objectBounds(selectedObject);
        onBeginEdit();
        interactionRef.current = {
          mode: 'resize',
          handle,
          originals: selectedObject.points.map(item => ({ ...item })),
          bounds,
          moved: false,
        };
        return;
      }

      const hit = topObjectAt(point);
      if (hit) {
        onSelectObject(hit.id);
        onBeginEdit();
        interactionRef.current = {
          mode: 'move',
          start: point,
          originals: hit.points.map(item => ({ ...item })),
          startObject: hit,
          moved: false,
        };
      } else {
        onSelectObject(null);
      }
      return;
    }

    if (tool === 'eraser') {
      const hit = topObjectAt(point);
      if (hit) onDeleteObject(hit.id);
      return;
    }

    if (tool === 'text') {
      const text: ShapeObject = {
        id: uid('text'),
        kind: 'text',
        points: [point],
        closed: false,
        smooth: false,
        fill: fillColor,
        stroke: null,
        strokeWidth: 0,
        opacity: 1,
        text: 'Quack!',
        fontSize: 64,
      };
      onCreateObject(text);
      return;
    }

    if (point.x < 0 || point.y < 0 || point.x > project.width || point.y > project.height) return;

    const object = shapeFromDrag(tool, point, point, fillColor, strokeColor, strokeWidth);
    interactionRef.current = {
      mode: 'draw',
      start: point,
      pointer: point,
      preview: object,
    };
    setPreview(object);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const screen = localPoint(event);
    setPointer(screen);
    const interaction = interactionRef.current;
    if (!interaction) return;

    if (interaction.mode === 'pan') {
      setPan({
        x: interaction.startPan.x + (screen.x - interaction.startScreen.x),
        y: interaction.startPan.y + (screen.y - interaction.startScreen.y),
      });
      return;
    }

    const point = toProject(screen);

    if (interaction.mode === 'draw') {
      if (tool === 'brush') {
        const last = interaction.preview.points[interaction.preview.points.length - 1];
        if (!last || distance(last, point) > 1.6 / Math.max(0.3, view.scale)) {
          interaction.preview = {
            ...interaction.preview,
            points: [...interaction.preview.points, point],
          };
          setPreview(interaction.preview);
        }
      } else {
        interaction.preview = shapeFromDrag(
          tool,
          interaction.start,
          point,
          fillColor,
          strokeColor,
          strokeWidth,
        );
        interaction.pointer = point;
        setPreview(interaction.preview);
      }
      return;
    }

    if (interaction.mode === 'move') {
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) interaction.moved = true;
      onUpdateObjectPoints(
        interaction.startObject.id,
        transformPoints(interaction.originals, dx, dy),
      );
      return;
    }

    if (interaction.mode === 'resize') {
      const { bounds, handle, originals } = interaction;
      const anchor = {
        x: handle === 'nw' || handle === 'sw' ? bounds.x + bounds.width : bounds.x,
        y: handle === 'nw' || handle === 'ne' ? bounds.y + bounds.height : bounds.y,
      };
      const corner = {
        x: handle === 'nw' || handle === 'sw' ? bounds.x : bounds.x + bounds.width,
        y: handle === 'nw' || handle === 'ne' ? bounds.y : bounds.y + bounds.height,
      };
      let scaleX = (point.x - anchor.x) / Math.max(1, corner.x - anchor.x);
      let scaleY = (point.y - anchor.y) / Math.max(1, corner.y - anchor.y);
      if (Math.abs(scaleX) < 0.04) scaleX = Math.sign(scaleX || 1) * 0.04;
      if (Math.abs(scaleY) < 0.04) scaleY = Math.sign(scaleY || 1) * 0.04;
      interaction.moved = true;
      onUpdateObjectPoints(
        selectedObject?.id || '',
        scalePointsAround(originals, anchor, scaleX, scaleY),
      );
    }
  };

  const finishPointer = () => {
    const interaction = interactionRef.current;
    interactionRef.current = null;
    if (!interaction) return;

    if (interaction.mode === 'draw') {
      let final = interaction.preview;
      const bounds = boundsOfPoints(final.points);
      if (tool !== 'brush' && tool !== 'line' && (bounds.width < 3 || bounds.height < 3)) {
        const center = interaction.start;
        if (tool === 'rect') {
          final = {
            ...final,
            points: createRectangle(center.x - 50, center.y - 50, 100, 100),
          };
        } else if (tool === 'ellipse') {
          final = {
            ...final,
            points: createEllipse(center.x, center.y, 55, 55),
          };
        } else if (tool === 'star') {
          final = {
            ...final,
            points: createStar(center.x, center.y, 62, 26),
          };
        }
      }
      if (tool === 'brush' && final.points.length < 2) {
        final = {
          ...final,
          points: [final.points[0], { x: final.points[0].x + 0.5, y: final.points[0].y + 0.5 }],
        };
      }
      setPreview(null);
      onCreateObject(final);
    }

    if (interaction.mode === 'move' || interaction.mode === 'resize') {
      onEndEdit();
    }
  };

  const onPointerUp = () => finishPointer();
  const onPointerCancel = () => {
    const interaction = interactionRef.current;
    interactionRef.current = null;
    setPreview(null);
    if (interaction?.mode === 'move' || interaction?.mode === 'resize') onEndEdit();
  };

  const setZoomAt = (nextZoom: number, anchor: Point = { x: size.width / 2, y: size.height / 2 }) => {
    const clamped = clamp(nextZoom, 0.3, 4);
    const projectPoint = toProject(anchor);
    const newScale = baseScale * clamped;
    const centeredX = (size.width - project.width * newScale) / 2;
    const centeredY = (size.height - project.height * newScale) / 2;
    setPan({
      x: anchor.x - projectPoint.x * newScale - centeredX,
      y: anchor.y - projectPoint.y * newScale - centeredY,
    });
    setZoom(clamped);
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setZoomAt(zoom * Math.exp(-event.deltaY * 0.0014), anchor);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const cursorSize =
    tool === 'eraser' ? 22 : Math.max(8, strokeWidth * Math.max(0.9, view.scale));

  return (
    <div
      ref={wrapRef}
      className={`canvas-stage tool-${tool}`}
      onWheel={onWheel}
      data-editable={editable}
    >
      <canvas
        ref={canvasRef}
        className="stage-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => setPointer(null)}
      />

      <div className="tool-options" onPointerDown={event => event.stopPropagation()}>
        <span className="tool-options-name">
          <Icon name={toolIcons[tool]} size={15} />
          {toolLabels[tool]}
        </span>
        <span className="tool-options-divider" />
        <label className="mini-color" title="Fill color">
          <span style={{ background: fillColor }} />
          <input
            type="color"
            value={fillColor}
            onChange={event => onFillColorChange(event.target.value)}
          />
        </label>
        <label className="mini-color mini-color--stroke" title="Stroke color">
          <span style={{ borderColor: strokeColor }} />
          <input
            type="color"
            value={strokeColor}
            onChange={event => onStrokeColorChange(event.target.value)}
          />
        </label>
        <label className="tool-size">
          <span>Size</span>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={strokeWidth}
            onChange={event => onStrokeWidthChange(Number(event.target.value))}
          />
          <strong>{strokeWidth}</strong>
        </label>
      </div>

      {!editable && (
        <div className="inbetween-pill">
          <span className="live-dot" />
          <span>{project.autoTween ? 'Auto in-between' : 'Hold frame'} · frame {frame}</span>
          <button type="button" onClick={onPinKeyframe}>
            <Icon name="pin" size={13} />
            Pin keyframe
          </button>
        </div>
      )}

      {editable && scene.length === 0 && (
        <div className="canvas-empty">
          <span className="canvas-empty-icon"><Icon name="sparkle" size={21} /></span>
          <strong>Make your first mark.</strong>
          <span>Pick a brush or a shape from the left.</span>
        </div>
      )}

      <div className="zoom-controls">
        <button type="button" onClick={() => setZoomAt(zoom * 0.82)} title="Zoom out">
          <Icon name="minus" size={15} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoomAt(zoom * 1.22)} title="Zoom in">
          <Icon name="plus" size={15} />
        </button>
        <button type="button" onClick={resetView} title="Fit canvas">
          <Icon name="fit" size={15} />
        </button>
      </div>

      {pointer && (tool === 'brush' || tool === 'eraser') && (
        <div
          className="brush-ring"
          style={{
            left: pointer.x,
            top: pointer.y,
            width: cursorSize,
            height: cursorSize,
          }}
        />
      )}
    </div>
  );
}

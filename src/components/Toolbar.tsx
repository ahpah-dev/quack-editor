import type { Tool } from '../types';
import { Icon } from './Icons';
import type { IconName } from './Icons';

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: Array<{ tool: Tool; label: string; key: string; icon: IconName }> = [
  { tool: 'select', label: 'Select', key: 'V', icon: 'select' },
  { tool: 'brush', label: 'Brush', key: 'B', icon: 'brush' },
  { tool: 'line', label: 'Line', key: 'L', icon: 'line' },
  { tool: 'rect', label: 'Rectangle', key: 'R', icon: 'square' },
  { tool: 'ellipse', label: 'Ellipse', key: 'O', icon: 'circle' },
  { tool: 'star', label: 'Star', key: 'S', icon: 'star' },
  { tool: 'text', label: 'Text', key: 'T', icon: 'text' },
  { tool: 'eraser', label: 'Eraser', key: 'E', icon: 'eraser' },
  { tool: 'pan', label: 'Pan', key: 'H', icon: 'hand' },
];

export default function Toolbar(props: ToolbarProps) {
  const { tool, onToolChange, undo, redo, canUndo, canRedo } = props;

  return (
    <nav className="toolbar" aria-label="Drawing tools">
      <div className="tool-group">
        {tools.map(item => (
          <button
            key={item.tool}
            type="button"
            className={`tool-button ${tool === item.tool ? 'is-active' : ''}`}
            onClick={() => onToolChange(item.tool)}
            aria-label={item.label}
            aria-pressed={tool === item.tool}
            data-tooltip={`${item.label}  ${item.key}`}
          >
            <Icon name={item.icon} size={21} />
            <span className="tool-key">{item.key}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-history">
        <button
          type="button"
          className="tool-button tool-button--small"
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
        >
          <Icon name="undo" size={18} />
        </button>
        <button
          type="button"
          className="tool-button tool-button--small"
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
        >
          <Icon name="redo" size={18} />
        </button>
      </div>

      <div className="toolbar-footer" aria-hidden="true">
        <span className="toolbar-egg">Q</span>
      </div>
    </nav>
  );
}

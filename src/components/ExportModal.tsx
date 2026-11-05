import { Icon } from './Icons';

interface ExportModalProps {
  open: boolean;
  frame: number;
  projectName: string;
  exporting: boolean;
  progress: number;
  error: string | null;
  onClose: () => void;
  onExportPng: () => void;
  onExportWebm: () => void;
  onExportProject: () => void;
}

const options = [
  {
    id: 'png',
    icon: 'image' as const,
    title: 'Still frame',
    text: 'A crisp PNG of the frame you are looking at.',
    tag: 'PNG · 2×',
  },
  {
    id: 'webm',
    icon: 'video' as const,
    title: 'Motion clip',
    text: 'Record the whole timeline as a WebM video.',
    tag: 'WEBM · realtime',
  },
  {
    id: 'project',
    icon: 'file' as const,
    title: 'Quack project',
    text: 'The editable source file. Open it here or anywhere.',
    tag: '.QUACK',
  },
];

export default function ExportModal(props: ExportModalProps) {
  const { open, frame, projectName, exporting, progress, error, onClose } = props;
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Export">
      <div className="modal export-modal">
        <div className="modal-head export-head">
          <div>
            <span className="eyebrow">Release it into the pond</span>
            <h2>Export <em>{projectName}</em></h2>
            <p>Three ways out. All of them cute.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close export dialog">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="export-options">
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              className={`export-option ${option.id === 'webm' ? 'is-featured' : ''}`}
              onClick={() => {
                if (option.id === 'png') props.onExportPng();
                if (option.id === 'webm') props.onExportWebm();
                if (option.id === 'project') props.onExportProject();
              }}
              disabled={exporting}
            >
              <span className="export-icon"><Icon name={option.icon} size={24} /></span>
              <span className="export-text">
                <strong>{option.title}</strong>
                <span>{option.text}{option.id === 'png' ? ` Frame ${frame}.` : ''}</span>
                <small>{option.tag}</small>
              </span>
              <span className="export-arrow"><Icon name="forward" size={16} /></span>
            </button>
          ))}
        </div>

        {exporting && (
          <div className="export-progress">
            <div className="export-progress-label">
              <span>Rendering your quack...</span>
              <strong>{Math.round(progress)}%</strong>
            </div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            <small>Keep this tab visible while the clip records.</small>
          </div>
        )}

        {error && <div className="export-error">{error}</div>}

        <div className="modal-foot">
          <span>Canvas exports follow your project size. The edit file stays editable.</span>
          <button type="button" className="soft-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

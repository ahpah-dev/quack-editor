import { Icon } from './Icons';

interface ExportModalProps {
  open: boolean;
  frame: number;
  projectName: string;
  exporting: boolean;
  progress: number;
  error: string | null;
  onClose: () => void;
  onExportMp4: () => void;
  onExportPng: () => void;
  onExportWebm: () => void;
  onExportProject: () => void;
}

const options = [
  {
    id: 'mp4',
    icon: 'video' as const,
    title: 'High-quality MP4',
    text: 'H.264 at up to 2× project resolution with a high-quality bitrate.',
    tag: 'MP4 · H.264 · HIGH BITRATE',
  },
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
    title: 'WebM fallback',
    text: 'A quick realtime recording for broad browser support.',
    tag: 'WEBM · REAL TIME',
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
            <p>Four ways out. MP4 is the pretty one.</p>
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
              className={`export-option ${option.id === 'mp4' ? 'is-featured' : ''}`}
              onClick={() => {
                if (option.id === 'mp4') props.onExportMp4();
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
            <small>Large exports may take a moment. The editor stays responsive.</small>
          </div>
        )}

        {error && <div className="export-error">{error}</div>}

        <div className="modal-foot">
          <span>MP4 is rendered offline frame by frame, so timing stays exact.</span>
          <button type="button" className="soft-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

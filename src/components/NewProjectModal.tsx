import { Icon } from './Icons';

interface NewProjectModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function NewProjectModal({ open, onCancel, onConfirm }: NewProjectModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="New project">
      <div className="modal confirm-modal">
        <span className="confirm-icon"><Icon name="sparkle" size={24} /></span>
        <h2>Fresh pond?</h2>
        <p>
          This clears the current canvas and timeline. Save the project first if
          you want to keep it around.
        </p>
        <div className="confirm-actions">
          <button type="button" className="soft-btn" onClick={onCancel}>Keep working</button>
          <button type="button" className="confirm-primary" onClick={onConfirm}>
            Start fresh <Icon name="forward" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

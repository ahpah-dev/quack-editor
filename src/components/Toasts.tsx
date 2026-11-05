import type { Notice } from '../types';
import { Icon } from './Icons';

export default function Toasts({
  notices,
  onDismiss,
}: {
  notices: Notice[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-stack" aria-live="polite">
      {notices.map(notice => (
        <div className={`toast toast--${notice.tone}`} key={notice.id}>
          <span className="toast-icon">
            <Icon
              name={notice.tone === 'coral' ? 'close' : notice.tone === 'amber' ? 'sparkle' : 'check'}
              size={15}
            />
          </span>
          <span>{notice.message}</span>
          <button type="button" onClick={() => onDismiss(notice.id)} aria-label="Dismiss">
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

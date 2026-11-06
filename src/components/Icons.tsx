import type { SVGProps } from 'react';

export type IconName =
  | 'select'
  | 'brush'
  | 'line'
  | 'square'
  | 'circle'
  | 'star'
  | 'text'
  | 'eraser'
  | 'hand'
  | 'play'
  | 'pause'
  | 'back'
  | 'forward'
  | 'plus'
  | 'undo'
  | 'redo'
  | 'trash'
  | 'copy'
  | 'image'
  | 'video'
  | 'music'
  | 'wave'
  | 'file'
  | 'save'
  | 'folder'
  | 'download'
  | 'close'
  | 'fit'
  | 'minus'
  | 'pin'
  | 'sparkle'
  | 'chevron'
  | 'check'
  | 'settings'
  | 'more';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };

  switch (name) {
    case 'select':
      return <svg {...common}><path d="m5 3 13 8-6.1 1.5L9 19.2z" /></svg>;
    case 'brush':
      return <svg {...common}><path d="m14.2 4.5 5.3 5.3-8.1 8.1a3.6 3.6 0 0 1-2.5 1l-4 .9.9-4a3.6 3.6 0 0 1 1-2.5zM11.8 6.8l5.4 5.4" /></svg>;
    case 'line':
      return <svg {...common}><path d="M5 19 19 5" /><circle cx="5" cy="19" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="5" r="1.4" fill="currentColor" stroke="none" /></svg>;
    case 'square':
      return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2.5" /></svg>;
    case 'circle':
      return <svg {...common}><circle cx="12" cy="12" r="8.2" /></svg>;
    case 'star':
      return <svg {...common}><path d="m12 3 2.7 5.8 6.3.8-4.7 4.4 1.3 6.2-5.6-3.1-5.6 3.1 1.3-6.2L3 9.6l6.3-.8z" /></svg>;
    case 'text':
      return <svg {...common}><path d="M5 5h14M12 5v14M8.5 19h7" /></svg>;
    case 'eraser':
      return <svg {...common}><path d="m7 17-3-3L14 4l6 6-8 8H7zM9 20h11" /></svg>;
    case 'hand':
      return <svg {...common}><path d="M8 11V6.5a1.6 1.6 0 0 1 3.2 0V11M11.2 11V5.2a1.6 1.6 0 0 1 3.2 0V11M14.4 11V6.4a1.6 1.6 0 0 1 3.2 0v7.2c0 4-2.7 7-6.8 7-2.7 0-4.5-1.4-5.8-3.5L3.5 14a1.7 1.7 0 0 1 2.8-1.9L8 14.2" /></svg>;
    case 'play':
      return <svg {...common}><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" /></svg>;
    case 'pause':
      return <svg {...common}><path d="M8 5v14M16 5v14" strokeWidth="2.6" /></svg>;
    case 'back':
      return <svg {...common}><path d="m15 6-6 6 6 6" /></svg>;
    case 'forward':
      return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'minus':
      return <svg {...common}><path d="M5 12h14" /></svg>;
    case 'undo':
      return <svg {...common}><path d="M9 7 4 12l5 5M4 12h9a6 6 0 0 1 6 6" /></svg>;
    case 'redo':
      return <svg {...common}><path d="m15 7 5 5-5 5M20 12h-9a6 6 0 0 0-6 6" /></svg>;
    case 'trash':
      return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
    case 'copy':
      return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>;
    case 'image':
      return <svg {...common}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 16 4.5-4.5 3.2 3.2 2.6-2.6L20 17.8" /></svg>;
    case 'video':
      return <svg {...common}><rect x="3" y="5" width="13" height="14" rx="2.5" /><path d="m16 10 5-3v10l-5-3z" /></svg>;
    case 'music':
      return <svg {...common}><path d="M9 18V5l10-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>;
    case 'wave':
      return <svg {...common}><path d="M3 12h3l2-5 3 10 3-13 3 15 2-7h2" /></svg>;
    case 'file':
      return <svg {...common}><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4" /></svg>;
    case 'save':
      return <svg {...common}><path d="M5 3h12l3 3v15H4V3zM8 3v6h8V3M8 21v-7h8v7" /></svg>;
    case 'folder':
      return <svg {...common}><path d="M3 7h7l2 2h9v10H3z" /></svg>;
    case 'download':
      return <svg {...common}><path d="M12 4v11M8 11l4 4 4-4M5 19h14" /></svg>;
    case 'close':
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case 'fit':
      return <svg {...common}><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" /></svg>;
    case 'pin':
      return <svg {...common}><path d="m9 3 6 6-2 2 3 5-3 1-2-4-4 4-1-1 4-4-4-2 1-3 5 3z" /></svg>;
    case 'sparkle':
      return <svg {...common}><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 16l.8 2.2L21.5 19l-2.2.8-.8 2.2-.8-2.2L15.5 19l2.2-.8z" /></svg>;
    case 'chevron':
      return <svg {...common}><path d="m7 9 5 5 5-5" /></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 4.5 4.5L19 7" /></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" /></svg>;
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>;
    default:
      return null;
  }
}

export function DuckMark({ size = 38 }: { size?: number }) {
  return (
    <span className="duck-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <circle cx="30" cy="33" r="17" fill="#ffd166" />
        <path d="M27 18c0-4 3-7 7-8" fill="none" stroke="#ffe29a" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M45 31c7-1 12 2 14 6-3 4-9 5-15 2l1-4Z" fill="#ff9f43" />
        <circle cx="37" cy="28" r="2.3" fill="#09251f" />
        <path d="M23 45c4 3 9 4 13 2" fill="none" stroke="#f0b93e" strokeWidth="2" strokeLinecap="round" opacity=".7" />
        <circle cx="22" cy="37" r="3" fill="#ffb8a3" opacity=".5" />
      </svg>
    </span>
  );
}

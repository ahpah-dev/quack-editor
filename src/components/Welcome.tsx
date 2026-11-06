import { DuckMark, Icon } from './Icons';

interface WelcomeProps {
  open: boolean;
  onStart: () => void;
  onDemo: () => void;
}

const steps = [
  {
    icon: 'brush' as const,
    title: 'Make a mark',
    text: 'Brush, shapes, stars, and words. Keep it loose.',
  },
  {
    icon: 'plus' as const,
    title: 'Add a frame',
    text: 'Quack copies the moment and fills the gap.',
  },
  {
    icon: 'sparkle' as const,
    title: 'Change the copy',
    text: 'Move it, restyle it, reshape it. The morph follows.',
  },
];

export default function Welcome({ open, onStart, onDemo }: WelcomeProps) {
  if (!open) return null;

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Quack Editor">
      <div className="welcome-glow welcome-glow--one" />
      <div className="welcome-glow welcome-glow--two" />
      <div className="welcome-card">
        <div className="welcome-hero">
          <div className="welcome-rings" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="welcome-duck">
            <DuckMark size={76} />
          </div>
          <span className="eyebrow">Quack Editor · 1.6</span>
          <h1>Quack. Make<br /><em>something move.</em></h1>
          <p>
            A tiny motion studio with one big trick: draw two moments and Quack
            invents everything between them.
          </p>
        </div>

        <div className="welcome-body">
          <div className="welcome-steps">
            {steps.map((step, index) => (
              <div className="welcome-step" key={step.title}>
                <span className="welcome-step-number">0{index + 1}</span>
                <span className="welcome-step-icon"><Icon name={step.icon} size={18} /></span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            ))}
          </div>

          <div className="welcome-actions">
            <button type="button" className="welcome-primary" onClick={onStart}>
              Start creating <Icon name="forward" size={16} />
            </button>
            <button type="button" className="welcome-secondary" onClick={onDemo}>
              <Icon name="sparkle" size={15} /> See the duck demo
            </button>
          </div>

          <div className="welcome-footnote">
            <span className="live-dot" />
            Built completely from scratch. Free as a duck. Unlicense.
          </div>
        </div>
      </div>
    </div>
  );
}

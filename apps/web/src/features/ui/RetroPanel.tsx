import type { PropsWithChildren } from 'react';

export const RetroPanel = ({
  children,
  title,
  className = '',
}: PropsWithChildren<{ title?: string; className?: string }>) => (
  <section className={`retro-panel ${className}`}>
    {title ? (
      <header className="retro-panel__title">
        {title}
      </header>
    ) : null}
    <div className="retro-panel__body">{children}</div>
  </section>
);

import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type RetroButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger';
    fullWidth?: boolean;
  }
>;

export const RetroButton = ({
  children,
  className = '',
  fullWidth = false,
  variant = 'primary',
  ...props
}: RetroButtonProps) => {
  const variantClass =
    variant === 'secondary'
      ? 'border-cos-sky/70 bg-cos-sky/10 text-cos-sky hover:bg-cos-sky/20'
      : variant === 'danger'
        ? 'border-cos-danger/70 bg-cos-danger/10 text-cos-danger hover:bg-cos-danger/20'
        : 'border-cos-neon/70 bg-cos-neon/10 text-cos-neon hover:bg-cos-neon/20';

  return (
    <button
      className={`retro-button ${variantClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'primary-dark' | 'secondary' | 'ghost' | 'invert';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-stamp text-paper border-stamp hover:bg-espresso hover:border-espresso',
  'primary-dark':
    'bg-stamp text-paper border-stamp hover:bg-paper hover:text-espresso hover:border-paper',
  secondary: 'bg-transparent text-ink border-ink/40 hover:border-ink hover:bg-cream',
  ghost: 'bg-transparent text-ink border-ink/40 hover:bg-ink hover:text-paper hover:border-ink',
  invert: 'bg-transparent text-ink border-ink/40 hover:bg-stamp hover:text-paper hover:border-stamp',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-5 text-sm',
  md: 'min-h-[48px] px-5 text-sm',
  lg: 'min-h-[52px] px-7 text-base',
};

/** Классы кнопки — для мест, где нужен <a>, а не <button>. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'lg',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center font-semibold rounded-md border transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    className?: string;
    children: ReactNode;
  };

export default function Button({
  variant = 'primary',
  size = 'lg',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

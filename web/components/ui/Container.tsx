import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/** Общая ширина и боковые отступы всех секций макета. */
export default function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10', className)}>{children}</div>
  );
}

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-[var(--motion-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[image:var(--gradient-primary)] text-[var(--color-primary-foreground)] shadow-[var(--clay-shadow-sm)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:scale-[0.99]',
        destructive:
          'bg-[var(--color-error)] text-[var(--color-error-foreground)] shadow-sm hover:bg-[var(--color-error)]/90',
        outline:
          'border border-[var(--glass-border)] bg-[var(--glass-highlight)] shadow-[var(--clay-inset)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-weak)]',
        secondary:
          'bg-[var(--color-surface-muted)] text-[var(--color-text)] shadow-sm hover:bg-[var(--color-surface-muted)]/80',
        ghost: 'hover:bg-[var(--color-surface-muted)]',
        link: 'text-[var(--color-primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

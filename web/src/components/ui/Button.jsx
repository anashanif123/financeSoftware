import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:shadow-glow hover:brightness-110',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-surface-muted hover:border-primary/30',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-danger text-white shadow-sm shadow-danger/25 hover:brightness-110',
  outline: 'border border-border text-foreground hover:bg-surface-muted hover:border-primary/30',
  accent: 'bg-accent text-accent-foreground shadow-sm shadow-accent/25 hover:brightness-105',
};

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
};

export const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef(function Input({ className, icon: Icon, ...props }, ref) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        ref={ref}
        className={cn(
          'focus-ring h-9.5 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors',
          Icon && 'pl-9',
          className,
        )}
        {...props}
      />
    </div>
  );
});

export const Label = forwardRef(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-sm font-medium text-foreground', className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'focus-ring h-9.5 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'focus-ring min-h-[80px] w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70',
        className,
      )}
      {...props}
    />
  );
});

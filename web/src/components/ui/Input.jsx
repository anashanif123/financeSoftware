import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const base =
  'h-10 w-full rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-primary/30 focus:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

export const Input = forwardRef(function Input({ className, icon: Icon, ...props }, ref) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <input ref={ref} className={cn(base, Icon && 'pl-10', className)} {...props} />
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
    <select ref={ref} className={cn(base, 'cursor-pointer pr-8', className)} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[88px] w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-primary/30 focus:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
      {...props}
    />
  );
});

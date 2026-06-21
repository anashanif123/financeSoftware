import { cn } from '@/lib/cn';

// Composable table primitives. Sticky-feeling header, subtle emerald row hover.
export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return (
    <thead
      className={cn(
        'border-b border-border bg-surface-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }) {
  return <th className={cn('whitespace-nowrap px-6 py-3.5 font-semibold', className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn('divide-y divide-border/70', className)} {...props} />;
}

export function TR({ className, clickable, ...props }) {
  return (
    <tr
      className={cn(
        'transition-colors duration-150',
        clickable && 'cursor-pointer hover:bg-primary/[0.035]',
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }) {
  return <td className={cn('whitespace-nowrap px-6 py-4 text-foreground', className)} {...props} />;
}

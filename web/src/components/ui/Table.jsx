import { cn } from '@/lib/cn';

// Composable, beautiful table primitives. Rows get a subtle hover + clickable cursor.
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
        'border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }) {
  return <th className={cn('whitespace-nowrap px-5 py-3 font-medium', className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TR({ className, clickable, ...props }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        clickable && 'cursor-pointer hover:bg-surface-muted',
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }) {
  return <td className={cn('whitespace-nowrap px-5 py-3.5 text-foreground', className)} {...props} />;
}

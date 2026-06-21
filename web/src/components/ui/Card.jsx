import { cn } from '@/lib/cn';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface shadow-soft', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex items-center justify-between gap-3 px-5 pt-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-sm font-semibold text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}

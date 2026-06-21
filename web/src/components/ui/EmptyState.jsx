import { cn } from '@/lib/cn';

// Friendly empty + error states (required UX states).
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-20 text-center', className)}>
      {Icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-inset ring-primary/15">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Could not load data', description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 ring-1 ring-inset ring-danger/20">
        <span className="text-2xl font-semibold text-danger">!</span>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="focus-ring mt-6 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-muted hover:border-primary/30"
        >
          Try again
        </button>
      )}
    </div>
  );
}

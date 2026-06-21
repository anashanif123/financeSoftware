import { cn } from '@/lib/cn';

// Tone presets mapped to status semantics.
const tones = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-[hsl(var(--warning))]',
  danger: 'bg-danger/12 text-danger',
};

// Map domain statuses → tone so colours stay consistent everywhere.
const STATUS_TONE = {
  // invoices
  DRAFT: 'neutral',
  PENDING: 'warning',
  SENT: 'primary',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
  // shipments
  OPEN: 'neutral',
  PROCESSING: 'primary',
  COMPLETED: 'success',
  CLOSED: 'neutral',
  // projects
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  ARCHIVED: 'neutral',
  // disputes
  REVIEW: 'warning',
  RESOLVED: 'success',
};

export function Badge({ children, tone, status, className }) {
  const resolved = tone || (status && STATUS_TONE[status]) || 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[resolved],
        className,
      )}
    >
      {status && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children || (status ? status.replace(/_/g, ' ').toLowerCase() : '')}
    </span>
  );
}

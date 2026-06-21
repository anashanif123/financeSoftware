import { cn } from '@/lib/cn';

// Tone presets mapped to status semantics. Soft tinted fill + ring for depth.
const tones = {
  neutral: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  primary: 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
  accent: 'bg-accent/15 text-[hsl(var(--accent-foreground))] ring-1 ring-inset ring-accent/30',
  success: 'bg-success/12 text-success ring-1 ring-inset ring-success/20',
  warning: 'bg-warning/15 text-[hsl(var(--warning))] ring-1 ring-inset ring-warning/25',
  danger: 'bg-danger/12 text-danger ring-1 ring-inset ring-danger/20',
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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[resolved],
        className,
      )}
    >
      {status && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children || (status ? status.replace(/_/g, ' ').toLowerCase() : '')}
    </span>
  );
}

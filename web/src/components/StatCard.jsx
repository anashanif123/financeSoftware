import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';

const tones = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  success: 'bg-success/12 text-success ring-success/15',
  warning: 'bg-warning/15 text-[hsl(var(--warning))] ring-warning/20',
  danger: 'bg-danger/12 text-danger ring-danger/15',
  accent: 'bg-accent/15 text-[hsl(var(--accent-foreground))] ring-accent/25',
  neutral: 'bg-muted text-muted-foreground ring-border',
};

const glow = {
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-danger/10',
  accent: 'bg-accent/10',
  neutral: 'bg-muted-foreground/10',
};

export function StatCard({ label, value, icon: Icon, tone = 'primary', hint }) {
  return (
    <Card hover className="relative overflow-hidden p-5">
      {/* Ambient corner glow */}
      <span
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl',
          glow[tone],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-[28px] font-semibold leading-none tracking-tight text-foreground">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
              tones[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </Card>
  );
}

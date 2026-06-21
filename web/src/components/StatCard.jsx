import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';

export function StatCard({ label, value, icon: Icon, tone = 'primary', hint }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/15 text-[hsl(var(--warning))]',
    danger: 'bg-danger/12 text-danger',
    neutral: 'bg-muted text-muted-foreground',
  };
  return (
    <Card className="p-5 transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
    </Card>
  );
}

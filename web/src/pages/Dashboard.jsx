import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Ship,
  Receipt,
  CircleDollarSign,
  Clock,
  TrendingUp,
  Mail,
  CreditCard,
  Activity as ActivityIcon,
  ArrowUpRight,
  ClipboardCheck,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { TrendChart } from '@/components/charts/TrendChart';
import { useStats, useCharts, useRecent, useList } from '@/hooks/useApi';
import { useAuth } from '@/store/auth';
import { formatCompactCurrency, formatCurrency, formatNumber, timeAgo } from '@/lib/format';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useStats();
  const { data: charts } = useCharts(6);
  const { data: recent } = useRecent();
  const s = stats?.data;
  const series = charts?.data || [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">{today}</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight">
            {greeting()},{' '}
            <span className="text-gradient">{(user?.name || 'there').split(' ')[0]}</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Here’s how your logistics operation is tracking today.
          </p>
        </div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-surface-muted"
        >
          View reports <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Needs attention — what the operator must act on right now */}
      <NeedsAttention />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          [
            { label: 'Revenue (paid)', value: formatCompactCurrency(s?.revenue), icon: CircleDollarSign, tone: 'success' },
            { label: 'Outstanding', value: formatCompactCurrency(s?.outstanding), icon: Clock, tone: 'warning' },
            { label: 'Commission earned', value: formatCompactCurrency(s?.commissionEarned), icon: TrendingUp, tone: 'accent' },
            { label: 'Pending invoices', value: formatNumber(s?.pendingInvoices), icon: Receipt, tone: 'primary', hint: `${formatNumber(s?.paidInvoices)} paid` },
          ].map((c, i) => (
            <div key={c.label} className="animate-rise" style={{ animationDelay: `${i * 0.06}s` }}>
              <StatCard {...c} />
            </div>
          ))
        )}
      </div>

      {/* Operations mini-strip */}
      <div className="grid grid-cols-3 gap-4">
        <MiniStat to="/projects" label="Projects" value={formatNumber(s?.totalProjects)} icon={FolderKanban} loading={isLoading} />
        <MiniStat to="/shipments" label="Shipments" value={formatNumber(s?.totalShipments)} icon={Ship} loading={isLoading} />
        <MiniStat to="/invoices" label="Paid invoices" value={formatNumber(s?.paidInvoices)} icon={Receipt} loading={isLoading} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue trend">
          <TrendChart data={series} dataKey="revenue" formatter={(v) => formatCurrency(v)} color="hsl(var(--success))" />
        </ChartCard>
        <ChartCard title="Payments received">
          <TrendChart data={series} dataKey="payments" formatter={(v) => formatCurrency(v)} color="hsl(var(--primary))" />
        </ChartCard>
        <ChartCard title="Invoices issued">
          <TrendChart data={series} dataKey="invoices" formatter={formatNumber} color="hsl(var(--accent))" />
        </ChartCard>
        <ChartCard title="Shipments created">
          <TrendChart data={series} dataKey="shipments" formatter={formatNumber} color="hsl(190 70% 42%)" />
        </ChartCard>
      </div>

      {/* Activity feeds */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FeedCard title="Recent activity" icon={ActivityIcon}>
          {recent?.data?.activities?.length ? (
            <ul className="space-y-3.5">
              {recent.data.activities.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <FeedEmpty label="No activity yet" />
          )}
        </FeedCard>

        <FeedCard title="Recent emails" icon={Mail} href="/emails">
          {recent?.data?.emails?.length ? (
            <ul className="space-y-3.5">
              {recent.data.emails.map((e) => (
                <li key={e.id} className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{e.fromName || e.fromAddress}</p>
                    <Badge tone="neutral" className="shrink-0 text-[10px]">{(e.category || '').replace(/_/g, ' ').toLowerCase()}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{e.subject || '(no subject)'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <FeedEmpty label="No emails synced" />
          )}
        </FeedCard>

        <FeedCard title="Recent payments" icon={CreditCard} href="/payments">
          {recent?.data?.payments?.length ? (
            <ul className="space-y-3.5">
              {recent.data.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.invoice?.customer?.name || 'Payment'}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{p.invoice?.invoiceNumber}</p>
                  </div>
                  <span className="shrink-0 font-display text-sm font-semibold text-success">{formatCurrency(p.amount, p.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <FeedEmpty label="No payments yet" />
          )}
        </FeedCard>
      </div>
    </div>
  );
}

// Surfaces only the things that need the operator's action. Hidden when all clear.
function NeedsAttention() {
  const review = useList('documents', { reviewStatus: 'PENDING', limit: 1 });
  const overdue = useList('invoices', { status: 'OVERDUE', limit: 1 });
  const disputes = useList('disputes', { status: 'OPEN', limit: 1 });

  const items = [
    { count: review.data?.meta?.total || 0, label: 'to review', to: '/review', icon: ClipboardCheck },
    { count: overdue.data?.meta?.total || 0, label: 'overdue invoices', to: '/invoices', icon: CalendarClock },
    { count: disputes.data?.meta?.total || 0, label: 'open disputes', to: '/disputes', icon: AlertTriangle },
  ].filter((i) => i.count > 0);

  if (!items.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <Link key={i.label} to={i.to}>
          <Card hover className="flex items-center gap-3 border-warning/40 bg-warning/[0.04] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <i.icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold leading-tight">{i.count}</p>
              <p className="text-xs text-muted-foreground">{i.label}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function MiniStat({ to, label, value, icon: Icon, loading }) {
  return (
    <Link to={to}>
      <Card hover className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-10" />
          ) : (
            <p className="font-display text-lg font-semibold leading-tight">{value}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <span className="text-[11px] font-medium text-muted-foreground">Last 6 months</span>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

function FeedCard({ title, icon: Icon, href, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        {href && (
          <Link to={href} className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FeedEmpty({ label }) {
  return (
    <div className="py-8 text-center text-sm text-muted-foreground">
      <Skeleton className="mx-auto mb-3 h-8 w-8 rounded-full opacity-40" />
      {label}
    </div>
  );
}

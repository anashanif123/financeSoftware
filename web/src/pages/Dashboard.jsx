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
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { TrendChart } from '@/components/charts/TrendChart';
import { useStats, useCharts, useRecent } from '@/hooks/useApi';
import { formatCompactCurrency, formatCurrency, formatNumber, timeAgo } from '@/lib/format';

export function Dashboard() {
  const { data: stats, isLoading } = useStats();
  const { data: charts } = useCharts(6);
  const { data: recent } = useRecent();
  const s = stats?.data;
  const series = charts?.data || [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your logistics operation at a glance.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Revenue (paid)" value={formatCompactCurrency(s?.revenue)} icon={CircleDollarSign} tone="success" />
            <StatCard label="Outstanding" value={formatCompactCurrency(s?.outstanding)} icon={Clock} tone="warning" />
            <StatCard label="Commission earned" value={formatCompactCurrency(s?.commissionEarned)} icon={TrendingUp} tone="primary" />
            <StatCard label="Pending invoices" value={formatNumber(s?.pendingInvoices)} icon={Receipt} tone="neutral" hint={`${formatNumber(s?.paidInvoices)} paid`} />
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Projects" value={formatNumber(s?.totalProjects)} icon={FolderKanban} tone="primary" />
            <StatCard label="Shipments" value={formatNumber(s?.totalShipments)} icon={Ship} tone="primary" />
            <StatCard label="Paid invoices" value={formatNumber(s?.paidInvoices)} icon={Receipt} tone="success" />
            <StatCard label="Pending invoices" value={formatNumber(s?.pendingInvoices)} icon={Clock} tone="warning" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <TrendChart data={series} dataKey="revenue" formatter={(v) => formatCurrency(v)} color="hsl(var(--success))" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments received</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <TrendChart data={series} dataKey="payments" formatter={(v) => formatCurrency(v)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoices issued</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <TrendChart data={series} dataKey="invoices" formatter={formatNumber} color="hsl(243 75% 59%)" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Shipments created</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <TrendChart data={series} dataKey="shipments" formatter={formatNumber} color="hsl(190 80% 45%)" />
          </CardContent>
        </Card>
      </div>

      {/* Activity feeds */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FeedCard title="Recent activity" icon={ActivityIcon}>
          {recent?.data?.activities?.length ? (
            <ul className="space-y-3">
              {recent.data.activities.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
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
            <ul className="space-y-3">
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
            <ul className="space-y-3">
              {recent.data.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.invoice?.customer?.name || 'Payment'}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.invoice?.invoiceNumber}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-success">{formatCurrency(p.amount, p.currency)}</span>
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

function FeedCard({ title, icon: Icon, href, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
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
    <div className="py-6 text-center text-sm text-muted-foreground">
      <Skeleton className="mx-auto mb-3 h-8 w-8 rounded-full opacity-40" />
      {label}
    </div>
  );
}

import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';

export function Disputes() {
  const { data, isLoading, isError, refetch } = useList('disputes');
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Disputes" description="Billing and payment issues — opened automatically from flagged emails." />
      <Card>
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No disputes" description="When a customer email mentions a wrong amount or billing issue, a dispute is opened here." />
        ) : (
          <Table>
            <THead><tr><TH>Title</TH><TH>Type</TH><TH>Invoice</TH><TH>Status</TH><TH>Opened</TH></tr></THead>
            <TBody>
              {rows.map((d) => (
                <TR key={d.id}>
                  <TD className="font-medium">{d.title}</TD>
                  <TD className="text-muted-foreground">{(d.type || '').replace(/_/g, ' ').toLowerCase()}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{d.invoice?.invoiceNumber || '—'}</TD>
                  <TD><Badge status={d.status} /></TD>
                  <TD className="text-muted-foreground">{formatDate(d.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

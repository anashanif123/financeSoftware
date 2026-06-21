import { CreditCard, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { formatCurrency, formatDateTime } from '@/lib/format';

export function Payments() {
  const { data, isLoading, isError, refetch } = useList('payments');
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Payments" description="Manual and AI-detected payments, reconciled against invoices." />
      <Card>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments yet" description="Payments are detected automatically from Gmail confirmation emails, or recorded manually." />
        ) : (
          <Table>
            <THead><tr><TH>Invoice</TH><TH>Customer</TH><TH className="text-right">Amount</TH><TH>Method</TH><TH>Source</TH><TH>Date</TH></tr></THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.invoice?.invoiceNumber || '—'}</TD>
                  <TD className="text-muted-foreground">{p.invoice?.customer?.name || '—'}</TD>
                  <TD className="text-right font-semibold tabular-nums text-success">{formatCurrency(p.amount, p.currency)}</TD>
                  <TD className="text-muted-foreground">{p.method?.toLowerCase()}</TD>
                  <TD>{p.detectedByAi ? <Badge tone="primary"><Sparkles className="h-3 w-3" /> AI</Badge> : <Badge tone="neutral">manual</Badge>}</TD>
                  <TD className="text-muted-foreground">{formatDateTime(p.paidAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

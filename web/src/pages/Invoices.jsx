import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { formatCurrency, formatDate } from '@/lib/format';

const STATUSES = ['', 'DRAFT', 'PENDING', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

export function Invoices() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useList('invoices', { search, status });
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Invoices" description="Company invoices with commission, delivery and payment status." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <Input icon={Search} placeholder="Search invoice number…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[170px]">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All statuses'}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" description="Generate an invoice from a shipment to add your commission and send it to the customer." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Invoice</TH>
                <TH>Customer</TH>
                <TH>Project</TH>
                <TH className="text-right">Base</TH>
                <TH className="text-right">Commission</TH>
                <TH className="text-right">Total</TH>
                <TH>Status</TH>
                <TH>Issued</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((inv) => (
                <TR key={inv.id} clickable onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <TD className="font-mono text-xs font-medium">{inv.invoiceNumber}</TD>
                  <TD className="text-muted-foreground">{inv.customer?.name || '—'}</TD>
                  <TD className="text-muted-foreground">{inv.project?.name || '—'}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{formatCurrency(inv.baseCost, inv.currency)}</TD>
                  <TD className="text-right tabular-nums text-primary">{formatCurrency(inv.commissionAmount, inv.currency)}</TD>
                  <TD className="text-right font-semibold tabular-nums">{formatCurrency(inv.totalAmount, inv.currency)}</TD>
                  <TD><Badge status={inv.status} /></TD>
                  <TD className="text-muted-foreground">{formatDate(inv.issueDate)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Scale, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { api, apiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

const FLAG_TONE = { BASE_MISMATCH: 'danger', OVERPAID: 'warning', OVERDUE: 'danger', NO_COMMISSION: 'warning' };

// Fetch an export endpoint as a blob (with auth) and trigger a browser download.
async function downloadReport(type, format) {
  try {
    const res = await api.get(`/reports/${type}/export`, { params: { format }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast.error(apiError(e, 'Export failed'));
  }
}

function ExportButtons({ type }) {
  const [busy, setBusy] = useState(null);
  const run = async (format) => {
    setBusy(format);
    await downloadReport(type, format);
    setBusy(null);
  };
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" loading={busy === 'csv'} onClick={() => run('csv')}>
        <Download className="h-4 w-4" /> CSV
      </Button>
      <Button variant="secondary" size="sm" loading={busy === 'xlsx'} onClick={() => run('xlsx')}>
        <FileSpreadsheet className="h-4 w-4" /> Excel
      </Button>
    </div>
  );
}

export function Reports() {
  const { data, isLoading, isError, refetch } = useList('reports/reconciliation');
  const rows = data?.data?.rows || [];
  const summary = data?.data?.summary;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Reports & Reconciliation"
        description="Broker cost vs invoiced vs paid, with mismatch flags. Export the NFK ledger or reconciliation."
      />

      {/* Summary + exports */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Invoiced</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{formatCurrency(summary?.billedTotal || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-success">{formatCurrency(summary?.paid || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-warning">{formatCurrency(summary?.outstanding || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Commission</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">{formatCurrency(summary?.commission || 0)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {summary?.flagged || 0} of {summary?.invoices || 0} invoices flagged for attention
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Ledger (NFK):</span>
            <ExportButtons type="ledger" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Reconciliation:</span>
            <ExportButtons type="reconciliation" />
          </div>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Scale} title="Nothing to reconcile yet" description="Once invoices and payments exist, they appear here." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Invoice</TH>
                <TH>Customer</TH>
                <TH className="text-right">Broker</TH>
                <TH className="text-right">Invoiced</TH>
                <TH className="text-right">Paid</TH>
                <TH className="text-right">Outstanding</TH>
                <TH>Flags</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.invoiceId}>
                  <TD className="font-mono text-xs">{r.invoiceNumber}</TD>
                  <TD className="text-muted-foreground">{r.customer || '—'}</TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{formatCurrency(r.brokerTotal, r.currency)}</TD>
                  <TD className="text-right font-semibold tabular-nums">{formatCurrency(r.billedTotal, r.currency)}</TD>
                  <TD className="text-right tabular-nums text-success">{formatCurrency(r.paid, r.currency)}</TD>
                  <TD className="text-right tabular-nums text-warning">{formatCurrency(r.outstanding, r.currency)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {r.flags.length === 0 ? (
                        <Badge tone="success">OK</Badge>
                      ) : (
                        r.flags.map((f) => (
                          <Badge key={f} tone={FLAG_TONE[f] || 'neutral'}>
                            {f.replace(/_/g, ' ').toLowerCase()}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

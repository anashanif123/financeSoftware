import { useState } from 'react';
import { FileSpreadsheet, FileDown, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { api, apiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';

// Download the ledger as CSV / Excel (auth-aware blob download).
async function downloadLedger(format, setBusy) {
  setBusy(format);
  try {
    const res = await api.get('/reports/ledger/export', { params: { format }, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfk-ledger-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error(apiError(err, 'Export failed'));
  } finally {
    setBusy(null);
  }
}

function Money({ value, tone }) {
  const t = tone === 'pos' ? 'text-success' : tone === 'warn' ? 'text-warning' : '';
  return <span className={`tabular-nums ${t}`}>{formatCurrency(value)}</span>;
}

export function Ledger() {
  const [busy, setBusy] = useState(null);
  const { data, isLoading, isError, refetch } = useList('reports/ledger');
  const rows = data?.data?.rows || [];
  const totals = data?.data?.totals;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="NFK · New Account"
        title="Ledger"
        description="Your account register — one row per invoice, with duties, commission, total and outstanding. Auto-built from documents."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" loading={busy === 'csv'} onClick={() => downloadLedger('csv', setBusy)}>
              <FileDown className="h-4 w-4" /> CSV
            </Button>
            <Button variant="secondary" loading={busy === 'xlsx'} onClick={() => downloadLedger('xlsx', setBusy)}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        }
      />

      <Card>
        {isLoading ? (
          <TableSkeleton cols={9} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Ledger is empty"
            description="As shipments are invoiced, each one appears here — exactly like your NFK New Account sheet."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Project</TH>
                  <TH>Date</TH>
                  <TH className="text-right">No. Ctr</TH>
                  <TH>NFK Ref</TH>
                  <TH>ARS #</TH>
                  <TH>Invoice</TH>
                  <TH className="text-right">Duties</TH>
                  <TH className="text-right">Commission</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Received</TH>
                  <TH className="text-right">O/S</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r, i) => (
                  <TR key={r.invoiceNumber || i}>
                    <TD className="font-medium">{r.project}</TD>
                    <TD className="text-muted-foreground">{formatDate(r.date)}</TD>
                    <TD className="text-right tabular-nums">{r.noContainers ?? '—'}</TD>
                    <TD className="font-mono text-xs text-muted-foreground">{r.nfkRef || '—'}</TD>
                    <TD className="font-mono text-xs text-muted-foreground">{r.arsNumber || '—'}</TD>
                    <TD className="font-mono text-xs">{r.invoiceNumber}</TD>
                    <TD className="text-right"><Money value={r.duties} /></TD>
                    <TD className="text-right"><Money value={r.com} /></TD>
                    <TD className="text-right font-semibold"><Money value={r.totalExpense} /></TD>
                    <TD className="text-right"><Money value={r.received} tone="pos" /></TD>
                    <TD className="text-right"><Money value={r.outstanding} tone="warn" /></TD>
                    <TD><Badge status={r.status} /></TD>
                  </TR>
                ))}
              </TBody>
              {totals && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface-muted font-semibold">
                    <TD colSpan={2}>TOTAL</TD>
                    <TD className="text-right tabular-nums">{totals.noContainers}</TD>
                    <TD colSpan={2} />
                    <TD />
                    <TD className="text-right"><Money value={totals.duties} /></TD>
                    <TD className="text-right"><Money value={totals.com} /></TD>
                    <TD className="text-right"><Money value={totals.totalExpense} /></TD>
                    <TD className="text-right"><Money value={totals.received} tone="pos" /></TD>
                    <TD className="text-right"><Money value={totals.outstanding} tone="warn" /></TD>
                    <TD />
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

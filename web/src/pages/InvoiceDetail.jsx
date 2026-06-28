import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Send, FileDown, ToggleLeft, ToggleRight, Ship } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, Label, Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { useItem } from '@/hooks/useApi';
import { http, apiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';

export function InvoiceDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useItem('invoices', id);
  const inv = data?.data;
  const [busy, setBusy] = useState('');
  const [commission, setCommission] = useState(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['invoices'] });

  const run = async (key, fn, successMsg) => {
    setBusy(key);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy('');
    }
  };

  if (isLoading || !inv) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const c = commission ?? { commissionType: inv.commissionType, commissionRate: Number(inv.commissionRate) };

  // Live preview of what the commission will be, so the operator SEES it before saving.
  const containers = Number(inv.shipment?.containerCount || 1);
  const baseCost = Number(inv.baseCost) || 0;
  const rate = Number(c.commissionRate) || 0;
  const previewCommission =
    c.commissionType === 'FLAT'
      ? rate
      : c.commissionType === 'PER_CONTAINER'
        ? rate * containers
        : c.commissionType === 'PERCENTAGE'
          ? (baseCost * rate) / 100
          : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/invoices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Invoices
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold">{inv.invoiceNumber}</h1>
            <Badge status={inv.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{inv.customer?.name || 'No customer'} · issued {formatDate(inv.issueDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" loading={busy === 'pdf'} onClick={() => run('pdf', () => http.post(`/invoices/${id}/pdf`), 'PDF generated')}>
            <FileDown className="h-4 w-4" /> Generate PDF
          </Button>
          <Button loading={busy === 'send'} onClick={() => run('send', () => http.post(`/invoices/${id}/send`), 'Invoice sent')}>
            <Send className="h-4 w-4" /> Send invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line items + totals */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <Table>
              <THead>
                <tr><TH>Description</TH><TH className="text-right">Qty</TH><TH className="text-right">Unit</TH><TH className="text-right">Amount</TH></tr>
              </THead>
              <TBody>
                {(inv.items || []).map((it) => (
                  <TR key={it.id}>
                    <TD>{it.description}</TD>
                    <TD className="text-right tabular-nums text-muted-foreground">{Number(it.quantity)}</TD>
                    <TD className="text-right tabular-nums text-muted-foreground">{formatCurrency(it.unitPrice, inv.currency)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(it.amount, inv.currency)}</TD>
                  </TR>
                ))}
                {(!inv.items || inv.items.length === 0) && (
                  <TR><TD className="text-muted-foreground" colSpan={4}>Base cost {formatCurrency(inv.baseCost, inv.currency)} (no itemised breakdown)</TD></TR>
                )}
              </TBody>
            </Table>
            <CardContent className="border-t border-border">
              <dl className="ml-auto max-w-xs space-y-2 text-sm">
                <Row label="Base cost" value={formatCurrency(inv.baseCost, inv.currency)} />
                <Row label="Commission" value={formatCurrency(inv.commissionAmount, inv.currency)} accent />
                <div className="my-2 h-px bg-border" />
                <Row label="Total due" value={formatCurrency(inv.totalAmount, inv.currency)} bold />
                <Row label="Paid" value={formatCurrency(inv.amountPaid, inv.currency)} muted />
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Commission controls (Module 10) + shipment */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your commission</CardTitle>
              <button
                onClick={() => run('toggle', () => http.post(`/invoices/${id}/commission/toggle`), 'Commission toggled')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                disabled={busy === 'toggle'}
                title="Quickly turn commission on/off"
              >
                {inv.commissionType === 'NONE' ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5" />}
                {inv.commissionType === 'NONE' ? 'Off' : 'On'}
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>How is it charged?</Label>
                <Select value={c.commissionType} onChange={(e) => setCommission({ ...c, commissionType: e.target.value })}>
                  <option value="PER_CONTAINER">Per container (× containers)</option>
                  <option value="FLAT">Flat amount (exact $)</option>
                  <option value="PERCENTAGE">Percentage of base</option>
                  <option value="NONE">No commission</option>
                </Select>
              </div>
              {c.commissionType !== 'NONE' && (
                <div>
                  <Label>
                    {c.commissionType === 'PERCENTAGE'
                      ? 'Percentage (%)'
                      : c.commissionType === 'PER_CONTAINER'
                        ? `Amount per container (× ${containers})`
                        : 'Exact amount ($)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={c.commissionRate}
                    onChange={(e) => setCommission({ ...c, commissionRate: Number(e.target.value) })}
                    placeholder="e.g. 1400"
                  />
                </div>
              )}

              {/* Live preview before saving */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">Commission will be</span>
                <span className="font-display text-base font-semibold text-primary tabular-nums">
                  {formatCurrency(previewCommission, inv.currency)}
                </span>
              </div>

              <Button
                className="w-full"
                loading={busy === 'commission'}
                onClick={() => run('commission', () => http.patch(`/invoices/${id}/commission`, c), 'Commission saved')}
              >
                Save commission
              </Button>
              <p className="text-xs text-muted-foreground">
                Pick <span className="font-medium">Flat amount</span> to type an exact figure, or <span className="font-medium">Per container</span> for the NFK ledger style (e.g. 1400 × containers). The toggle (top-right) just turns it on/off.
              </p>
            </CardContent>
          </Card>

          {inv.shipment && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" /> Shipment</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <Link to={`/shipments/${inv.shipment.id}`} className="font-medium text-primary hover:underline">
                  {inv.shipment.shipmentNumber || inv.shipment.id}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">{inv.shipment.containerNumber}</p>
                <p className="text-xs text-muted-foreground">{Number(inv.shipment.containerCount || 1)} container(s)</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent, muted }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={[bold && 'font-display text-lg font-semibold', accent && 'text-primary', muted && 'text-muted-foreground', 'tabular-nums'].filter(Boolean).join(' ')}>{value}</dd>
    </div>
  );
}

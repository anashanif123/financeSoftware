import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Sparkles, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Label } from '@/components/ui/Input';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { http, apiError } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';

const METHODS = ['WIRE', 'ACH', 'CHECK', 'CARD', 'CASH', 'OTHER'];

function RecordPaymentModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data: invoices } = useList('invoices', { limit: 200 });
  const [form, setForm] = useState({ invoiceId: '', amount: '', method: 'WIRE', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Default the amount to the invoice's outstanding balance when one is picked.
  const onInvoice = (e) => {
    const id = e.target.value;
    const inv = (invoices?.data || []).find((i) => i.id === id);
    const due = inv ? Number(inv.totalAmount) - Number(inv.amountPaid) : 0;
    setForm((f) => ({ ...f, invoiceId: id, amount: due > 0 ? String(due) : f.amount }));
  };

  const submit = async () => {
    if (!form.invoiceId) return toast.error('Pick an invoice');
    if (!(Number(form.amount) > 0)) return toast.error('Enter an amount');
    setSaving(true);
    try {
      await http.post('/payments', {
        invoiceId: form.invoiceId,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Could not record payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record payment" description="Manually log a payment and reconcile it against an invoice.">
      <div className="space-y-4">
        <div>
          <Label>Invoice</Label>
          <Select value={form.invoiceId} onChange={onInvoice}>
            <option value="">— select —</option>
            {(invoices?.data || []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.invoiceNumber} · {i.customer?.name || '—'} · {formatCurrency(i.totalAmount, i.currency)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={set('amount')} placeholder="e.g. 1665" />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={form.method} onChange={set('method')}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>Reference (wire / transfer #)</Label>
          <Input value={form.reference} onChange={set('reference')} placeholder="optional" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Record payment</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Payments() {
  const [recording, setRecording] = useState(false);
  const { data, isLoading, isError, refetch } = useList('payments');
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payments"
        description="Manual and AI-detected payments, reconciled against invoices."
        actions={<Button onClick={() => setRecording(true)}><Plus className="h-4 w-4" /> Record payment</Button>}
      />
      <Card>
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments yet" description="Payments are detected automatically from Gmail confirmation emails, or recorded manually with the button above." />
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

      <RecordPaymentModal open={recording} onClose={() => setRecording(false)} />
    </div>
  );
}

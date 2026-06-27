import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Receipt, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { http } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';

const STATUSES = ['', 'DRAFT', 'PENDING', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];
const COMMISSION_TYPES = ['PER_CONTAINER', 'FLAT', 'PERCENTAGE', 'NONE'];

function NewInvoiceModal({ open, onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: customers } = useList('customers', { limit: 200 });
  const { data: shipments } = useList('shipments', { limit: 200 });
  const { data: projects } = useList('projects', { limit: 200 });

  const [form, setForm] = useState({
    customerId: '',
    shipmentId: '',
    projectId: '',
    baseCost: '',
    commissionType: 'PER_CONTAINER',
    commissionRate: '1400',
    currency: 'USD',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Picking a shipment pre-fills its customer and first project (operator can change).
  const onShipment = (e) => {
    const id = e.target.value;
    const ship = (shipments?.data || []).find((s) => s.id === id);
    setForm((f) => ({
      ...f,
      shipmentId: id,
      customerId: ship?.customer?.id || f.customerId,
      projectId: ship?.projects?.[0]?.id || f.projectId,
    }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await http.post('/invoices', {
        customerId: form.customerId || null,
        shipmentId: form.shipmentId || null,
        projectId: form.projectId || null,
        currency: form.currency,
        baseCost: Number(form.baseCost) || 0,
        commissionType: form.commissionType,
        commissionRate: Number(form.commissionRate) || 0,
      });
      toast.success('Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
      navigate(`/invoices/${res.data.id}`);
    } catch {
      toast.error('Could not create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New invoice" description="Pick the shipment, add the broker/duty cost, then your commission.">
      <div className="space-y-4">
        <div>
          <Label>Shipment</Label>
          <Select value={form.shipmentId} onChange={onShipment}>
            <option value="">— none —</option>
            {(shipments?.data || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.shipmentNumber || s.arsNumber || s.entryNumber || s.id.slice(-6)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Customer</Label>
            <Select value={form.customerId} onChange={set('customerId')}>
              <option value="">— none —</option>
              {(customers?.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Project</Label>
            <Select value={form.projectId} onChange={set('projectId')}>
              <option value="">— none —</option>
              {(projects?.data || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Base cost (duties + broker)</Label>
            <Input type="number" step="0.01" value={form.baseCost} onChange={set('baseCost')} placeholder="e.g. 265" />
          </div>
          <div>
            <Label>Commission type</Label>
            <Select value={form.commissionType} onChange={set('commissionType')}>
              {COMMISSION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Commission rate</Label>
            <Input type="number" step="0.01" value={form.commissionRate} onChange={set('commissionRate')} placeholder="1400" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          PER CONTAINER uses the shipment&apos;s container count (e.g. 1400 × containers). You can toggle the commission on/off later on the invoice.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create invoice</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Invoices() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useList('invoices', { search, status });
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Invoices"
        description="Company invoices with commission, delivery and payment status."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New invoice
          </Button>
        }
      />
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
          <EmptyState icon={Receipt} title="No invoices yet" description="Click “New invoice” to add a shipment’s cost and your commission, then send it to the customer." />
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

      <NewInvoiceModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

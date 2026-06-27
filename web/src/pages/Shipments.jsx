import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Ship, Plus } from 'lucide-react';
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
import { http, apiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

const STATUSES = ['', 'OPEN', 'PROCESSING', 'COMPLETED', 'CLOSED'];

function NewShipmentModal({ open, onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: customers } = useList('customers', { limit: 200 });
  const [form, setForm] = useState({
    shipmentNumber: '', arsNumber: '', entryNumber: '', blNumber: '',
    containerNumber: '', containerCount: '1', customerId: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await http.post('/shipments', {
        ...form,
        containerCount: form.containerCount === '' ? undefined : Number(form.containerCount),
        customerId: form.customerId || null,
      });
      toast.success('Shipment created');
      qc.invalidateQueries({ queryKey: ['shipments'] });
      onClose();
      navigate(`/shipments/${res.data.id}`);
    } catch (err) {
      toast.error(apiError(err, 'Could not create shipment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New shipment" description="Add a shipment manually. You can assign ARS # and projects after.">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Shipment #</Label><Input value={form.shipmentNumber} onChange={set('shipmentNumber')} placeholder="e.g. 550773455" /></div>
          <div><Label>ARS #</Label><Input value={form.arsNumber} onChange={set('arsNumber')} placeholder="e.g. Ars-060-26" /></div>
          <div><Label>Entry #</Label><Input value={form.entryNumber} onChange={set('entryNumber')} placeholder="e.g. 791-5968629-9" /></div>
          <div><Label>B/L #</Label><Input value={form.blNumber} onChange={set('blNumber')} /></div>
          <div><Label>Container #</Label><Input value={form.containerNumber} onChange={set('containerNumber')} /></div>
          <div><Label>Containers</Label><Input type="number" step="0.5" value={form.containerCount} onChange={set('containerCount')} /></div>
        </div>
        <div>
          <Label>Customer</Label>
          <Select value={form.customerId} onChange={set('customerId')}>
            <option value="">— none —</option>
            {(customers?.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create shipment</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Shipments() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useList('shipments', { search, status });
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Shipments"
        description="Every container, entry and bill of lading — auto-linked across documents."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New shipment</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <Input icon={Search} placeholder="Search by shipment, container, entry, ARS…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[160px]">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All statuses'}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Ship} title="No shipments found" description="Shipments are created automatically when broker invoices or customs documents arrive by email." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Shipment / ARS</TH>
                <TH>Container</TH>
                <TH>Entry #</TH>
                <TH>Customer</TH>
                <TH>Route</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((s) => (
                <TR key={s.id} clickable onClick={() => navigate(`/shipments/${s.id}`)}>
                  <TD className="font-medium">{s.shipmentNumber || s.arsNumber || '—'}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{s.containerNumber || '—'}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{s.entryNumber || '—'}</TD>
                  <TD className="text-muted-foreground">{s.customer?.name || '—'}</TD>
                  <TD className="text-muted-foreground">{s.originPort && s.destinationPort ? `${s.originPort} → ${s.destinationPort}` : '—'}</TD>
                  <TD><Badge status={s.status} /></TD>
                  <TD className="text-muted-foreground">{formatDate(s.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <NewShipmentModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

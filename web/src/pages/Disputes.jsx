import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Label, Textarea } from '@/components/ui/Input';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { http, apiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

const TYPES = ['WRONG_AMOUNT', 'MISSING_CHARGE', 'INVOICE_ISSUE', 'PAYMENT_ISSUE', 'OTHER'];
const STATUSES = ['OPEN', 'REVIEW', 'RESOLVED', 'CLOSED'];

function NewDisputeModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data: invoices } = useList('invoices', { limit: 200 });
  const [form, setForm] = useState({ title: '', type: 'WRONG_AMOUNT', invoiceId: '', description: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Enter a title');
    setSaving(true);
    try {
      await http.post('/disputes', {
        title: form.title,
        type: form.type,
        invoiceId: form.invoiceId || null,
        description: form.description || null,
      });
      toast.success('Dispute opened');
      qc.invalidateQueries({ queryKey: ['disputes'] });
      onClose();
      setForm({ title: '', type: 'WRONG_AMOUNT', invoiceId: '', description: '' });
    } catch (err) {
      toast.error(apiError(err, 'Could not open dispute'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New dispute" description="Log a billing or payment issue raised by a customer.">
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Wrong amount on INV-2026-0003" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onChange={set('type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </Select>
          </div>
          <div>
            <Label>Invoice (optional)</Label>
            <Select value={form.invoiceId} onChange={set('invoiceId')}>
              <option value="">— none —</option>
              {(invoices?.data || []).map((i) => (
                <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.customer?.name || '—'}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={set('description')} placeholder="What is the issue?" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Open dispute</Button>
        </div>
      </div>
    </Modal>
  );
}

function ResolveModal({ dispute, onClose }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(dispute?.status || 'OPEN');
  const [resolution, setResolution] = useState(dispute?.resolution || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await http.patch(`/disputes/${dispute.id}`, { status, resolution: resolution || null });
      toast.success('Dispute updated');
      qc.invalidateQueries({ queryKey: ['disputes'] });
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Could not update dispute'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(dispute)} onClose={onClose} title={dispute?.title} description="Update status and record how it was resolved.">
      <div className="space-y-4">
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <Label>Resolution</Label>
          <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="How was it resolved?" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Disputes() {
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState(null);
  const { data, isLoading, isError, refetch } = useList('disputes');
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Disputes"
        description="Billing and payment issues — opened automatically from flagged emails, or manually."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New dispute</Button>}
      />
      <Card>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No disputes" description="When a customer email mentions a wrong amount or billing issue, a dispute is opened here — or add one manually." />
        ) : (
          <Table>
            <THead><tr><TH>Title</TH><TH>Type</TH><TH>Invoice</TH><TH>Status</TH><TH>Opened</TH></tr></THead>
            <TBody>
              {rows.map((d) => (
                <TR key={d.id} clickable onClick={() => setActive(d)}>
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

      <NewDisputeModal open={creating} onClose={() => setCreating(false)} />
      <ResolveModal dispute={active} onClose={() => setActive(null)} />
    </div>
  );
}

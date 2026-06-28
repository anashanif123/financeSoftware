import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select, Label, Textarea } from '@/components/ui/Input';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { http, apiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

const STATUSES = ['OPEN', 'REVIEW', 'RESOLVED', 'CLOSED'];

// Disputes are raised by the CUSTOMER (auto-opened from their email). The agent
// only works/resolves them here — so there is no manual "create dispute".
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
    <Modal open={Boolean(dispute)} onClose={onClose} title={dispute?.title} description="Raised by the customer. Update status and record how you resolved it.">
      <div className="space-y-4">
        {dispute?.description && (
          <div className="rounded-xl border border-border bg-surface-muted p-3 text-sm text-muted-foreground">
            {dispute.description}
          </div>
        )}
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
  const [active, setActive] = useState(null);
  const { data, isLoading, isError, refetch } = useList('disputes');
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Disputes"
        description="Billing issues raised by customers — opened automatically from their emails. Click one to resolve it."
      />
      <Card>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No disputes" description="When a customer email mentions a wrong amount or billing issue, a dispute opens here automatically." />
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

      <ResolveModal dispute={active} onClose={() => setActive(null)} />
    </div>
  );
}

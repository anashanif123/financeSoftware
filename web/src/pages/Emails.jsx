import { useState } from 'react';
import { RefreshCw, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { http, apiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

const CATS = ['', 'SHIPMENT_DOCUMENT', 'CUSTOMS_DOCUMENT', 'BROKER_INVOICE', 'FREIGHT_INVOICE', 'PAYMENT_CONFIRMATION', 'DISPUTE', 'GENERAL'];

export function Emails() {
  const [category, setCategory] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { data, isLoading, isError, refetch } = useList('emails', { category });
  const rows = data?.data || [];

  const sync = async () => {
    setSyncing(true);
    try {
      const { data: result } = await http.post('/emails/sync', {});
      if (!result.connected) toast.error('Connect a Gmail account in Settings first');
      else toast.success(`Synced — ${result.processed} new email(s)`);
      refetch();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inbox"
        description="Emails ingested from Gmail, auto-classified by AI."
        actions={<Button variant="secondary" loading={syncing} onClick={sync}><RefreshCw className="h-4 w-4" /> Sync now</Button>}
      />
      <Card>
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-[220px]">
            {CATS.map((c) => (
              <option key={c} value={c}>{c ? c.replace(/_/g, ' ').toLowerCase() : 'All categories'}</option>
            ))}
          </Select>
        </div>
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Mail} title="No emails yet" description="Connect Gmail in Settings, then run a sync to ingest and classify your inbox." />
        ) : (
          <Table>
            <THead><tr><TH>From</TH><TH>Subject</TH><TH>Category</TH><TH className="text-right">Docs</TH><TH>Received</TH></tr></THead>
            <TBody>
              {rows.map((e) => (
                <TR key={e.id}>
                  <TD className="font-medium">{e.fromName || e.fromAddress}</TD>
                  <TD className="max-w-xs truncate text-muted-foreground">{e.subject || '(no subject)'}</TD>
                  <TD><Badge tone="neutral">{(e.category || '').replace(/_/g, ' ').toLowerCase()}</Badge></TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{e._count?.documents ?? 0}</TD>
                  <TD className="text-muted-foreground">{formatDateTime(e.receivedAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

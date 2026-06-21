import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Ship } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';

const STATUSES = ['', 'OPEN', 'PROCESSING', 'COMPLETED', 'CLOSED'];

export function Shipments() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useList('shipments', { search, status });
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Shipments" description="Every container, entry and bill of lading — auto-linked across documents." />
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
    </div>
  );
}

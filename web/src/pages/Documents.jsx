import { useState } from 'react';
import { Search, FileText, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';

const TYPES = ['', 'BROKER_INVOICE', 'CUSTOMS_DOCUMENT', 'FREIGHT_INVOICE', 'SHIPMENT_DOCUMENT', 'PAYMENT_RECEIPT', 'OTHER'];

export function Documents() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const { data, isLoading, isError, refetch } = useList('documents', { search, type });
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Document Center" description="Every shipment, customs and invoice file — stored on Cloudinary, parsed by AI." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <Input icon={Search} placeholder="Search file name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-[200px]">
            {TYPES.map((t) => (
              <option key={t} value={t}>{t ? t.replace(/_/g, ' ').toLowerCase() : 'All types'}</option>
            ))}
          </Select>
        </div>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} title="No documents" description="Documents arrive automatically via Gmail, or upload them manually." />
        ) : (
          <Table>
            <THead><tr><TH>File</TH><TH>Type</TH><TH>Shipment</TH><TH>Uploaded</TH><TH /></tr></THead>
            <TBody>
              {rows.map((d) => (
                <TR key={d.id}>
                  <TD className="font-medium">{d.fileName}</TD>
                  <TD><Badge tone="neutral">{(d.type || '').replace(/_/g, ' ').toLowerCase()}</Badge></TD>
                  <TD className="text-muted-foreground">{d.shipment?.shipmentNumber || '—'}</TD>
                  <TD className="text-muted-foreground">{formatDate(d.createdAt)}</TD>
                  <TD className="text-right">
                    <a href={d.cloudinaryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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

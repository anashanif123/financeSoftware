import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, FileText, ExternalLink, Upload } from 'lucide-react';
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
import { api, apiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

const TYPES = ['', 'BROKER_INVOICE', 'CUSTOMS_DOCUMENT', 'FREIGHT_INVOICE', 'SHIPMENT_DOCUMENT', 'PAYMENT_RECEIPT', 'OTHER'];
const UPLOAD_TYPES = TYPES.filter(Boolean);

function UploadModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data: shipments } = useList('shipments', { limit: 200 });
  const [file, setFile] = useState(null);
  const [type, setType] = useState('CUSTOMS_DOCUMENT');
  const [shipmentId, setShipmentId] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!file) return toast.error('Choose a file');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      if (shipmentId) fd.append('shipmentId', shipmentId);
      await api.post('/documents', fd);
      toast.success('Uploaded — AI is reading it');
      qc.invalidateQueries({ queryKey: ['documents'] });
      onClose();
      setFile(null);
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload document" description="The AI reads it (PDF text or vision OCR) and extracts the data.">
      <div className="space-y-4">
        <div>
          <Label>File (PDF or image)</Label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {UPLOAD_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ').toLowerCase()}</option>)}
            </Select>
          </div>
          <div>
            <Label>Link to shipment (optional)</Label>
            <Select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
              <option value="">— none —</option>
              {(shipments?.data || []).map((s) => (
                <option key={s.id} value={s.id}>{s.shipmentNumber || s.arsNumber || s.entryNumber || s.id.slice(-6)}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Upload</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Documents() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [uploading, setUploading] = useState(false);
  const { data, isLoading, isError, refetch } = useList('documents', { search, type });
  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Document Center"
        description="Every shipment, customs and invoice file — stored on Cloudinary, parsed by AI."
        actions={<Button onClick={() => setUploading(true)}><Upload className="h-4 w-4" /> Upload</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
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
          <EmptyState icon={FileText} title="No documents" description="Documents arrive automatically via Gmail, or upload them manually with the button above." />
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

      <UploadModal open={uploading} onClose={() => setUploading(false)} />
    </div>
  );
}

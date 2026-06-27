import { ClipboardCheck, Check, X, Sparkles, ExternalLink, Copy, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList } from '@/hooks/useApi';
import { http, apiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import toast from 'react-hot-toast';

// Fields worth surfacing from the AI extraction for a quick human check.
const FIELDS = [
  ['documentType', 'Type'],
  ['shipmentNumber', 'Shipment #'],
  ['entryNumber', 'Entry #'],
  ['arsNumber', 'ARS #'],
  ['blNumber', 'B/L #'],
  ['containerNumber', 'Container'],
  ['totalAmount', 'Total'],
];

function ExtractedGrid({ data }) {
  if (!data) return <p className="text-sm text-muted-foreground">No data extracted.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
      {FIELDS.map(([key, label]) =>
        data[key] != null && data[key] !== '' ? (
          <div key={key} className="text-sm">
            <span className="text-muted-foreground">{label}: </span>
            <span className="font-medium">{String(data[key])}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}

export function Review() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useList('documents', { reviewStatus: 'PENDING' });
  const rows = data?.data || [];

  const review = useMutation({
    mutationFn: ({ id, action }) => http.post(`/documents/${id}/review`, { action }),
    onSuccess: (_d, { action }) => {
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (e) => toast.error(apiError(e, 'Review failed')),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Review queue"
        description="Low-confidence AI extractions wait here. Approve to trust the data, or reject to discard it."
      />

      {isLoading ? (
        <Card><TableSkeleton cols={3} /></Card>
      ) : isError ? (
        <Card><ErrorState onRetry={refetch} /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing to review"
            description="High-confidence extractions are auto-trusted. Anything uncertain shows up here."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((doc) => {
            const conf = doc.aiConfidence != null ? Math.round(doc.aiConfidence * 100) : null;
            const isDuplicate =
              Boolean(doc.extractedData?._duplicateOf) || (doc.reviewNote || '').toLowerCase().includes('duplicate');
            return (
              <Card key={doc.id} className={`p-4 ${isDuplicate ? 'border-danger/40' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{doc.fileName}</span>
                      <Badge tone="neutral">{doc.type?.replace(/_/g, ' ').toLowerCase()}</Badge>
                      {conf != null && (
                        <Badge tone={conf >= 70 ? 'warning' : 'danger'}>
                          <Sparkles className="h-3 w-3" /> {conf}%
                        </Badge>
                      )}
                      {isDuplicate && (
                        <Badge tone="danger">
                          <Copy className="h-3 w-3" /> DUPLICATE
                        </Badge>
                      )}
                      <a
                        href={doc.cloudinaryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> open
                      </a>
                      {doc.shipment?.id && (
                        <Link
                          to={`/shipments/${doc.shipment.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          assign ARS#/projects <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <ExtractedGrid data={doc.extractedData} />
                    {isDuplicate && (
                      <p className="text-xs font-medium text-danger">
                        ⚠ This looks like a document already in the system — check before approving.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDateTime(doc.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      loading={review.isPending && review.variables?.id === doc.id && review.variables?.action === 'approve'}
                      onClick={() => review.mutate({ id: doc.id, action: 'approve' })}
                    >
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={review.isPending && review.variables?.id === doc.id && review.variables?.action === 'reject'}
                      onClick={() => review.mutate({ id: doc.id, action: 'reject' })}
                    >
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

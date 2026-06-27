import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { useItem } from '@/hooks/useApi';
import { formatCurrency } from '@/lib/format';

function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

export function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useItem('shipments', id);
  const s = data?.data;
  if (isLoading || !s) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/shipments" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Shipments
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{s.shipmentNumber || s.arsNumber || 'Shipment'}</h1>
        <Badge status={s.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Shipment #" value={s.shipmentNumber} mono />
            <Field label="ARS #" value={s.arsNumber} mono />
            <Field label="Entry #" value={s.entryNumber} mono />
            <Field label="Container" value={s.containerNumber} mono />
            <Field label="B/L #" value={s.blNumber} mono />
            <Field label="Customer" value={s.customer?.name} />
            <Field label="Projects" value={s.projects?.map((p) => p.name).join(', ') || '—'} />
            <Field label="Vessel" value={s.vessel} />
            <Field label="Voyage" value={s.voyage} />
            <Field label="Origin" value={s.originPort} />
            <Field label="Destination" value={s.destinationPort} />
            <Field label="Container type" value={s.containerType} />
            <Field label="Containers" value={s.containerCount ? Number(s.containerCount) : null} />
            <Field label="Cartons" value={s.cartonCount} />
            <Field label="Weight (kg)" value={s.weightKg} />
            <Field label="Commodity" value={s.commodity} />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Documents</CardTitle></CardHeader>
          <CardContent>
            {s.documents?.length ? (
              <ul className="space-y-2">
                {s.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <a href={d.cloudinaryUrl} target="_blank" rel="noreferrer" className="truncate text-sm text-primary hover:underline">{d.fileName}</a>
                    <Badge tone="neutral" className="shrink-0 text-[10px]">{(d.type || '').replace(/_/g, ' ').toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No documents.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /> Invoices</CardTitle></CardHeader>
          {s.invoices?.length ? (
            <Table>
              <THead><tr><TH>Invoice</TH><TH className="text-right">Total</TH><TH>Status</TH></tr></THead>
              <TBody>
                {s.invoices.map((i) => (
                  <TR key={i.id} clickable onClick={() => navigate(`/invoices/${i.id}`)}>
                    <TD className="font-mono text-xs">{i.invoiceNumber}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(i.totalAmount, i.currency)}</TD>
                    <TD><Badge status={i.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <CardContent><p className="text-sm text-muted-foreground">No invoices.</p></CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

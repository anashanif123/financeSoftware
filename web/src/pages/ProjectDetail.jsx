import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ship, Receipt, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { useItem } from '@/hooks/useApi';
import { formatCurrency, formatDate } from '@/lib/format';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useItem('projects', id);
  const p = data?.data;

  if (isLoading || !p) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{p.name}</h1>
        <Badge status={p.status} />
      </div>
      <p className="text-sm text-muted-foreground">{p.customer?.name || 'No customer'}</p>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Ship className="h-4 w-4 text-muted-foreground" /> Shipments</CardTitle></CardHeader>
        {p.shipments?.length ? (
          <Table>
            <THead><tr><TH>Shipment</TH><TH>Container</TH><TH>Status</TH></tr></THead>
            <TBody>
              {p.shipments.map((s) => (
                <TR key={s.id} clickable onClick={() => navigate(`/shipments/${s.id}`)}>
                  <TD className="font-medium">{s.shipmentNumber || s.arsNumber || '—'}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{s.containerNumber || '—'}</TD>
                  <TD><Badge status={s.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={Ship} title="No shipments" description="Shipments linked to this project will appear here." />
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /> Invoices</CardTitle></CardHeader>
        {p.invoices?.length ? (
          <Table>
            <THead><tr><TH>Invoice</TH><TH className="text-right">Total</TH><TH>Status</TH></tr></THead>
            <TBody>
              {p.invoices.map((i) => (
                <TR key={i.id} clickable onClick={() => navigate(`/invoices/${i.id}`)}>
                  <TD className="font-mono text-xs">{i.invoiceNumber}</TD>
                  <TD className="text-right tabular-nums">{formatCurrency(i.totalAmount, i.currency)}</TD>
                  <TD><Badge status={i.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={Receipt} title="No invoices" />
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Documents</CardTitle></CardHeader>
        <CardContent>
          {p.documents?.length ? (
            <ul className="space-y-2">
              {p.documents.map((d) => (
                <li key={d.id}>
                  <a href={d.cloudinaryUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{d.fileName}</a>
                  <span className="ml-2 text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

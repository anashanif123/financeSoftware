import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Receipt, Ship, FolderKanban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { useItem, useList } from '@/hooks/useApi';
import { formatCurrency, formatDate } from '@/lib/format';

const toNum = (v) => Number(v) || 0;

function Stat({ label, value, accent }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${accent || ''}`}>{value}</p>
    </Card>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('invoices');

  const { data: cust, isLoading } = useItem('customers', id);
  const invoices = useList('invoices', { customerId: id, limit: 100 }).data?.data || [];
  const shipments = useList('shipments', { customerId: id, limit: 100 }).data?.data || [];

  const c = cust?.data;
  if (isLoading || !c) return <Skeleton className="h-64 w-full" />;

  const billed = invoices.reduce((a, i) => a + toNum(i.totalAmount), 0);
  const paid = invoices.reduce((a, i) => a + toNum(i.amountPaid), 0);
  const outstanding = Math.max(0, Math.round((billed - paid) * 100) / 100);

  const TABS = [
    { key: 'invoices', label: `Invoices (${invoices.length})`, icon: Receipt },
    { key: 'shipments', label: `Shipments (${shipments.length})`, icon: Ship },
    { key: 'projects', label: `Projects (${(c.projects || []).length})`, icon: FolderKanban },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      {/* Parent header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{c.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {c.code && <span className="font-mono text-xs">{c.code}</span>}
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {c.email}</span>}
            {c.contactPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {c.contactPhone}</span>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total billed" value={formatCurrency(billed)} />
        <Stat label="Received" value={formatCurrency(paid)} accent="text-success" />
        <Stat label="Outstanding" value={formatCurrency(outstanding)} accent="text-warning" />
        <Stat label="Shipments" value={shipments.length} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <Card>
        {tab === 'invoices' &&
          (invoices.length ? (
            <Table>
              <THead><tr><TH>Invoice</TH><TH className="text-right">Total</TH><TH className="text-right">Paid</TH><TH>Status</TH><TH>Issued</TH></tr></THead>
              <TBody>
                {invoices.map((i) => (
                  <TR key={i.id} clickable onClick={() => navigate(`/invoices/${i.id}`)}>
                    <TD className="font-mono text-xs">{i.invoiceNumber}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(i.totalAmount, i.currency)}</TD>
                    <TD className="text-right tabular-nums text-muted-foreground">{formatCurrency(i.amountPaid, i.currency)}</TD>
                    <TD><Badge status={i.status} /></TD>
                    <TD className="text-muted-foreground">{formatDate(i.issueDate)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={Receipt} title="No invoices" description="Invoices for this customer will appear here." />
          ))}

        {tab === 'shipments' &&
          (shipments.length ? (
            <Table>
              <THead><tr><TH>Shipment / ARS</TH><TH>Container</TH><TH>Entry #</TH><TH>Status</TH></tr></THead>
              <TBody>
                {shipments.map((s) => (
                  <TR key={s.id} clickable onClick={() => navigate(`/shipments/${s.id}`)}>
                    <TD className="font-medium">{s.shipmentNumber || s.arsNumber || '—'}</TD>
                    <TD className="font-mono text-xs text-muted-foreground">{s.containerNumber || '—'}</TD>
                    <TD className="font-mono text-xs text-muted-foreground">{s.entryNumber || '—'}</TD>
                    <TD><Badge status={s.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={Ship} title="No shipments" description="Shipments linked to this customer will appear here." />
          ))}

        {tab === 'projects' &&
          ((c.projects || []).length ? (
            <Table>
              <THead><tr><TH>Project</TH><TH>Code</TH><TH>Status</TH></tr></THead>
              <TBody>
                {c.projects.map((p) => (
                  <TR key={p.id} clickable onClick={() => navigate(`/projects/${p.id}`)}>
                    <TD className="font-medium">{p.name}</TD>
                    <TD className="font-mono text-xs text-muted-foreground">{p.code || '—'}</TD>
                    <TD><Badge status={p.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={FolderKanban} title="No projects" description="Projects for this customer will appear here." />
          ))}
      </Card>
    </div>
  );
}

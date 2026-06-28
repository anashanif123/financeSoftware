import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Receipt, Save, FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useItem, useList } from '@/hooks/useApi';
import { http } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

// Operator step: assign the broker reference (ARS #), internal NFK ref, container
// count, and WHICH projects this shipment serves (a container can carry several brands).
function AssignCard({ shipment }) {
  const qc = useQueryClient();
  const { data: projectsData } = useList('projects', { limit: 200 });
  const allProjects = projectsData?.data || [];

  const [arsNumber, setArsNumber] = useState(shipment.arsNumber || '');
  const [nfkRef, setNfkRef] = useState(shipment.nfkRef || '');
  const [containerCount, setContainerCount] = useState(
    shipment.containerCount != null ? String(Number(shipment.containerCount)) : '',
  );
  const [projectIds, setProjectIds] = useState((shipment.projects || []).map((p) => p.id));
  const [saving, setSaving] = useState(false);

  const toggleProject = (id) =>
    setProjectIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = async () => {
    setSaving(true);
    try {
      await http.patch(`/shipments/${shipment.id}`, {
        arsNumber: arsNumber || null,
        nfkRef: nfkRef || null,
        containerCount: containerCount === '' ? undefined : Number(containerCount),
        projectIds,
      });
      await qc.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment updated');
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" /> Assign details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>ARS #</Label>
            <Input value={arsNumber} onChange={(e) => setArsNumber(e.target.value)} placeholder="e.g. Ars-060-26" />
          </div>
          <div>
            <Label>NFK Ref</Label>
            <Input value={nfkRef} onChange={(e) => setNfkRef(e.target.value)} placeholder="e.g. 281/24-25" />
          </div>
          <div>
            <Label>Containers</Label>
            <Input
              type="number"
              step="0.5"
              value={containerCount}
              onChange={(e) => setContainerCount(e.target.value)}
              placeholder="e.g. 0.5, 1, 5"
            />
          </div>
        </div>

        <div>
          <Label>Projects (this shipment serves)</Label>
          {allProjects.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allProjects.map((p) => {
                const checked = projectIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      checked ? 'border-primary/50 bg-primary/5' : 'border-input hover:border-primary/30'
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleProject(p.id)} className="accent-primary" />
                    <span className="truncate">{p.name}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create projects first, then assign them here.
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">{projectIds.length} selected</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Sum the broker/customs charges the AI extracted from this shipment's documents
// (duties from the 7501 + service charges from the broker invoice) = our base cost.
function brokerCostFromDocs(documents = []) {
  return documents.reduce((sum, d) => {
    const ex = d.extractedData;
    if (!ex) return sum;
    if (Array.isArray(ex.charges) && ex.charges.length) {
      return sum + ex.charges.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    }
    return sum + (Number(ex.totalAmount) || 0);
  }, 0);
}

export function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useItem('shipments', id);
  const s = data?.data;
  if (isLoading || !s) return <Skeleton className="h-64 w-full" />;

  const brokerCost = Math.round(brokerCostFromDocs(s.documents) * 100) / 100;
  const hasInvoice = (s.invoices || []).length > 0;

  const createInvoice = async () => {
    setCreating(true);
    try {
      const res = await http.post('/invoices', {
        shipmentId: s.id,
        customerId: s.customer?.id || null,
        projectId: s.projects?.[0]?.id || null,
        baseCost: brokerCost,
        commissionType: 'PER_CONTAINER',
        commissionRate: 1400,
      });
      toast.success('Invoice created with your commission');
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      navigate(`/invoices/${res.data.id}`);
    } catch {
      toast.error('Could not create invoice');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/shipments" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Shipments
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{s.shipmentNumber || s.arsNumber || 'Shipment'}</h1>
          <Badge status={s.status} />
        </div>
        <Button onClick={createInvoice} loading={creating}>
          <Receipt className="h-4 w-4" /> {hasInvoice ? 'Create another invoice' : 'Create invoice'}
        </Button>
      </div>

      {/* AI cost summary — makes the document→invoice automation visible at a glance. */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
          <Stat label="Documents" value={s.documents?.length || 0} />
          <Stat label="AI base cost" value={formatCurrency(brokerCost)} accent />
          <Stat label="Containers" value={s.containerCount ? Number(s.containerCount) : '—'} />
          <Stat label="Commission @1400/ctr" value={formatCurrency((Number(s.containerCount) || 0) * 1400)} />
        </CardContent>
      </Card>

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

      <AssignCard shipment={s} />

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

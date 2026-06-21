import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList, useCreate } from '@/hooks/useApi';
import { apiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

export function Projects() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useList('projects', { search });
  const { data: customers } = useList('customers', { limit: 100 });
  const create = useCreate('projects');
  const [form, setForm] = useState({ name: '', customerId: '', description: '' });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ ...form, customerId: form.customerId || null });
      toast.success('Project created');
      setOpen(false);
      setForm({ name: '', customerId: '', description: '' });
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const rows = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Projects"
        description="Group shipments, invoices and documents per customer engagement."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Input
            icon={Search}
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project, or let the email processor create them automatically from incoming documents."
            action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New project</Button>}
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Project</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH className="text-right">Shipments</TH>
                <TH className="text-right">Invoices</TH>
                <TH>Created</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id} clickable onClick={() => navigate(`/projects/${p.id}`)}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="text-muted-foreground">{p.customer?.name || '—'}</TD>
                  <TD><Badge status={p.status} /></TD>
                  <TD className="text-right tabular-nums">{p._count?.shipments ?? 0}</TD>
                  <TD className="text-right tabular-nums">{p._count?.invoices ?? 0}</TD>
                  <TD className="text-muted-foreground">{formatDate(p.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New project" description="Projects organise a customer’s shipments and invoices.">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="p-name">Project name</Label>
            <Input id="p-name" required placeholder="e.g. CARHART 08.04.25" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="p-customer">Customer</Label>
            <Select id="p-customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">— None —</option>
              {(customers?.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create project</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

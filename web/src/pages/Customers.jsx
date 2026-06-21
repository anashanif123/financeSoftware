import { useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useList, useCreate } from '@/hooks/useApi';
import { apiError } from '@/lib/api';

export function Customers() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useList('customers', { search });
  const create = useCreate('customers');
  const [form, setForm] = useState({ name: '', email: '', country: '' });
  const rows = data?.data || [];

  const submit = async (e) => {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      toast.success('Customer added');
      setOpen(false);
      setForm({ name: '', email: '', country: '' });
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Customers" description="The end customers you invoice." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New customer</Button>} />
      <Card>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Input icon={Search} placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No customers" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New customer</Button>} />
        ) : (
          <Table>
            <THead><tr><TH>Name</TH><TH>Email</TH><TH>Country</TH><TH className="text-right">Projects</TH><TH className="text-right">Invoices</TH></tr></THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="text-muted-foreground">{c.email || '—'}</TD>
                  <TD className="text-muted-foreground">{c.country || '—'}</TD>
                  <TD className="text-right tabular-nums">{c._count?.projects ?? 0}</TD>
                  <TD className="text-right tabular-nums">{c._count?.invoices ?? 0}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New customer">
        <form onSubmit={submit} className="space-y-4">
          <div><Label htmlFor="c-name">Name</Label><Input id="c-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label htmlFor="c-email">Email</Label><Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label htmlFor="c-country">Country</Label><Input id="c-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Add customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

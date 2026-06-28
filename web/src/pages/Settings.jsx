import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, Link2, Building2, KeyRound, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { http, api, apiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/store/auth';

// Change the logged-in user's password (e.g. replace the seeded default before handoff).
function SecurityCard() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (newPassword !== confirm) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await http.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed');
      setCurrent('');
      setNew('');
      setConfirm('');
    } catch (err) {
      toast.error(apiError(err, 'Could not change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /> Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Current password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Label>Confirm new</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} loading={saving} disabled={!currentPassword || !newPassword}>Change password</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const { data: gmail, refetch, isLoading } = useQuery({ queryKey: ['gmail-status'], queryFn: () => http.get('/gmail/status') });
  const status = gmail?.data;

  // Surface the OAuth callback result.
  useEffect(() => {
    if (params.get('connected')) {
      toast.success('Gmail connected');
      refetch();
      params.delete('connected');
      setParams(params, { replace: true });
    }
    if (params.get('error')) {
      toast.error('Gmail connection failed');
      params.delete('error');
      setParams(params, { replace: true });
    }
  }, [params, setParams, refetch]);

  const connect = async () => {
    try {
      const { data } = await http.get('/gmail/connect');
      window.location.href = data.url;
    } catch (err) {
      toast.error(apiError(err, 'Gmail OAuth is not configured'));
    }
  };

  const disconnect = async () => {
    try {
      await http.post('/gmail/disconnect');
      toast.success('Gmail disconnected');
      refetch();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Workspace, integrations and billing identity." />

      {/* Gmail integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Gmail integration</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : status?.connected ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm font-medium">{status.connection?.emailAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    Last sync {status.connection?.lastSyncAt ? formatDateTime(status.connection.lastSyncAt) : 'never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="success" status="ACTIVE">Connected</Badge>
                {user?.role === 'ADMIN' && <Button variant="secondary" size="sm" onClick={disconnect}>Disconnect</Button>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-6 text-center sm:flex-row sm:items-center sm:text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><Link2 className="h-5 w-5 text-muted-foreground" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Connect a Gmail account</p>
                <CardDescription>Grant read, attachment and send access so Clearway can ingest documents and email invoices.</CardDescription>
              </div>
              {user?.role === 'ADMIN' && <Button onClick={connect}>Connect Gmail</Button>}
            </div>
          )}
        </CardContent>
      </Card>

      <CompanyCard />

      <SecurityCard />
    </div>
  );
}

// Editable company identity (printed on invoice PDFs) + logo upload.
function CompanyCard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => http.get('/settings') });
  const company = data?.data?.company;
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (company && !form) setForm({ name: company.name || '', email: company.email || '', address: company.address || '' });
  }, [company, form]);

  const f = form || { name: '', email: '', address: '' };
  const set = (k) => (e) => setForm({ ...f, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put('/settings/companyName', { value: f.name }),
        api.put('/settings/companyEmail', { value: f.email }),
        api.put('/settings/companyAddress', { value: f.address }),
      ]);
      toast.success('Company info saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      toast.error(apiError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/settings/logo', fd);
      toast.success('Logo updated');
      qc.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      toast.error(apiError(err, 'Logo upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Company identity</CardTitle>
        <CardDescription>Printed on the invoices your customers receive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload logo
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">PNG/JPG — shown on invoice PDFs.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Company name</Label><Input value={f.name} onChange={set('name')} /></div>
          <div><Label>Billing email</Label><Input value={f.email} onChange={set('email')} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={f.address} onChange={set('address')} /></div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Save company info</Button>
        </div>
      </CardContent>
    </Card>
  );
}

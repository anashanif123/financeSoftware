import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, Link2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { http, apiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/store/auth';

export function Settings() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => http.get('/settings') });
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

  const company = settings?.data?.company;

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

      {/* Company identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Company identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="Company name" value={company?.name} />
          <Detail label="Billing email" value={company?.email} />
          <Detail label="Address" value={company?.address} className="sm:col-span-2" />
          <Detail label="Default commission" value={`${settings?.data?.commission?.defaultType} · ${settings?.data?.commission?.defaultRate}`} />
        </CardContent>
        <CardContent className="border-t border-border pt-4">
          <CardDescription>These values are set via environment variables and printed on invoices. Edit them in the API <span className="font-mono text-xs">.env</span> or the settings store.</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value, className }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || '—'}</p>
    </div>
  );
}

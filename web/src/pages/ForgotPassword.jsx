import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { http, apiError } from '@/lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await http.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle={sent ? 'Check your inbox for a reset link.' : 'Enter your email and we’ll send a reset link.'}
    >
      {sent ? (
        <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link is on its way.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" icon={Mail} placeholder="you@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" loading={loading} size="lg" className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </AuthLayout>
  );
}

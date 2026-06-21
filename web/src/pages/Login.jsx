import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { http, apiError } from '@/lib/api';
import { useAuth } from '@/store/auth';

export function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await http.post('/auth/login', form);
      setSession(data);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      toast.error(apiError(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Enter your details to continue.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <Button type="submit" loading={loading} size="lg" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
      <div className="mt-6 rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
        Demo · <span className="font-mono">admin@clearway.app</span> / <span className="font-mono">ChangeMe123!</span>
      </div>
    </AuthLayout>
  );
}

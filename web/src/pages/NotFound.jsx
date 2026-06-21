import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">The page you’re looking for doesn’t exist or was moved.</p>
      <Link to="/" className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}

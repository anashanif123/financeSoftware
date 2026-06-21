import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <div className="bg-dotgrid flex min-h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-gradient font-display text-[6rem] font-semibold leading-none tracking-tight">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you’re looking for doesn’t exist or may have been moved.
      </p>
      <Link to="/" className="mt-7">
        <Button size="lg">Back to dashboard</Button>
      </Link>
    </div>
  );
}

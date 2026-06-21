import { Boxes, Ship, FileCheck2, CircleDollarSign } from 'lucide-react';

// Split-screen auth layout: branded marketing panel + form. Feels like Mercury/Ramp.
export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[hsl(224_36%_7%)] p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, hsl(243 80% 60%), transparent 40%), radial-gradient(circle at 80% 70%, hsl(190 80% 50%), transparent 40%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Clearway</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-2xl font-semibold leading-snug">
            The operating system for customs &amp; freight invoicing.
          </h2>
          <p className="mt-3 text-sm text-white/60">
            From broker invoice to customer payment — automated, reconciled, and auditable.
          </p>
          <div className="mt-8 space-y-4">
            {[
              [Ship, 'Shipments auto-created from broker emails'],
              [FileCheck2, 'AI reads 7501s, invoices & customs docs'],
              [CircleDollarSign, 'Commission added, paid status detected from Gmail'],
            ].map(([Icon, text], i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Clearway. All rights reserved.</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="font-semibold">Clearway</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

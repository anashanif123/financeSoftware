import { Anchor, Ship, FileCheck2, CircleDollarSign } from 'lucide-react';

// Split-screen auth: an emerald brand panel with a gold accent + a focused form.
export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      {/* Left: brand panel */}
      <div className="bg-emerald-mesh relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-[0.5]" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 animate-float rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <Anchor className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent" />
          </div>
          <span className="font-display text-xl font-semibold">Clearway</span>
        </div>

        <div className="relative max-w-md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent/90">
            Customs &amp; Freight OS
          </p>
          <h2 className="font-display text-[2.1rem] font-semibold leading-[1.15]">
            From broker invoice to customer payment — on autopilot.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Clearway reads your inbox, understands every shipping document, adds your commission,
            and reconciles payments — so the paperwork runs itself.
          </p>
          <div className="mt-9 space-y-3">
            {[
              [Ship, 'Shipments auto-created from broker emails'],
              [FileCheck2, 'AI reads 7501s, invoices & customs docs'],
              [CircleDollarSign, 'Commission added, payments detected from Gmail'],
            ].map(([Icon, text], i) => (
              <div
                key={i}
                className="animate-rise flex items-center gap-3 text-sm text-white/85"
                style={{ animationDelay: `${0.15 + i * 0.1}s` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Clearway. All rights reserved.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Anchor className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">Clearway</span>
          </div>
          <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

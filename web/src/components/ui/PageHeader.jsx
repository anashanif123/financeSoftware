// Page-level header. Title renders in the serif display face (via base styles).
export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-semibold leading-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

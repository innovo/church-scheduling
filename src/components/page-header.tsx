import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker ? (
          <p className="mb-1 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-display text-3xl leading-tight font-medium tracking-tight text-fg sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

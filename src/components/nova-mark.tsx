import { cn } from "@/lib/utils";
import { CHURCH_NAME, CHURCH_CITY } from "@/lib/church/types";

/** The church's actual logo mark (public/brand/logo*.png). */
export function NovaMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-64.png"
      alt={CHURCH_NAME}
      className={cn("size-5 object-contain", className)}
    />
  );
}

export function NovaWordmark({
  subtitle,
  inverted,
}: {
  subtitle?: string;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-md",
          inverted ? "bg-primary-fg text-primary" : "bg-primary text-primary-fg",
        )}
      >
        <NovaMark className="size-6" />
      </span>
      <span>
        <span className="block font-display text-lg leading-none font-medium">{CHURCH_NAME}</span>
        <span className="mt-0.5 block text-[11px] tracking-[0.14em] text-muted uppercase">
          {subtitle ?? CHURCH_CITY}
        </span>
      </span>
    </div>
  );
}

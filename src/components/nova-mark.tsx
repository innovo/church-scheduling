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
      {/* Logo mark is itself blue-toned, so it always sits on a light badge
          (never a blue one) or it disappears into a blue surface. */}
      <span className="grid size-9 place-items-center rounded-md bg-white shadow-sm ring-1 ring-black/5">
        <NovaMark className="size-6" />
      </span>
      <span>
        <span
          className={cn(
            "block font-display text-lg leading-none font-medium",
            inverted ? "text-primary-fg" : "text-fg",
          )}
        >
          {CHURCH_NAME}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[11px] tracking-[0.14em] uppercase",
            inverted ? "text-primary-fg/70" : "text-muted",
          )}
        >
          {subtitle ?? CHURCH_CITY}
        </span>
      </span>
    </div>
  );
}

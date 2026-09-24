import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  hue = 140,
  size = "md",
  className,
}: {
  name: string;
  hue?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? "size-8 text-[11px]" : size === "lg" ? "size-14 text-lg" : "size-10 text-xs";
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-medium text-primary",
        dim,
        className,
      )}
      style={{ background: `oklch(0.92 0.03 ${hue})` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

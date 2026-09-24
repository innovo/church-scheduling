import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "muted" | "primary" | "warm" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "primary" && "bg-primary text-primary-fg",
        tone === "muted" && "bg-secondary text-muted",
        tone === "warm" && "bg-bg-warm text-fg",
        className,
      )}
      {...props}
    />
  );
}

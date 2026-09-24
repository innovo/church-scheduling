import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-28 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg shadow-sm placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getGivingStatus } from "@/lib/church/payments";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/give/thanks")({ component: GiveThanks });

function GiveThanks() {
  const ref = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : null;
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "unknown">("checking");

  useEffect(() => {
    if (!ref) {
      setStatus("unknown");
      return;
    }
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      const res = await getGivingStatus({ data: ref });
      if (cancelled) return;
      if (res.status === "paid") {
        setStatus("paid");
        return;
      }
      tries += 1;
      if (tries < 6) {
        setTimeout(poll, 2000);
      } else {
        setStatus("pending");
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        {status === "checking" ? (
          <p className="text-muted">Confirming your payment…</p>
        ) : status === "paid" ? (
          <>
            <h1 className="font-display text-3xl font-medium">Thank you</h1>
            <p className="mt-2 text-sm text-muted">Your gift has been received. Grateful for your generosity.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-medium">Almost done</h1>
            <p className="mt-2 text-sm text-muted">
              We're still waiting to hear back from the payment provider. If your card was charged, this will update
              shortly. No need to pay again.
            </p>
          </>
        )}
        <Button asChild className="mt-6">
          <Link to="/home">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}

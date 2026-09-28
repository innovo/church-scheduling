import { useEffect, useState } from "react";
import { getPaymentSettings, setPaymentGatewayEnabled } from "@/lib/church/payments";
import { Button } from "@/components/ui/button";

type GatewayStatus = { configured: boolean; enabled: boolean };

/** Turn PayFast/Yoco on or off. Shared between the Give page (Configure payment
 * methods) and, for tenant admins, anywhere else it's useful to embed. */
export function PaymentSettings() {
  const [settings, setSettings] = useState<{ payfast: GatewayStatus; yoco: GatewayStatus } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => getPaymentSettings().then(setSettings);
  useEffect(() => {
    refresh();
  }, []);

  async function toggle(gateway: "payfast" | "yoco", enabled: boolean) {
    setBusy(gateway);
    try {
      await setPaymentGatewayEnabled({ data: { gateway, enabled } });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!settings) return <div className="h-24 animate-pulse rounded-xl bg-bg-warm" />;

  const rows: { id: "payfast" | "yoco"; label: string; envVars: string }[] = [
    { id: "payfast", label: "PayFast", envVars: "PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY" },
    { id: "yoco", label: "Yoco", envVars: "YOCO_SECRET_KEY" },
  ];

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const s = settings[row.id];
        return (
          <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{row.label}</p>
              {s.configured ? (
                <p className="text-sm text-muted">Keys detected, ready to enable.</p>
              ) : (
                <p className="text-sm text-destructive">
                  Not set up yet. Add {row.envVars} in Vercel's Environment Variables, then redeploy.
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant={s.enabled ? "outline" : "default"}
              disabled={!s.configured || busy === row.id}
              onClick={() => toggle(row.id, !s.enabled)}
            >
              {s.enabled ? "Turn off" : "Turn on"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

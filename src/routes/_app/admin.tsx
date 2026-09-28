import { useEffect, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { listPeopleForAdmin, setPersonAdmin, setPersonRole, setPersonStatus } from "@/lib/church/api";
import { getPaymentSettings, setPaymentGatewayEnabled } from "@/lib/church/payments";
import { useMe } from "@/lib/church/me-context";
import { ROLES, personName, type Person } from "@/lib/church/types";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type GatewayStatus = { configured: boolean; enabled: boolean };

function PaymentSettings() {
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

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

function AdminPage() {
  const me = useMe();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = () => listPeopleForAdmin().then((p) => {
    setPeople(p);
    setLoading(false);
  });

  useEffect(() => {
    if (me.isAdmin) refresh();
  }, [me.isAdmin]);

  if (!me.isAdmin) return <Navigate to="/home" />;

  const pending = people.filter((p) => p.status === "pending");
  const rest = people.filter((p) => p.status !== "pending");

  async function withBusy(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Admin"
        title="People & approvals"
        description="Approve new sign-ups, and set who's staff, a volunteer, or an admin."
      />

      <section className="mb-8">
        <h2 className="mb-3 font-display text-xl font-medium">Payment gateways</h2>
        <PaymentSettings />
      </section>

      {pending.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-medium">
            Waiting for approval <span className="text-muted">({pending.length})</span>
          </h2>
          <ul className="space-y-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]"
              >
                <Avatar name={personName(p)} hue={p.avatarHue} photoUrl={p.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{personName(p)}</p>
                  <p className="truncate text-sm text-muted">{p.email || "No email"}</p>
                </div>
                <Button
                  size="sm"
                  disabled={busyId === p.id}
                  onClick={() => withBusy(p.id, () => setPersonStatus({ data: { personId: p.id, status: "approved" } }))}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === p.id}
                  onClick={() => withBusy(p.id, () => setPersonStatus({ data: { personId: p.id, status: "declined" } }))}
                >
                  Decline
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-display text-xl font-medium">Everyone</h2>
        <p className="mb-3 text-sm text-muted">
          Everyone in the church, whether or not they have a login. Set each person's permission level, and decide
          who else can be an admin.
        </p>
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-bg-warm" />
        ) : (
          <ul className="space-y-2">
            {rest.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]"
              >
                <Avatar name={personName(p)} hue={p.avatarHue} photoUrl={p.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {personName(p)} {p.isAdmin ? <Badge className="ml-1">Admin</Badge> : null}
                  </p>
                  <p className="truncate text-sm text-muted">{p.email || "No email"}</p>
                  <p className="text-xs text-faint">{p.userId ? "Has a login" : "No login yet"}</p>
                </div>
                <select
                  value={p.role}
                  disabled={busyId === p.id}
                  onChange={(e) => withBusy(p.id, () => setPersonRole({ data: { personId: p.id, role: e.target.value } }))}
                  className="h-9 rounded-md border border-input bg-surface px-2 text-sm capitalize"
                  title="Permission level"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === p.id || p.id === me.id || (!p.isAdmin && !p.userId)}
                  title={!p.userId && !p.isAdmin ? "This person doesn't have a login yet" : undefined}
                  onClick={() => withBusy(p.id, () => setPersonAdmin({ data: { personId: p.id, isAdmin: !p.isAdmin } }))}
                >
                  {p.isAdmin ? "Remove admin" : "Make admin"}
                </Button>
                {p.status === "declined" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => withBusy(p.id, () => setPersonStatus({ data: { personId: p.id, status: "approved" } }))}
                  >
                    Re-approve
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

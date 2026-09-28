import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import {
  listPeopleForAdmin,
  setPersonAdmin,
  setPersonRole,
  setPersonStatus,
  setPersonTenantAdmin,
  deletePerson,
  getBranding,
  updateBranding,
} from "@/lib/church/api";
import { uploadImage } from "@/lib/church/upload";
import { getPaymentSettings, setPaymentGatewayEnabled } from "@/lib/church/payments";
import { useMe } from "@/lib/church/me-context";
import { ROLES, personName, type Person, type Branding } from "@/lib/church/types";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

function BrandingSettings() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => getBranding().then(setBranding);
  useEffect(() => {
    refresh();
  }, []);

  async function onPickLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !branding) return;
    setError(null);
    if (file.size > 4 * 1024 * 1024) {
      setError("Logo is too large, max 4MB");
      return;
    }
    setLogoBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { url } = await uploadImage({ data: { dataUrl, kind: "logo" } });
      setBranding({ ...branding, logoUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload logo");
    } finally {
      setLogoBusy(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!branding) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await updateBranding({
        data: {
          name: String(fd.get("name")),
          tagline: String(fd.get("tagline")),
          address: String(fd.get("address")),
          email: String(fd.get("email")),
          phone: String(fd.get("phone")),
          logoUrl: branding.logoUrl,
          primaryColor: String(fd.get("primaryColor") || ""),
        },
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save branding");
    } finally {
      setBusy(false);
    }
  }

  if (!branding) return <div className="h-40 animate-pulse rounded-xl bg-bg-warm" />;

  return (
    <form className="space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <Label>Logo (optional, max 4MB)</Label>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={logoBusy}
          className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-bg text-sm text-muted"
        >
          {logoBusy ? (
            "Uploading…"
          ) : branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            "Tap to add a logo"
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onPickLogo}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Church name</Label>
        <Input id="name" name="name" defaultValue={branding.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tagline">Tagline</Label>
        <Textarea id="tagline" name="tagline" defaultValue={branding.tagline} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={branding.address} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Contact email</Label>
          <Input id="email" name="email" type="email" defaultValue={branding.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Contact phone</Label>
          <Input id="phone" name="phone" defaultValue={branding.phone} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="primaryColor">Primary color</Label>
        <div className="flex items-center gap-2">
          <input
            id="primaryColor"
            name="primaryColor"
            type="color"
            defaultValue={branding.primaryColor || "#7a4a2b"}
            className="h-10 w-14 rounded-md border border-input bg-surface p-1"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy || logoBusy}>
        {busy ? "Saving…" : "Save branding"}
      </Button>
    </form>
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

  async function onDeletePerson(p: Person) {
    if (!window.confirm(`Remove ${personName(p)}? This can't be undone.`)) return;
    await withBusy(p.id, () => deletePerson({ data: p.id }));
  }

  return (
    <div>
      <PageHeader
        kicker="Admin"
        title="People & approvals"
        description="Approve new sign-ups, and set who's staff, a volunteer, or an admin."
      />

      {me.isTenantAdmin ? (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-medium">Branding</h2>
          <p className="mb-3 text-sm text-muted">
            The church's name, tagline, contact details, logo, and color, shown across the app.
          </p>
          <BrandingSettings />
        </section>
      ) : null}

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
                    {personName(p)} {p.isTenantAdmin ? <Badge className="ml-1">Tenant admin</Badge> : null}{" "}
                    {p.isAdmin ? <Badge className="ml-1">Admin</Badge> : null}
                  </p>
                  <p className="truncate text-sm text-muted">{p.email || "No email"}</p>
                  <p className="text-xs text-faint">{p.userId ? "Has a login" : "No login yet"}</p>
                </div>
                <select
                  value={p.role}
                  disabled={busyId === p.id || (p.role === "pastor" && !me.isTenantAdmin)}
                  onChange={(e) => withBusy(p.id, () => setPersonRole({ data: { personId: p.id, role: e.target.value } }))}
                  className="h-9 rounded-md border border-input bg-surface px-2 text-sm capitalize"
                  title="Permission level"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} disabled={r === "pastor" && !me.isTenantAdmin}>
                      {r}
                    </option>
                  ))}
                </select>
                {me.isTenantAdmin ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === p.id || p.id === me.id || (!p.isAdmin && !p.userId)}
                      title={!p.userId && !p.isAdmin ? "This person doesn't have a login yet" : undefined}
                      onClick={() => withBusy(p.id, () => setPersonAdmin({ data: { personId: p.id, isAdmin: !p.isAdmin } }))}
                    >
                      {p.isAdmin ? "Remove admin" : "Make admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === p.id || p.id === me.id || (!p.isTenantAdmin && !p.userId)}
                      title={!p.userId && !p.isTenantAdmin ? "This person doesn't have a login yet" : undefined}
                      onClick={() =>
                        withBusy(p.id, () =>
                          setPersonTenantAdmin({ data: { personId: p.id, isTenantAdmin: !p.isTenantAdmin } }),
                        )
                      }
                    >
                      {p.isTenantAdmin ? "Remove tenant admin" : "Make tenant admin"}
                    </Button>
                  </>
                ) : null}
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
                {me.isTenantAdmin ? (
                  <button
                    type="button"
                    title="Remove person"
                    disabled={busyId === p.id || p.id === me.id}
                    onClick={() => onDeletePerson(p)}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-destructive hover:text-white disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

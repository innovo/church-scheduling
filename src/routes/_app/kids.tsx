import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Printer, QrCode, Search } from "lucide-react";
import {
  checkInChild,
  checkOutChild,
  listChildren,
  registerChild,
  scanCheckIn,
  todayCheckins,
} from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import { CHURCH_NAME, type Checkin, type ChildRecord } from "@/lib/church/types";
import { ageYears } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrMark } from "@/components/qr-code";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_app/kids")({ component: KidsPage });

const SERVICES = ["Sunday 09:30", "Launch 08:30", "Launch 10:30"];

function KidsPage() {
  const me = useMe();
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [service, setService] = useState(SERVICES[0]!);
  const [q, setQ] = useState("");
  const [scan, setScan] = useState("");
  const [badge, setBadge] = useState<Checkin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walkOpen, setWalkOpen] = useState(false);

  async function reload() {
    const [c, k] = await Promise.all([listChildren(), todayCheckins()]);
    setChildren(c);
    setCheckins(k);
  }
  useEffect(() => {
    reload().catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load"));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return children;
    return children.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(s));
  }, [children, q]);

  const onSite = checkins.filter((c) => !c.checkedOutAt);
  const byRoom = onSite.reduce<Record<string, Checkin[]>>((acc, c) => {
    (acc[c.room] ||= []).push(c);
    return acc;
  }, {});

  async function onCheckIn(childId: number) {
    setError(null);
    try {
      const res = await checkInChild({ data: { childId, serviceLabel: service } });
      setBadge(res);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed");
    }
  }

  async function onScan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await scanCheckIn({ data: { qrToken: scan, serviceLabel: service } });
      setBadge(res);
      setScan("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    }
  }

  async function onOut(id: number, code?: string) {
    try {
      await checkOutChild({ data: { checkinId: id, pickupCode: code } });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-out failed");
    }
  }

  function printRoster() {
    window.print();
  }

  return (
    <div>
      <PageHeader
        kicker="Kids Church"
        title="Check-in"
        description="QR badges, pickup codes, and a printed roster for the rooms. Works with any Wi‑Fi printer via the browser."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWalkOpen(true)}>
              Walk-in
            </Button>
            <Button variant="secondary" onClick={printRoster}>
              <Printer className="size-4" /> Print roster
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Label htmlFor="service" className="text-muted">
          Service
        </Label>
        <select
          id="service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="h-11 rounded-md border border-input bg-surface px-3 text-sm"
        >
          {SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Badge tone="primary">{onSite.length} in rooms</Badge>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {me.isOps ? (
        <form onSubmit={onScan} className="mb-6 flex gap-2">
          <Input
            value={scan}
            onChange={(e) => setScan(e.target.value.toUpperCase())}
            placeholder="Scan or type a QR token (HL-……)"
            className="font-mono"
          />
          <Button type="submit">
            <QrCode className="size-4" /> Check in
          </Button>
        </form>
      ) : null}

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="onsite">On site</TabsTrigger>
          <TabsTrigger value="badges">QR badges</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-faint" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name"
              className="pl-10"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title="No children yet"
              description="Add your child, or use Walk-in for a guest family."
              action={
                <Button onClick={() => setWalkOpen(true)}>Add a child</Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
              {filtered.map((c) => {
                const age = ageYears(c.birthday);
                const current = onSite.find((k) => k.childPeopleId === c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-sm text-muted">
                        {age != null ? `${age} yrs` : "Age unknown"}
                        {c.parentName ? ` · ${c.parentName}` : ""}
                        {c.allergies ? ` · Allergy: ${c.allergies}` : ""}
                      </p>
                    </div>
                    {current ? (
                      <Badge tone="primary">In {current.room}</Badge>
                    ) : (
                      <Button size="sm" onClick={() => onCheckIn(c.id)}>
                        Check in
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="onsite" className="mt-4" id="print-area">
          <div className="print:block">
            <h2 className="mb-1 hidden font-display text-2xl print:block">
              Kids Church roster · {service}
            </h2>
            <p className="mb-4 hidden text-sm text-muted print:block">
              {new Date().toLocaleDateString("en-ZA")} · Keep pickup codes at the desk, never on the child.
            </p>
            {Object.keys(byRoom).length === 0 ? (
              <EmptyState title="Rooms are empty" description="Check children in from Register or by scanning a badge." />
            ) : (
              Object.entries(byRoom).map(([room, list]) => (
                <section key={room} className="mb-6">
                  <h3 className="font-display text-xl font-medium">{room}</h3>
                  <table className="mt-2 w-full text-left text-sm">
                    <thead>
                      <tr className="text-muted">
                        <th className="py-2 font-medium">Child</th>
                        <th className="py-2 font-medium">Allergy</th>
                        <th className="py-2 font-medium">Pickup</th>
                        <th className="py-2 font-medium print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((c) => (
                        <tr key={c.id} className="border-t border-border">
                          <td className="py-2">{c.childName}</td>
                          <td className="py-2">{c.allergies || "—"}</td>
                          <td className="py-2 font-mono tracking-widest">{c.pickupCode}</td>
                          <td className="py-2 print:hidden">
                            <Button size="sm" variant="outline" onClick={() => onOut(c.id, c.pickupCode)}>
                              Check out
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <p className="mb-4 text-sm text-muted">
            Print these for the household fridge. Scanning the code at the desk checks the child in.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {children.map((c) => (
              <article
                key={c.id}
                className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] print:break-inside-avoid"
              >
                <QrMark value={c.qrToken} size={112} />
                <div>
                  <p className="font-display text-lg font-medium">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="font-mono text-xs tracking-wider text-muted">{c.qrToken}</p>
                  <p className="mt-2 text-xs text-muted">{CHURCH_NAME} · Kids Church</p>
                  {c.allergies ? (
                    <p className="mt-1 text-xs font-medium text-destructive">Allergy: {c.allergies}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" /> Print badges
          </Button>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(badge)} onOpenChange={() => setBadge(null)}>
        <DialogContent>
          {badge ? (
            <>
              <DialogHeader>
                <DialogTitle>{badge.childName} is in</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted">
                {badge.room} · {badge.serviceLabel}
              </p>
              <div className="mt-4 flex flex-col items-center gap-3">
                <QrMark value={badge.qrToken} size={180} />
                <p className="text-sm text-muted">Show this code at pickup</p>
                <p className="font-display text-5xl tracking-[0.2em]">{badge.pickupCode}</p>
                {badge.allergies ? (
                  <p className="text-sm font-medium text-destructive">Allergy: {badge.allergies}</p>
                ) : null}
                <Button variant="secondary" onClick={() => window.print()}>
                  Print badge
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <WalkInDialog
        open={walkOpen}
        onOpenChange={setWalkOpen}
        onCreated={async (id) => {
          setWalkOpen(false);
          await onCheckIn(id);
        }}
      />
    </div>
  );
}

function WalkInDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const res = await registerChild({
      data: {
        firstName: String(fd.get("firstName")),
        lastName: String(fd.get("lastName")),
        birthday: String(fd.get("birthday") || "") || undefined,
        allergies: String(fd.get("allergies") || "") || undefined,
        walkIn: true,
      },
    });
    setBusy(false);
    onCreated(res.id);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Walk-in child</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" name="birthday" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="allergies">Allergies</Label>
            <Input id="allergies" name="allergies" placeholder="None" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Add and check in"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

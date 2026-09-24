import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { give, myGiving } from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import { FUNDS, type Contribution } from "@/lib/church/types";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/give")({ component: GivePage });

const PRESETS = [10000, 25000, 50000, 100000];

function GivePage() {
  const me = useMe();
  const [amount, setAmount] = useState(25000);
  const [fund, setFund] = useState("general");
  const [method, setMethod] = useState("card");
  const [note, setNote] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [history, setHistory] = useState<Contribution[]>([]);
  const [totals, setTotals] = useState<{ fund: string; total: number }[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    myGiving().then((d) => {
      setHistory(d.history);
      setTotals(d.totals);
    });
  }
  useEffect(reload, []);

  async function onGive(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDone(null);
    try {
      await give({
        data: { amountCents: amount, fund, method, note: note || undefined, anonymous, recurring },
      });
      setDone(
        `Thank you. ${formatMoney(amount)} to ${FUNDS.find((f) => f.id === fund)?.label} is recorded. In production this step talks to PayFast, SnapScan, or Stripe.`,
      );
      setNote("");
      reload();
    } catch (err) {
      setDone(err instanceof Error ? err.message : "Could not give");
    } finally {
      setBusy(false);
    }
  }

  const yearTotal = history.reduce((s, h) => s + h.amountCents, 0);

  return (
    <div>
      <PageHeader
        kicker="Stewardship"
        title="Give"
        description="We are a family that shares. Gifts are private unless you choose otherwise."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={onGive} className="space-y-5 lg:col-span-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className={`h-12 rounded-md text-sm font-medium ${
                  amount === p ? "bg-primary text-primary-fg" : "bg-secondary"
                }`}
              >
                {formatMoney(p)}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom">Or another amount (R)</Label>
            <Input
              id="custom"
              type="number"
              min={10}
              value={amount / 100}
              onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100))}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Fund</legend>
            <div className="grid gap-2">
              {FUNDS.map((f) => (
                <label
                  key={f.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    fund === f.id ? "border-primary bg-surface" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="fund"
                    className="mt-1"
                    checked={fund === f.id}
                    onChange={() => setFund(f.id)}
                  />
                  <span>
                    <span className="block font-medium">{f.label}</span>
                    <span className="text-sm text-muted">{f.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["card", "Card"],
              ["eft", "EFT"],
              ["snapscan", "SnapScan"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`h-11 rounded-md text-sm ${method === id ? "bg-primary text-primary-fg" : "bg-secondary"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            Make this monthly
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Give without showing my name to staff
          </label>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Processing…" : `Give ${formatMoney(amount)}`}
          </Button>
          {done ? <p className="text-sm text-muted">{done}</p> : null}
        </form>

        <aside className="lg:col-span-2">
          <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
            <p className="text-xs tracking-wide text-muted uppercase">Your giving</p>
            <p className="mt-1 font-display text-3xl">{formatMoney(yearTotal)}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {history.length === 0 ? (
                <li className="text-muted">No gifts recorded yet.</li>
              ) : (
                history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3">
                    <span>
                      {FUNDS.find((f) => f.id === h.fund)?.label}
                      {h.recurring ? " · monthly" : ""}
                    </span>
                    <span className="tabular-nums">{formatMoney(h.amountCents)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          {me.isStaff && totals.length ? (
            <div className="mt-4 rounded-xl bg-primary p-5 text-primary-fg">
              <p className="text-xs tracking-wide uppercase opacity-70">Staff · fund totals</p>
              <ul className="mt-3 space-y-2 text-sm">
                {totals.map((t) => (
                  <li key={t.fund} className="flex justify-between">
                    <span className="capitalize">{t.fund}</span>
                    <span className="tabular-nums">{formatMoney(t.total)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs opacity-70">Individual named gifts stay with the pastor’s books, not this screen.</p>
            </div>
          ) : null}
          <p className="mt-4 text-xs text-muted">
            Section 18A receipts and debit orders belong in a later finance phase. This tab records intent and history
            so the rest of the house can be designed around it.
          </p>
        </aside>
      </div>
    </div>
  );
}

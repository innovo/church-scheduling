import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { updateProfile } from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import { AGE_GROUPS } from "@/lib/church/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { QrMark } from "@/components/qr-code";
import { UserButton } from "@/lib/auth/gates";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const me = useMe();
  const [firstName, setFirst] = useState(me.firstName);
  const [lastName, setLast] = useState(me.lastName);
  const [phone, setPhone] = useState(me.phone || "");
  const [bio, setBio] = useState(me.bio || "");
  const [ageGroup, setAge] = useState(me.ageGroup);
  const [birthday, setBirthday] = useState(me.birthday || "");
  const [address, setAddress] = useState(me.address || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await updateProfile({
      data: { firstName, lastName, phone, bio, ageGroup, birthday: birthday || undefined, address },
    });
    setBusy(false);
    setSaved(true);
  }

  return (
    <div>
      <PageHeader kicker="You" title="Profile" description="How we know you. Keep this kind, and current." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={onSave} className="space-y-3 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first">First name</Label>
              <Input id="first" value={firstName} onChange={(e) => setFirst(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last">Last name</Label>
              <Input id="last" value={lastName} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="age">Age group</Label>
            <select
              id="age"
              value={ageGroup}
              onChange={(e) => setAge(e.target.value as typeof ageGroup)}
              className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm"
            >
              {AGE_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">A sentence about you</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </Button>
          {saved ? <p className="text-sm text-muted">Saved. Refresh to see it on the home greeting.</p> : null}
        </form>
        <aside className="space-y-4">
          <div className="rounded-xl bg-surface p-5 text-center shadow-[var(--shadow-card)]">
            <Avatar name={`${firstName} ${lastName}`} hue={me.avatarHue} size="lg" className="mx-auto" />
            <p className="mt-3 font-display text-xl">
              {firstName} {lastName}
            </p>
            <p className="text-sm text-muted capitalize">{me.role}</p>
            <div className="mt-4 flex justify-center">
              <UserButton />
            </div>
          </div>
          <div className="rounded-xl bg-surface p-5 text-center shadow-[var(--shadow-card)]">
            <p className="text-xs tracking-wide text-muted uppercase">Your member QR</p>
            <div className="mt-3 flex justify-center">
              <QrMark value={me.qrToken} size={160} />
            </div>
            <p className="mt-2 font-mono text-xs tracking-wider text-muted">{me.qrToken}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

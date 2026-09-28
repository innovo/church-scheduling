import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { updateProfile } from "@/lib/church/api";
import { uploadImage } from "@/lib/church/upload";
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
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ProfilePage() {
  const me = useMe();
  const [firstName, setFirst] = useState(me.firstName);
  const [lastName, setLast] = useState(me.lastName);
  const [phone, setPhone] = useState(me.phone || "");
  const [bio, setBio] = useState(me.bio || "");
  const [ageGroup, setAge] = useState(me.ageGroup);
  const [birthday, setBirthday] = useState(me.birthday || "");
  const [address, setAddress] = useState(me.address || "");
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await updateProfile({
      data: { firstName, lastName, phone, bio, ageGroup, birthday: birthday || undefined, address, avatarUrl },
    });
    setBusy(false);
    setSaved(true);
  }

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("Image is too large, max 4MB");
      const dataUrl = await fileToDataUrl(file);
      const { url } = await uploadImage({ data: { dataUrl, kind: "avatar" } });
      setAvatarUrl(url);
      await updateProfile({
        data: { firstName, lastName, phone, bio, ageGroup, birthday: birthday || undefined, address, avatarUrl: url },
      });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    setPwBusy(true);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (res.error) throw new Error(res.error.message || "Could not change password");
      setPwSaved(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPwBusy(false);
    }
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
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={avatarBusy}
              className="relative mx-auto block rounded-full"
              title="Change photo"
            >
              <Avatar
                name={`${firstName} ${lastName}`}
                hue={me.avatarHue}
                photoUrl={avatarUrl}
                size="lg"
                className="mx-auto size-20 text-xl"
              />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/0 text-[11px] font-medium text-transparent transition hover:bg-black/40 hover:text-white">
                {avatarBusy ? "…" : "Change"}
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickAvatar}
            />
            {avatarError ? <p className="mt-2 text-xs text-destructive">{avatarError}</p> : null}
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
          <form onSubmit={onChangePassword} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
            <p className="text-xs tracking-wide text-muted uppercase">Change password</p>
            <div className="mt-3 space-y-2">
              <Input
                type="password"
                placeholder="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              {pwError ? <p className="text-xs text-destructive">{pwError}</p> : null}
              {pwSaved ? <p className="text-xs text-muted">Password updated.</p> : null}
              <Button type="submit" variant="outline" className="w-full" disabled={pwBusy}>
                {pwBusy ? "Saving…" : "Update password"}
              </Button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

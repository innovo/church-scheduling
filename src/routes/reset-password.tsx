import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NovaMark } from "@/components/nova-mark";
import { APP_NAME } from "@/lib/church/types";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This reset link is missing its token. Request a new one from the sign-in page.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) throw new Error(res.error.message || "Could not reset password");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-display text-2xl text-primary">
          <NovaMark className="size-6" />
          {APP_NAME}
        </Link>

        {done ? (
          <>
            <h2 className="font-display text-3xl font-medium tracking-tight">Password reset</h2>
            <p className="mt-2 text-sm text-muted">You can sign in with your new password now.</p>
            <Button asChild className="mt-6 w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-3xl font-medium tracking-tight">Choose a new password</h2>
            <form className="mt-8 space-y-3" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Saving…" : "Save new password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

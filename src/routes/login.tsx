import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { authEnabled, authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NovaMark } from "@/components/nova-mark";
import { useBranding } from "@/lib/church/branding-context";
import { APP_NAME } from "@/lib/church/types";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const branding = useBranding();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && user) return <Navigate to="/home" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "reset") {
        const res = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (res.error) throw new Error(res.error.message || "Could not send reset email");
        setNotice("If that email has an account, a reset link is on its way.");
        setBusy(false);
        return;
      }
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0]! });
        if (res.error) throw new Error(res.error.message || "Could not create account");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Could not sign in");
      }
      window.location.href = "/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function onSocial(provider: "google" | "twitter") {
    setError(null);
    try {
      const res = await authClient.signIn.social({ provider, callbackURL: "/home" });
      if (res.error) throw new Error(res.error.message || `Could not sign in with ${provider}`);
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `${provider === "google" ? "Google" : "X"} sign-in isn't set up yet.`,
      );
    }
  }

  return (
    <main className="min-h-dvh bg-bg lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary lg:block">
        <img
          src="/images/sanctuary.jpg"
          alt="Worship at Awake the Nations"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-fg">
          <p className="flex items-center gap-2 font-display text-2xl">
            <span className="grid size-9 place-items-center rounded-md bg-white shadow-sm">
              <NovaMark className="size-6" />
            </span>
            {APP_NAME}
          </p>
          <div>
            <p className="text-sm tracking-[0.18em] uppercase opacity-80">Welcome home</p>
            <h1 className="mt-2 font-display text-5xl leading-[1.05] font-medium">
              {branding.tagline}
            </h1>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 font-display text-2xl text-primary">
            <NovaMark className="size-6" />
            {APP_NAME}
          </Link>
          <h2 className="font-display text-3xl font-medium tracking-tight">
            {mode === "reset" ? "Reset your password" : "Sign in"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {mode === "reset"
              ? "Enter your email and we'll send a reset link."
              : `Members, volunteers, and staff of ${branding.name}.`}
          </p>

          {isPending ? <div className="mt-8 h-11 animate-pulse rounded-md bg-bg-warm" /> : null}

          {authEnabled && mode !== "reset" ? (
            <div className="mt-8 space-y-3">
              <Button type="button" variant="outline" className="w-full" onClick={() => onSocial("google")}>
                Continue with Google
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => onSocial("twitter")}>
                Continue with X
              </Button>
            </div>
          ) : null}
          {!authEnabled ? <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p> : null}

          {mode !== "reset" ? (
            <div className="my-6 flex items-center gap-3 text-xs tracking-wide text-faint uppercase">
              <span className="h-px flex-1 bg-border" />
              or with email
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : (
            <div className="mt-8" />
          )}

          <form className="space-y-3" onSubmit={onEmail}>
            {mode === "up" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            {mode !== "reset" ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "in" ? (
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-fg"
                      onClick={() => {
                        setMode("reset");
                        setError(null);
                        setNotice(null);
                      }}
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {notice ? <p className="text-sm text-muted">{notice}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "reset"
                  ? "Send reset link"
                  : mode === "up"
                    ? "Create account"
                    : "Sign in with email"}
            </Button>
          </form>

          {mode === "reset" ? (
            <button
              type="button"
              className="mt-4 text-sm text-muted hover:text-fg"
              onClick={() => {
                setMode("in");
                setError(null);
                setNotice(null);
              }}
            >
              Back to sign in
            </button>
          ) : (
            <button
              type="button"
              className="mt-4 text-sm text-muted hover:text-fg"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/church/api";
import { MeContext } from "@/lib/church/me-context";
import { useBranding } from "@/lib/church/branding-context";
import { CHURCH_LEADERSHIP } from "@/lib/church/types";
import type { Me } from "@/lib/church/types";
import { AppShell, AuthGate } from "@/components/app-shell";
import { NovaMark } from "@/components/nova-mark";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  return (
    <AuthGate>
      <ChurchFrame />
    </AuthGate>
  );
}

function ChurchFrame() {
  const { user } = useCurrentUserState();
  const branding = useBranding();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getMe({ data: { name: user.displayName, email: user.primaryEmail } })
      .then(setMe)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load profile"));
  }, [user]);

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-dvh bg-bg px-6 py-16">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-md bg-bg-warm" />
          <div className="h-48 animate-pulse rounded-xl bg-bg-warm" />
        </div>
      </div>
    );
  }

  if (me.status === "pending") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6">
        <div className="max-w-sm text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <NovaMark className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-medium">Almost there, {me.firstName}.</h1>
          <p className="mt-2 text-sm text-muted">
            Your account is waiting for approval from {CHURCH_LEADERSHIP[0]?.name ?? "a pastor"} or an admin at{" "}
            {branding.name}. We'll let you in as soon as it's approved, no need to sign up again.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => signOut("/")}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (me.status === "declined") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-2xl font-medium">Account not approved</h1>
          <p className="mt-2 text-sm text-muted">
            Reach out to {CHURCH_LEADERSHIP[0]?.name ?? "a pastor"} at {branding.name} if you think this is a mistake.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => signOut("/")}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MeContext.Provider value={me}>
      <AppShell me={me}>
        <Outlet />
      </AppShell>
    </MeContext.Provider>
  );
}

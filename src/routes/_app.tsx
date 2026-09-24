import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/church/api";
import { MeContext } from "@/lib/church/me-context";
import type { Me } from "@/lib/church/types";
import { AppShell, AuthGate } from "@/components/app-shell";

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

  return (
    <MeContext.Provider value={me}>
      <AppShell me={me}>
        <Outlet />
      </AppShell>
    </MeContext.Provider>
  );
}

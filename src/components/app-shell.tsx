import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Calendar,
  Baby,
  Headphones,
  HeartHandshake,
  Newspaper,
  Users,
  MessageCircle,
  Library,
  FolderOpen,
  UserRound,
  Menu,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { cn, initials } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NovaWordmark } from "@/components/nova-mark";
import { CHURCH_NAME, type Me } from "@/lib/church/types";

const primary = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/kids", label: "Kids", icon: Baby },
  { to: "/sermons", label: "Sermons", icon: Headphones },
  { to: "/give", label: "Give", icon: HeartHandshake },
] as const;

const more = [
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/teams", label: "Teams", icon: FolderOpen },
  { to: "/directory", label: "Directory", icon: UserRound },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/resources", label: "Resources", icon: Library },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  onClick?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-fg" : "text-fg/80 hover:bg-secondary",
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

export function AppShell({ me, children }: { me: Me; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const account = (
    <div className="flex items-center gap-3 rounded-lg bg-secondary/70 p-3">
      <Link
        to="/profile"
        onClick={() => setMenuOpen(false)}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-medium text-primary-fg">
          {initials(me.displayName)}
        </span>
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm font-medium">{me.displayName}</span>
          <span className="block truncate text-xs text-muted capitalize">{me.role}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label="Sign out"
        disabled={signingOut}
        className="grid size-11 place-items-center rounded-md text-muted hover:bg-surface"
        onClick={() => {
          setSigningOut(true);
          void signOut().catch(() => setSigningOut(false));
        }}
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-2 pt-1 pb-5">
        <NovaWordmark />
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        <div className="space-y-1">
          {primary.map((item) => (
            <NavLink key={item.to} {...item} onClick={() => setMenuOpen(false)} />
          ))}
        </div>
        <div>
          <p className="mb-2 px-3 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
            Church life
          </p>
          <div className="space-y-1">
            {more.map((item) => (
              <NavLink key={item.to} {...item} onClick={() => setMenuOpen(false)} />
            ))}
          </div>
        </div>
      </nav>
      <div className="mt-4">{account}</div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-surface p-4 lg:flex">
        {sidebar}
      </aside>

      <div className="lg:pl-60">
        <header
          data-print-hide
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur-md lg:hidden"
        >
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md hover:bg-secondary"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="font-display text-lg font-medium">{CHURCH_NAME}</p>
          <Link to="/profile" className="grid size-11 place-items-center">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-medium text-primary-fg">
              {initials(me.displayName)}
            </span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
      </div>

      <nav
        data-print-hide
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {primary.slice(0, 4).map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                more.some((m) => pathname === m.to) || pathname === "/give" || pathname === "/profile"
                  ? "text-primary"
                  : "text-muted",
              )}
            >
              <MoreHorizontal className="size-5" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetTitle className="mb-4">Church life</SheetTitle>
          <div className="grid grid-cols-3 gap-2 pb-4">
            {[
              ...more,
              { to: "/give" as const, label: "Give", icon: HeartHandshake },
              { to: "/profile" as const, label: "Profile", icon: UserRound },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-medium"
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg px-6 py-16">
        <div className="mx-auto max-w-md space-y-4">
          <div className="h-8 w-40 animate-pulse rounded-md bg-bg-warm" />
          <div className="h-40 animate-pulse rounded-xl bg-bg-warm" />
          <div className="h-24 animate-pulse rounded-xl bg-bg-warm" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}

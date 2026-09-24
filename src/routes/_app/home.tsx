import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Baby, HeartHandshake, Users } from "lucide-react";
import { getHome } from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import { CHURCH_NAME, imageSrc, type ChurchEvent, type NewsPost, type Sermon } from "@/lib/church/types";
import { formatMoney, formatWhen } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/_app/home")({ component: HomePage });

function HomePage() {
  const user = useCurrentUser();
  const fallback = useMe();
  const [me, setMe] = useState(fallback);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [teams, setTeams] = useState<string[]>([]);
  const [given, setGiven] = useState(0);
  const [kids, setKids] = useState(0);

  useEffect(() => {
    getHome({ data: { name: user?.displayName, email: user?.primaryEmail } }).then((d) => {
      setMe(d.me);
      setEvents(d.events);
      setNews(d.news);
      setSermon(d.sermon);
      setTeams(d.teams);
      setGiven(d.givenCents);
      setKids(d.kidsOnSite);
    });
  }, [user]);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        kicker={CHURCH_NAME}
        title={`${hello}, ${me.firstName}.`}
        description={
          me.role === "pastor"
            ? "You are signed in as pastor — the first account on this church. The house is yours to tend."
            : "Here is the week ahead. Come as you are."
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat to="/kids" label="Kids on site" value={String(kids)} icon={Baby} />
        <Stat to="/teams" label="Your teams" value={teams.length ? teams.join(", ") : "None yet"} icon={Users} />
        <Stat to="/give" label="You have given" value={formatMoney(given)} icon={HeartHandshake} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl font-medium">This week</h2>
            <Link to="/events" className="text-sm text-muted hover:text-fg">
              All events
            </Link>
          </div>
          <div className="space-y-3">
            {events.map((ev) => (
              <Link
                key={ev.id}
                to="/events/$eventId"
                params={{ eventId: String(ev.id) }}
                className="flex gap-4 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]"
              >
                <img src={imageSrc(ev.imageKey)} alt="" className="h-28 w-28 shrink-0 object-cover sm:h-32 sm:w-36" />
                <div className="min-w-0 py-3 pr-4">
                  <p className="text-xs text-muted">{formatWhen(ev.startsAt)}</p>
                  <h3 className="font-display text-lg font-medium">{ev.title}</h3>
                  <p className="truncate text-sm text-muted">{ev.location}</p>
                  {ev.mine ? <p className="mt-1 text-xs text-primary">You’re going</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 font-display text-2xl font-medium">Noticeboard</h2>
          <div className="space-y-3">
            {news.map((n) => (
              <Link key={n.id} to="/news" className="block rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
                {n.pinned ? (
                  <p className="text-[11px] tracking-[0.14em] text-primary uppercase">Pinned</p>
                ) : null}
                <h3 className="font-display text-lg font-medium">{n.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{n.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {sermon ? (
        <Link
          to="/sermons"
          className="mt-8 flex flex-col overflow-hidden rounded-2xl bg-primary text-primary-fg sm:flex-row"
        >
          <img src={imageSrc(sermon.imageKey)} alt="" className="h-44 w-full object-cover sm:h-auto sm:w-56" />
          <div className="flex flex-1 flex-col justify-center p-6">
            <p className="text-[11px] tracking-[0.16em] uppercase opacity-70">Latest sermon</p>
            <h2 className="mt-1 font-display text-2xl font-medium">{sermon.title}</h2>
            <p className="mt-1 text-sm opacity-80">
              {sermon.speaker} · {sermon.scripture}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm">
              Listen <ArrowRight className="size-4" />
            </span>
          </div>
        </Link>
      ) : null}

      {me.isOps ? (
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/kids">Open check-in desk</Link>
          </Button>
          {me.isStaff ? (
            <Button asChild variant="outline">
              <Link to="/news">Post news</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  to,
  label,
  value,
  icon: Icon,
}: {
  to: string;
  label: string;
  value: string;
  icon: typeof Baby;
}) {
  return (
    <Link to={to} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" />
        <span className="text-xs tracking-wide uppercase">{label}</span>
      </div>
      <p className="mt-2 truncate font-display text-xl font-medium">{value}</p>
    </Link>
  );
}

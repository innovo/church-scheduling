import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, MapPin, Clock, Mail, Phone } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { publicHappenings } from "@/lib/church/public-content";
import {
  CHURCH_ADDRESS,
  CHURCH_CITY,
  CHURCH_EMAIL,
  CHURCH_MAP,
  CHURCH_NAME,
  CHURCH_PHONE,
  CHURCH_TAGLINE,
  CHURCH_VISION,
  CHURCH_WEBSITE,
  CORE_VALUES,
  SUNDAY_TIME,
  imageSrc,
} from "@/lib/church/types";
import { Button } from "@/components/ui/button";
import { NovaMark } from "@/components/nova-mark";
import { formatWhen } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user, isPending } = useCurrentUserState();
  const { events, sermon } = publicHappenings();

  if (!isPending && user) return <Navigate to="/home" />;

  return (
    <main className="bg-bg text-fg">
      <header className="flex items-center justify-between px-5 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-fg">
            <NovaMark />
          </span>
          <span className="font-display text-xl leading-none">{CHURCH_NAME}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/login">Join us</Link>
          </Button>
        </div>
      </header>

      <section className="relative mx-4 overflow-hidden rounded-2xl bg-primary md:mx-10">
        <img
          src="/images/sanctuary.jpg"
          alt="Worship at Awake the Nations"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-primary/20" />
        <div className="relative flex h-[28rem] flex-col justify-end p-6 text-primary-fg sm:h-[36rem] sm:p-10">
          <p className="text-xs tracking-[0.22em] uppercase opacity-80">Join us this Sunday</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl leading-[1.05] font-medium sm:text-6xl">
            {CHURCH_TAGLINE}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-primary-fg/85 sm:text-base">
            An Awake house in {CHURCH_CITY} — worshipping together, growing together, and reaching the
            nations.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg" variant="onDark">
              <Link to="/login">
                Enter church <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghostDark">
              <a href="#gatherings">What's on</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-5 py-12 md:grid-cols-3 md:px-10">
        <Fact
          kicker="Sundays"
          title={SUNDAY_TIME}
          body="Join us every Sunday for worship, prayer, and the Word."
        />
        <Fact kicker="Find us" title={CHURCH_CITY} body={CHURCH_ADDRESS} />
        <Fact
          kicker="Kids"
          title="Especially welcome"
          body="Dedicated kids' ministry every Sunday so the whole family can belong."
        />
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-10">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">New here?</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-medium sm:text-4xl">
          An Awake house, reaching the nations.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          {CHURCH_NAME} is a growing community devoted to worship, prayer, and making disciples of all
          nations. Whatever your background, you are welcome to come as you are and join us as we seek to
          awaken the nations to the presence and power of God.
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{CHURCH_VISION}</p>
      </section>

      <section id="gatherings" className="mx-auto max-w-5xl px-5 pb-16 md:px-10">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">Open to the city</p>
        <h2 className="mt-2 font-display text-3xl font-medium">Coming up</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {events.map((ev) => (
            <article key={ev.id} className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
              <img src={imageSrc(ev.imageKey)} alt="" className="h-40 w-full object-cover" />
              <div className="p-5">
                <h3 className="font-display text-xl font-medium">{ev.title}</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                  <Clock className="size-4" /> {formatWhen(ev.startsAt)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                  <MapPin className="size-4" /> {ev.location}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-10">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">The foundations</p>
        <h2 className="mt-2 font-display text-3xl font-medium">How we hope to live</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {CORE_VALUES.map((v) => (
            <div key={v.title} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-xl font-medium">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mb-16 overflow-hidden rounded-2xl bg-primary text-primary-fg md:mx-10">
        <div className="grid md:grid-cols-2">
          <img src={imageSrc(sermon.imageKey)} alt="" className="h-56 w-full object-cover md:h-full" />
          <div className="p-8">
            <p className="text-[11px] tracking-[0.16em] uppercase opacity-70">Latest teaching</p>
            <h2 className="mt-2 font-display text-3xl font-medium">{sermon.title}</h2>
            <p className="mt-3 text-sm italic opacity-80">
              {sermon.speaker} · {sermon.scripture}
            </p>
            <p className="mt-4 text-sm leading-relaxed opacity-90">{sermon.description}</p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/login">Listen to our latest teaching</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-16 grid max-w-5xl gap-4 px-5 md:grid-cols-3 md:px-10">
        <a
          href={CHURCH_MAP}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <MapPin className="size-4 text-primary" />
          <h3 className="mt-3 font-display text-xl font-medium">Find us</h3>
          <p className="mt-1 text-sm text-muted">{CHURCH_ADDRESS}</p>
        </a>
        <a href={`tel:${CHURCH_PHONE.replace(/\s+/g, "")}`} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
          <Phone className="size-4 text-primary" />
          <h3 className="mt-3 font-display text-xl font-medium">Call us</h3>
          <p className="mt-1 text-sm text-muted">{CHURCH_PHONE}</p>
        </a>
        <a href={`mailto:${CHURCH_EMAIL}`} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
          <Mail className="size-4 text-primary" />
          <h3 className="mt-3 font-display text-xl font-medium">Say hello</h3>
          <p className="mt-1 text-sm text-muted">{CHURCH_EMAIL}</p>
        </a>
      </section>

      <footer className="border-t border-border px-5 py-10 text-sm text-muted md:px-10">
        <p className="font-display text-lg text-fg">{CHURCH_NAME}</p>
        <p className="mt-1">
          {CHURCH_ADDRESS} · {CHURCH_CITY}
        </p>
        <p className="mt-3">Sundays at {SUNDAY_TIME}</p>
        <p className="mt-3">
          <a href={CHURCH_WEBSITE} className="underline decoration-border underline-offset-4 hover:text-fg">
            {CHURCH_WEBSITE.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
          {" · "}
          <a href={`mailto:${CHURCH_EMAIL}`} className="hover:text-fg">
            {CHURCH_EMAIL}
          </a>
        </p>
      </footer>
    </main>
  );
}

function Fact({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
      <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{kicker}</p>
      <h3 className="mt-2 font-display text-2xl font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

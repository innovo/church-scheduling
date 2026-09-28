import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Trash2 } from "lucide-react";
import { listSermons, deleteSermon } from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import { imageSrc, type Sermon } from "@/lib/church/types";
import { formatDay } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/sermons")({ component: SermonsPage });

function SermonsPage() {
  const me = useMe();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [current, setCurrent] = useState<Sermon | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function reload() {
    listSermons().then((rows) => {
      setSermons(rows);
      setCurrent((prev) => (prev && rows.some((r) => r.id === prev.id) ? prev : (rows[0] ?? null)));
    });
  }
  useEffect(reload, []);

  async function onDelete(id: number) {
    if (!window.confirm("Delete this sermon? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteSermon({ data: id });
      reload();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Listen"
        title="Sermons"
        description="Sunday’s word, kept for the week. Pastor Zion, Pastor Fedillio, and whoever God raises to teach."
      />
      {current ? <Player sermon={current} /> : null}
      <div className="mt-8 space-y-3">
        {sermons.map((s) => (
          <div
            key={s.id}
            className="flex w-full items-center gap-4 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]"
          >
            <button type="button" onClick={() => setCurrent(s)} className="flex flex-1 gap-4 text-left">
              <img src={imageSrc(s.imageKey)} alt="" className="h-24 w-24 shrink-0 object-cover" />
              <div className="py-3 pr-4">
                <p className="text-xs text-muted">{s.series}</p>
                <h2 className="font-display text-lg font-medium">{s.title}</h2>
                <p className="text-sm text-muted">
                  {s.speaker} · {s.scripture} · {formatDay(s.preachedAt)}
                </p>
              </div>
            </button>
            {me.isStaff ? (
              <button
                type="button"
                title="Delete sermon"
                disabled={deletingId === s.id}
                onClick={() => onDelete(s.id)}
                className="mr-4 grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-destructive hover:text-white"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Player({ sermon }: { sermon: Sermon }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [clip, setClip] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setT(0);
    setClip(0);
    if (audio.current) {
      audio.current.pause();
      audio.current.currentTime = 0;
    }
  }, [sermon.id]);

  const duration = clip > 0 ? clip : sermon.durationSeconds;
  const pct = Math.min(100, (t / duration) * 100);
  const mm = (n: number) => {
    const m = Math.floor(n / 60);
    const s = Math.floor(n % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-primary text-primary-fg">
      <div className="grid md:grid-cols-[18rem_1fr]">
        <img src={imageSrc(sermon.imageKey)} alt="" className="h-48 w-full object-cover md:h-full" />
        <div className="p-6">
          <Badge tone="warm">{sermon.series}</Badge>
          <h2 className="mt-3 font-display text-3xl font-medium">{sermon.title}</h2>
          <p className="mt-1 text-sm opacity-80">
            {sermon.speaker} · {sermon.scripture}
          </p>
          <p className="mt-4 text-sm leading-relaxed opacity-90">{sermon.description}</p>
          <audio
            ref={audio}
            src="/audio/reflection.wav"
            onTimeUpdate={() => setT(audio.current?.currentTime ?? 0)}
            onLoadedMetadata={() => {
              const d = audio.current?.duration ?? 0;
              if (d && Number.isFinite(d)) setClip(d);
            }}
            onEnded={() => setPlaying(false)}
          />
          <div className="mt-6 flex items-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              className="size-14 rounded-full"
              onClick={() => {
                const el = audio.current;
                if (!el) return;
                if (playing) {
                  el.pause();
                  setPlaying(false);
                } else {
                  void el.play();
                  setPlaying(true);
                }
              }}
            >
              {playing ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
            </Button>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-primary-fg/20">
                <div className="h-full bg-primary-fg" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 font-mono text-xs tabular-nums opacity-70">
                {mm(t)} / {mm(duration)}
              </p>
            </div>
          </div>
          {sermon.transcript ? (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm opacity-80">Transcript</summary>
              <p className="mt-3 text-sm leading-relaxed opacity-90">{sermon.transcript}</p>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}

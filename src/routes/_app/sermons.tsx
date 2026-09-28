import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Trash2 } from "lucide-react";
import { listSermons, deleteSermon, createSermon } from "@/lib/church/api";
import { uploadAudio, uploadImage } from "@/lib/church/upload";
import { useMe } from "@/lib/church/me-context";
import { sermonImageSrc, type Sermon } from "@/lib/church/types";
import { formatDay } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/sermons")({ component: SermonsPage });

function SermonsPage() {
  const me = useMe();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [current, setCurrent] = useState<Sermon | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

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

  const canAdd = me.isStaff || me.isAdmin;

  return (
    <div>
      <PageHeader
        kicker="Listen"
        title="Sermons"
        description="Sunday’s word, kept for the week. Pastor Zion, Pastor Fedillio, and whoever God raises to teach."
        actions={canAdd ? <Button onClick={() => setOpen(true)}>New sermon</Button> : null}
      />
      {current ? <Player sermon={current} /> : null}
      <div className="mt-8 space-y-3">
        {sermons.map((s) => (
          <div
            key={s.id}
            className="flex w-full items-center gap-4 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]"
          >
            <button type="button" onClick={() => setCurrent(s)} className="flex flex-1 gap-4 text-left">
              <img src={sermonImageSrc(s)} alt="" className="h-24 w-24 shrink-0 object-cover" />
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

      <NewSermonDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          setOpen(false);
          reload();
        }}
      />
    </div>
  );
}

function NewSermonDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large, max 8MB");
      return;
    }
    setImageBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { url } = await uploadImage({ data: { dataUrl, kind: "sermon" } });
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setImageBusy(false);
    }
  }

  async function onPickAudio(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > 60 * 1024 * 1024) {
      setError("Audio is too large, max 60MB");
      return;
    }
    setAudioBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { url } = await uploadAudio({ data: { dataUrl } });
      setAudioUrl(url);
      setAudioName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload audio");
    } finally {
      setAudioBusy(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await createSermon({
        data: {
          title: String(fd.get("title")),
          speaker: String(fd.get("speaker")),
          series: String(fd.get("series") || ""),
          scripture: String(fd.get("scripture") || ""),
          preachedAt: String(fd.get("preachedAt")),
          description: String(fd.get("description") || ""),
          audioUrl,
          imageUrl,
        },
      });
      onCreated();
      setAudioUrl(null);
      setAudioName(null);
      setImageUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add sermon");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New sermon</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label>Image (optional, max 8MB)</Label>
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              disabled={imageBusy}
              className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-surface text-sm text-muted"
            >
              {imageBusy ? (
                "Uploading…"
              ) : imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                "Tap to add an image, or leave blank for the default"
              )}
            </button>
            <input
              ref={imageInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickImage}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Voice recording (optional, max 60MB)</Label>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={audioBusy}
              className="flex h-14 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-surface px-3 text-sm text-muted"
            >
              {audioBusy ? "Uploading…" : audioName ? audioName : "Tap to add a recording"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/ogg"
              className="hidden"
              onChange={onPickAudio}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="speaker">Speaker</Label>
            <Input id="speaker" name="speaker" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="series">Series</Label>
              <Input id="series" name="series" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scripture">Scripture</Label>
              <Input id="scripture" name="scripture" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preachedAt">Date preached</Label>
            <Input id="preachedAt" name="preachedAt" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy || audioBusy || imageBusy}>
            {busy ? "Saving…" : "Publish sermon"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
        <img src={sermonImageSrc(sermon)} alt="" className="h-48 w-full object-cover md:h-full" />
        <div className="p-6">
          <Badge tone="warm">{sermon.series}</Badge>
          <h2 className="mt-3 font-display text-3xl font-medium">{sermon.title}</h2>
          <p className="mt-1 text-sm opacity-80">
            {sermon.speaker} · {sermon.scripture}
          </p>
          <p className="mt-4 text-sm leading-relaxed opacity-90">{sermon.description}</p>
          <audio
            ref={audio}
            src={sermon.audioUrl || "/audio/reflection.wav"}
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

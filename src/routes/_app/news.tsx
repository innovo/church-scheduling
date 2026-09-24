import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listNews, postNews } from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import { imageSrc, type NewsPost } from "@/lib/church/types";
import { formatDay } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/news")({ component: NewsPage });

function NewsPage() {
  const me = useMe();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [open, setOpen] = useState(false);

  function reload() {
    listNews().then(setPosts);
  }
  useEffect(reload, []);

  return (
    <div>
      <PageHeader
        kicker="Communications"
        title="News"
        description="The noticeboard. Short, pastoral, and easy to scan on a Sunday morning."
        actions={
          me.isStaff ? <Button onClick={() => setOpen(true)}>Post news</Button> : null
        }
      />
      <div className="space-y-5">
        {posts.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] md:grid md:grid-cols-[16rem_1fr]">
            <img src={imageSrc(p.imageKey)} alt="" className="h-40 w-full object-cover md:h-full" />
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {p.pinned ? <Badge tone="primary">Pinned</Badge> : null}
                <Badge>{formatDay(p.publishedAt)}</Badge>
              </div>
              <h2 className="mt-2 font-display text-2xl font-medium">{p.title}</h2>
              <p className="mt-2 leading-relaxed">{p.body}</p>
              <p className="mt-3 text-sm text-muted">{p.authorName}</p>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post to the church</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await postNews({
                data: { title: String(fd.get("title")), body: String(fd.get("body")) },
              });
              setOpen(false);
              reload();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" name="body" required />
            </div>
            <Button type="submit" className="w-full">
              Publish
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

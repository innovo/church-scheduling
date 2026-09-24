import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { joinGroup, listGroups } from "@/lib/church/api";
import { imageSrc, type Group } from "@/lib/church/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/groups")({ component: GroupsPage });

function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  function reload() {
    listGroups().then(setGroups);
  }
  useEffect(reload, []);

  return (
    <div>
      <PageHeader
        kicker="Formation"
        title="Groups & midweek"
        description="Homes, teens, and the tables where most of the church actually happens."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <article key={g.id} className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
            <img src={imageSrc(g.imageKey)} alt="" className="h-36 w-full object-cover" />
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="warm">{g.meets}</Badge>
                {g.mine ? <Badge tone="primary">Joined</Badge> : null}
              </div>
              <h2 className="mt-3 font-display text-2xl font-medium">{g.name}</h2>
              <p className="mt-1 text-sm text-muted">{g.description}</p>
              <p className="mt-3 text-sm text-muted">
                {g.location}
                {g.leaderName ? ` · led by ${g.leaderName}` : ""} · {g.memberCount} people
              </p>
              {!g.mine ? (
                <Button
                  className="mt-4"
                  onClick={async () => {
                    await joinGroup({ data: g.id });
                    reload();
                  }}
                >
                  Join this group
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

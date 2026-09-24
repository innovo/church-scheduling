import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listPeople } from "@/lib/church/api";
import { AGE_GROUPS, type Person, personName } from "@/lib/church/types";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/directory")({ component: DirectoryPage });

function DirectoryPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [age, setAge] = useState("all");

  useEffect(() => {
    listPeople().then(setPeople);
  }, []);

  const filtered = useMemo(() => {
    return people.filter((p) => {
      const okAge = age === "all" || p.ageGroup === age;
      const s = q.trim().toLowerCase();
      const okQ = !s || personName(p).toLowerCase().includes(s) || (p.email || "").toLowerCase().includes(s);
      return okAge && okQ;
    });
  }, [people, q, age]);

  const groups = AGE_GROUPS.map((g) => ({
    ...g,
    count: people.filter((p) => p.ageGroup === g.id).length,
  }));

  return (
    <div>
      <PageHeader
        kicker="People"
        title="Directory"
        description="Age-group shepherding starts here. Filter the family, then take the conversation to Messages."
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names" />
        <select
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="h-11 rounded-md border border-input bg-surface px-3 text-sm sm:w-56"
        >
          <option value="all">All ages</option>
          {AGE_GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label} ({g.ages})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setAge(g.id)}
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium"
          >
            {g.label} · {g.count}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => (
          <li key={p.id} className="flex gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <Avatar name={personName(p)} hue={p.avatarHue} />
            <div className="min-w-0">
              <p className="font-medium">{personName(p)}</p>
              <p className="truncate text-sm text-muted">{p.bio || p.email || "Member"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge className="capitalize">{p.role}</Badge>
                <Badge tone="warm">{AGE_GROUPS.find((g) => g.id === p.ageGroup)?.label}</Badge>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

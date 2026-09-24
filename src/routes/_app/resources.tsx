import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { listResources } from "@/lib/church/api";
import type { Resource } from "@/lib/church/types";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/resources")({ component: ResourcesPage });

function ResourcesPage() {
  const [rows, setRows] = useState<Resource[]>([]);
  useEffect(() => {
    listResources().then(setRows);
  }, []);

  const cats = [...new Set(rows.map((r) => r.category))];

  return (
    <div>
      <PageHeader
        kicker="Library"
        title="Resources"
        description="Policies, handbooks, study notes, and the practical bits. One shelf, not twelve inboxes."
      />
      {cats.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="font-display text-2xl font-medium">{cat}</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
            {rows
              .filter((r) => r.category === cat)
              .map((r) => (
                <li key={r.id}>
                  <a
                    href={r.url || "#"}
                    className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-secondary/50"
                  >
                    <span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{r.title}</span>
                        <Badge>{r.kind}</Badge>
                      </span>
                      <span className="mt-1 block text-sm text-muted">{r.description}</span>
                    </span>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted" />
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <section id="safeguarding" className="rounded-xl bg-surface p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-2xl font-medium">Child protection, in brief</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Every Kids Church volunteer is screened and trained before they hold a room.</li>
          <li>Two adults in every room. Doors with glass. No one-to-one closed spaces.</li>
          <li>Pickup requires the code issued at check-in — never a badge worn by the child.</li>
          <li>Disclosures go to the safeguarding lead the same day. Do not investigate alone.</li>
        </ol>
      </section>
    </div>
  );
}

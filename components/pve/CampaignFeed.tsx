"use client";

import { useEffect, useState } from "react";
import type { CampaignEventView } from "@/lib/pve/types";

export function CampaignFeed() {
  const [events, setEvents] = useState<CampaignEventView[]>([]);

  useEffect(() => {
    fetch("/api/pve/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []));
  }, []);

  useEffect(() => {
    const unseen = events.filter((e) => !e.seen).map((e) => e.id);
    if (!unseen.length) return;
    fetch("/api/pve/events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: unseen }) });
  }, [events]);

  if (!events.length) return null;

  return (
    <section className="campaign-feed" aria-label="Call-Outs & Invitationals">
      <header><p>The circuit is talking</p><h2>Call-Outs & Invitationals</h2></header>
      <div className="campaign-feed-list">
        {events.map((event) => (
          <article key={event.id} className={`campaign-feed-card campaign-feed-${event.kind} ${event.seen ? "" : "campaign-feed-unseen"}`}>
            <p>{event.kind.replace("_", " ")}</p>
            <h3>{event.headline}</h3>
            <span>{event.detail}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

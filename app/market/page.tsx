"use client";

import { useEffect, useState } from "react";

import type { MarketListingRow } from "@/lib/marketplace";
import { RARITY_BORDER, RARITY_GEM, topRarity } from "@/lib/rarity";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

const SEX_ICON: Record<string, string> = { rooster: "🐓", hen: "🐔" };

async function fetchMarket() {
  const [listings, player] = await Promise.all([
    fetch("/api/marketplace").then((res) => res.json()),
    fetch("/api/player").then((res) => res.json()),
  ]);
  return { listings, credits: player.credits as number };
}

export default function MarketPage() {
  const [listings, setListings] = useState<MarketListingRow[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMarket().then((data) => {
      if (cancelled) return;
      setListings(data.listings);
      setCredits(data.credits);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuy(listing: MarketListingRow) {
    setMessage(null);
    setBuyingId(listing.id);
    const res = await fetch(`/api/marketplace/${listing.id}/buy`, { method: "POST" });
    const body = await res.json();
    setBuyingId(null);

    if (!res.ok) {
      setMessage(body.error ?? "Purchase failed");
      return;
    }
    setMessage(`Bought ${listing.name} for ${listing.price} 🪙`);
    const data = await fetchMarket();
    setListings(data.listings);
    setCredits(data.credits);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="signboard mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-(--color-gold-bright)">🛒 Market</h1>
          <p className="text-sm opacity-70">Buy chickens from the flock trade with Battle Credits.</p>
        </div>
        {credits !== null && (
          <div className="flex items-center gap-1.5 rounded-full border border-(--color-gold)/25 bg-black/30 py-1 pl-2.5 pr-3">
            <span className="text-sm leading-none">🪙</span>
            <span className="font-display text-sm font-semibold">{credits.toLocaleString()}</span>
          </div>
        )}
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-(--color-gold)/30 bg-(--color-gold)/10 p-3 text-center text-sm text-(--color-gold-bright)">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm opacity-70">Loading market...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const rarity = topRarity(listing.traits);
            const ivTotal = Object.values(listing.iv).reduce((sum, v) => sum + v, 0);
            const canAfford = credits !== null && credits >= listing.price;

            return (
              <div
                key={listing.id}
                className={`panel-wood rounded-lg border-t-2 p-4 ${RARITY_BORDER[rarity]}`}
              >
                <ChickenThumbnail chicken={listing} className="mb-2 h-40 w-full rounded-lg bg-(--color-ink)" />
                <div className="flex items-center gap-2">
                  <span className="text-xl">{SEX_ICON[listing.sex]}</span>
                  <div>
                    <h2 className="font-display font-semibold">{listing.name}</h2>
                    <p className="text-xs opacity-70">
                      {RARITY_GEM[rarity]} {listing.fightingStyle} · IV {ivTotal}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-xs opacity-70">
                  {listing.traits.length ? listing.traits.map((t) => t.name).join(", ") : "No traits"}
                </p>

                <button
                  onClick={() => handleBuy(listing)}
                  disabled={!canAfford || buyingId === listing.id}
                  className="mt-3 w-full rounded bg-(--color-gold)/15 px-3 py-2 text-sm font-semibold text-(--color-gold-bright) shadow-[inset_0_0_0_1px_rgba(212,162,78,0.35)] hover:bg-(--color-gold)/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {buyingId === listing.id ? "Buying..." : `🪙 Buy for ${listing.price}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

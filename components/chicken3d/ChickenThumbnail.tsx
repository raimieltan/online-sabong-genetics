"use client";

import { useEffect, useState } from "react";

import type { Chicken } from "@/lib/types";

import { getThumbnail, requestThumbnail, subscribe, thumbnailKey, type ThumbnailSubject } from "./thumbnailCache";

const SEX_EMOJI: Record<Chicken["sex"], string> = {
  rooster: "🐓",
  hen: "🐔",
};

/**
 * Static, cached picture of a chicken for grid/card views (roster, breeding
 * pen, marketplace, matchup screen) — see thumbnailCache.ts for why this
 * replaces a live per-card <ChickenViewer> canvas in those spots. Detail views
 * that want an interactive, live-rotating model should keep using
 * <ChickenViewer> directly.
 */
export function ChickenThumbnail({
  chicken,
  className,
}: {
  chicken: ThumbnailSubject;
  className?: string;
}) {
  const key = thumbnailKey(chicken);
  const [url, setUrl] = useState<string | undefined>(() => getThumbnail(key));
  // Reset derived state during render when the subject changes, rather than via
  // an effect — avoids a synchronous setState-in-effect cascade for the common
  // case (key changed, thumbnail already cached from an earlier mount).
  const [trackedKey, setTrackedKey] = useState(key);
  if (key !== trackedKey) {
    setTrackedKey(key);
    setUrl(getThumbnail(key));
  }

  useEffect(() => {
    if (getThumbnail(key)) return;
    requestThumbnail(key, chicken);
    return subscribe(key, () => setUrl(getThumbnail(key)));
    // `chicken` is re-derived from `key` when it changes; re-running on `key` alone is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className={className}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">
          {SEX_EMOJI[chicken.sex]}
        </div>
      )}
    </div>
  );
}

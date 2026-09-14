import type { Chicken } from "@/lib/types";

/** The subset of a chicken's data that actually changes its 3D appearance. */
export type ThumbnailSubject = Pick<Chicken, "sex" | "colorScheme" | "physical" | "mutations" | "growthStage">;

export interface ThumbnailJob {
  key: string;
  subject: ThumbnailSubject;
}

type Listener = () => void;

/**
 * Grid/card views (coop roster, breeding pen, marketplace, matchup screen) don't
 * need a live, interactive WebGL canvas per chicken — they just need a picture
 * of it. Rendering one <Canvas> per card blows past the browser's ~16
 * simultaneous WebGL context limit once a roster has more than a handful of
 * chickens, so cards past that budget were stuck showing a placeholder emoji
 * forever. Instead, a single offscreen <Canvas> (ThumbnailGenerator) renders
 * each distinct-looking chicken once, snapshots it to a PNG data URL, and every
 * card just shows that cached image — no per-card WebGL context needed.
 */
const cache = new Map<string, string>();
const listeners = new Map<string, Set<Listener>>();
const queue: string[] = [];
const queuedSubjects = new Map<string, ThumbnailSubject>();
const queueListeners = new Set<Listener>();

/** Only the fields that affect the model's visual appearance — same key means same picture. */
export function thumbnailKey(subject: ThumbnailSubject): string {
  return JSON.stringify({
    sex: subject.sex,
    colorScheme: subject.colorScheme,
    physical: subject.physical,
    mutations: subject.mutations,
    growthStage: subject.growthStage,
  });
}

export function getThumbnail(key: string): string | undefined {
  return cache.get(key);
}

export function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => set.delete(listener);
}

export function requestThumbnail(key: string, subject: ThumbnailSubject) {
  if (cache.has(key) || queuedSubjects.has(key)) return;
  queuedSubjects.set(key, subject);
  queue.push(key);
  queueListeners.forEach((listener) => listener());
}

export function subscribeQueue(listener: Listener): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

export function nextQueued(): ThumbnailJob | undefined {
  const key = queue.shift();
  if (key === undefined) return undefined;
  const subject = queuedSubjects.get(key);
  queuedSubjects.delete(key);
  if (!subject) return undefined;
  return { key, subject };
}

export function resolveThumbnail(key: string, dataUrl: string) {
  cache.set(key, dataUrl);
  listeners.get(key)?.forEach((listener) => listener());
  listeners.delete(key);
}

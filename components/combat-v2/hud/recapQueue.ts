import { isExchangeResolvedPayload, type ExchangeResolvedPayload } from '@/lib/combat-v2/interpretation';

export type ExchangeRecapEvent = {
  id: string;
  cursor: number;
  type: string;
  payload: unknown;
};

export type ExchangeRecapItem = {
  id: string;
  cursor: number;
  payload: ExchangeResolvedPayload;
};

export type ExchangeRecapQueue = {
  active: ExchangeRecapItem | null;
  queue: ExchangeRecapItem[];
  seenIds: ReadonlySet<string>;
};

export const EXCHANGE_RECAP_DURATION_MS = 1_900;

export function createExchangeRecapQueue(): ExchangeRecapQueue {
  return { active: null, queue: [], seenIds: new Set() };
}

/** Fold a possibly delayed, overlapping, or out-of-order network batch into
 * one canonical recap queue. Event IDs provide reconnect deduplication while
 * cursors restore authoritative presentation order. */
export function enqueueExchangeRecaps(
  current: ExchangeRecapQueue,
  events: readonly ExchangeRecapEvent[],
): ExchangeRecapQueue {
  const seenIds = new Set(current.seenIds);
  const additions: ExchangeRecapItem[] = [];
  const ordered = [...events].sort((a, b) => a.cursor - b.cursor || a.id.localeCompare(b.id));

  for (const event of ordered) {
    if (event.type !== 'EXCHANGE_RESOLVED' || seenIds.has(event.id) || !isExchangeResolvedPayload(event.payload)) continue;
    seenIds.add(event.id);
    additions.push({ id: event.id, cursor: event.cursor, payload: event.payload });
  }
  if (!additions.length) return current;

  const [first, ...rest] = additions;
  if (!current.active) return { active: first, queue: [...current.queue, ...rest], seenIds };
  return { active: current.active, queue: [...current.queue, ...additions], seenIds };
}

export function dismissActiveExchangeRecap(current: ExchangeRecapQueue): ExchangeRecapQueue {
  if (!current.active) return current;
  return {
    active: current.queue[0] ?? null,
    queue: current.queue.slice(1),
    seenIds: current.seenIds,
  };
}

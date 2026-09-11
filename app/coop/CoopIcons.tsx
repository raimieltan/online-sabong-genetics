import type { ReactNode, SVGProps } from "react";

type IconName =
  | "bird"
  | "village"
  | "manage"
  | "egg"
  | "plus"
  | "sword"
  | "training"
  | "heart"
  | "trophy"
  | "bolt"
  | "search"
  | "filter"
  | "close"
  | "chevron";

const PATHS: Record<IconName, ReactNode> = {
  bird: <><path d="M7 15c1.2-3.8 4-6.2 8.7-7.1-.4 1.7-1.2 3-2.5 4 2.1.4 3.7 1.5 4.8 3.1-2.8 2.7-6.5 3.6-11 2.6"/><path d="m8 15-3-2 1.3 3.8L4 19l4.1-.4M14 8l1.2-3 1.3 2 2-1-.5 3M10 18v2m4-2v2"/></>,
  village: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5M9 20v-6h6v6"/></>,
  manage: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  egg: <path d="M12 3c-3 0-6 5.2-6 10.3C6 18 8.5 21 12 21s6-3 6-7.7C18 8.2 15 3 12 3Z"/>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  sword: <><path d="m14 5 5-2-2 5L8 17l-3 2 2-3Z"/><path d="m5 13 6 6M8 18l-2 2"/></>,
  training: <><path d="M6 8v8M3 10v4m15-6v8m3-6v4M6 12h12"/></>,
  heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v5m-4 2h8"/></>,
  bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7Z"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  filter: <path d="M4 5h16l-6.5 7.2V19l-3 1.5v-8.3Z"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
};

export function CoopIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {PATHS[name]}
    </svg>
  );
}

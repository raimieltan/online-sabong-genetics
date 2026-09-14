import type { Chicken, ChickenSex, ChickenStatus, GrowthStage } from "./types";

export type CoopFilterState = {
  search: string;
  sex: ChickenSex | "all";
  growthStage: GrowthStage | "all";
  status: ChickenStatus | "all";
};

export const DEFAULT_COOP_FILTERS: CoopFilterState = {
  search: "",
  sex: "all",
  growthStage: "all",
  status: "all",
};

/** Client-side search + filter over an already-fetched roster. */
export function filterChickens(chickens: Chicken[], filters: CoopFilterState): Chicken[] {
  const query = filters.search.trim().toLowerCase();

  return chickens.filter((chicken) => {
    if (query && !chicken.name.toLowerCase().includes(query)) return false;
    if (filters.sex !== "all" && chicken.sex !== filters.sex) return false;
    if (filters.growthStage !== "all" && chicken.growthStage !== filters.growthStage) return false;
    if (filters.status !== "all" && chicken.status !== filters.status) return false;
    return true;
  });
}

import { canRetire } from "../growth";
import type { Chicken } from "../types";

export { canRetire };

/**
 * Retirement never destroys the rooster (spec §33) — it only flips
 * status/growthStage. Every other field (record, genetics, bloodline,
 * parentage, mutations, traits) stays exactly as-is, so descendants and
 * marketplace listings keep referencing an intact record.
 */
export function retireChicken(): { status: Chicken["status"]; growthStage: Chicken["growthStage"] } {
  return { status: "retired", growthStage: "retired" };
}

/**
 * A short, auto-generated career story (spec §54) built entirely from data
 * the chicken already carries — no manual scripting.
 */
export function summarizeCareer(chicken: Chicken): string {
  const { record } = chicken;
  const lines: string[] = [];
  lines.push(`${chicken.name} — Record: ${record.wins}-${record.losses}`);
  if (record.championships > 0) {
    lines.push(`${record.championships} championship${record.championships === 1 ? "" : "s"} won.`);
  }
  if (record.koTko > 0) {
    lines.push(`${record.koTko} KO/TKO finish${record.koTko === 1 ? "" : "es"}.`);
  }
  const totalExperience = chicken.experience ? Object.values(chicken.experience).reduce((s, v) => s + v, 0) : 0;
  if (totalExperience > 0) {
    const [topCategory] = Object.entries(chicken.experience ?? {}).sort((a, b) => b[1] - a[1]);
    if (topCategory) lines.push(`Fought as a ${topCategory[0]} specialist above all else.`);
  }
  const permanentInjuries = (chicken.injuries ?? []).filter((i) => i.permanent);
  if (permanentInjuries.length > 0) {
    lines.push(`Carries ${permanentInjuries.length} lasting injury${permanentInjuries.length === 1 ? "" : "ies"} from the ring.`);
  }
  lines.push(chicken.status === "retired" ? "Retired — bloodline lives on through descendants." : "Still active.");
  return lines.join("\n");
}

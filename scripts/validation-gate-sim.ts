import { CanonicalCombatRuntime, digestSemantic, type CoachingCommand } from "../lib/combat-v2/canonical";
import { generateRandomChicken } from "../lib/chickenGenerator";

const seeds = Array.from({ length: 100 }, (_, index) => index * 7919 + 13);
const fighterA = generateRandomChicken({ sex: "rooster", name: "Validator A" });
const fighterB = generateRandomChicken({ sex: "rooster", name: "Validator B" });

function run(seed: number, pattern: readonly CoachingCommand[]) {
  const runtime = CanonicalCombatRuntime.create({ sessionId: `validation-${seed}`, seed, fighterA, fighterB, openingCommand: pattern[0] });
  const events = runtime.drainEvents();
  let exchange = 0;
  while (runtime.checkpoint.state.phase === "active") {
    runtime.advance(1);
    events.push(...runtime.drainEvents());
    if (runtime.checkpoint.phase === "READ" && runtime.checkpoint.exchangeIndex > exchange) {
      exchange = runtime.checkpoint.exchangeIndex;
      runtime.acceptCommand(pattern[exchange % pattern.length]);
      events.push(...runtime.drainEvents());
    }
  }
  return { events, result: runtime.result(events) };
}

let changedPaths = 0;
for (const seed of seeds) {
  const pressureA = run(seed, ["PRESS", "COUNTER"]);
  const pressureB = run(seed, ["PRESS", "COUNTER"]);
  if (!pressureA.result || !pressureB.result) throw new Error(`Missing terminal result for seed ${seed}`);
  if (digestSemantic(pressureA) !== digestSemantic(pressureB)) throw new Error(`Determinism failed for seed ${seed}`);
  const patient = run(seed, ["WAIT", "RECOVER"]);
  if (!patient.result) throw new Error(`Missing patient terminal result for seed ${seed}`);
  if (pressureA.result.eventDigest !== patient.result.eventDigest) changedPaths++;
}

console.log(`V2 deterministic replays: ${seeds.length}/${seeds.length}`);
console.log(`Command-log-sensitive semantic paths: ${changedPaths}/${seeds.length}`);
if (changedPaths < seeds.length * .25) throw new Error("Canonical commands do not materially affect enough authoritative paths");

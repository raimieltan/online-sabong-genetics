import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { GET as clinicGET } from "../../app/api/clinic/route";
import { POST as clinicUpgradePOST } from "../../app/api/clinic/upgrade/route";
import { POST as medicalPOST } from "../../app/api/chickens/[id]/medical/route";
import { GENETIC_STAT_KEYS, type InjuryRecord, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

function serious(id = "inj-serious"): InjuryRecord {
  return {
    id,
    severity: "serious",
    label: "Wing sprain",
    incurredAt: Date.now(),
    recoveryRemaining: 4,
    permanent: false,
    location: "wing",
  };
}

async function seedInjuredChicken(playerId: string, injuries: InjuryRecord[]) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId,
      name: "Patient",
      sex: "rooster",
      generation: 0,
      bloodlineId: id,
      iv: statBlock(50),
      ev: statBlock(0),
      traits: [],
      age: 3,
      health: 60,
      energy: 40,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "injured",
      growthStage: "adult",
      injured: true,
      injuries: injuries as object,
    },
  });
  return id;
}

function medicalRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/chickens/${id}/medical`, { method: "POST", body: JSON.stringify(body) });
}

test.beforeEach(async () => {
  await prisma.medicalTreatment.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/clinic returns a level-1 clinic and a roster medical overview", async () => {
  const player = await getOrCreatePlayer();
  await seedInjuredChicken(player.id, [serious()]);

  const res = await clinicGET();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.clinic.level, 1);
  assert.equal(body.roster.length, 1);
  assert.equal(body.roster[0].status, "injured");
});

test("a level-1 clinic cannot treat a serious injury", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedInjuredChicken(player.id, [serious()]);

  const res = await medicalPOST(medicalRequest(id, { action: "treat", injuryId: "inj-serious" }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "SEVERITY_NOT_TREATABLE");
});

test("treating a minor injury deducts credits, then completes and clears it", async () => {
  const player = await getOrCreatePlayer();
  await prisma.player.update({ where: { id: player.id }, data: { credits: 1000 } });
  const minor: InjuryRecord = { ...serious("inj-minor"), severity: "minor", recoveryRemaining: 2 };
  const id = await seedInjuredChicken(player.id, [minor]);

  const start = await medicalPOST(medicalRequest(id, { action: "treat", injuryId: "inj-minor" }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(start.status, 200);

  const afterStart = await prisma.player.findUnique({ where: { id: player.id } });
  assert.ok(afterStart!.credits < 1000);

  // Force the treatment due, then let the clinic GET claim it.
  await prisma.medicalTreatment.updateMany({ where: { chickenId: id }, data: { startedAt: new Date(0) } });
  await clinicGET();

  const healed = await prisma.chicken.findUnique({ where: { id } });
  const injuries = (healed!.injuries as unknown as InjuryRecord[]) ?? [];
  assert.equal(injuries.length, 0);
  assert.equal(healed!.injured, false);
});

test("POST /api/clinic/upgrade raises the clinic level when affordable", async () => {
  const player = await getOrCreatePlayer();
  await prisma.player.update({ where: { id: player.id }, data: { credits: 5000 } });

  const res = await clinicUpgradePOST();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).level, 2);
});

test("medical_rest advances recovery without a credit cost", async () => {
  const player = await getOrCreatePlayer();
  const before = (await prisma.player.findUnique({ where: { id: player.id } }))!.credits;
  const id = await seedInjuredChicken(player.id, [serious()]);

  const res = await medicalPOST(medicalRequest(id, { action: "medical_rest" }), { params: Promise.resolve({ id }) });
  assert.equal(res.status, 200);
  const chicken = await res.json();
  assert.equal(chicken.energy, 100);

  const after = (await prisma.player.findUnique({ where: { id: player.id } }))!.credits;
  assert.equal(after, before);
});

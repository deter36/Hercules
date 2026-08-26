import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { validateGameData } from "../../src/data/validation.js";

const rawPath = resolve(process.cwd(), "src/data/raw/GAME_DATA_v4.json");
const gameData = JSON.parse(await readFile(rawPath, "utf8")) as unknown;

test("Phase 1 accepts all current base-game data", () => {
    const report = validateGameData(gameData);
  assert.equal(report.valid, true, report.issues.map((issue) => issue.message).join("\n"));
  assert.equal(report.contentHash.length, 64);
});

test("Phase 1 rejects the obsolete Hind soft-lock rule", () => {
    const altered = structuredClone(gameData) as { labors: Array<{ id: string; failure_rule?: object }> };
    const hind = altered.labors.find((labor) => labor.id === "labor.L03");
    if (!hind) throw new Error("Hind is missing from fixture data.");
    hind.failure_rule = { type: "final_usable_hercules_die_broken" };
  assert.ok(validateGameData(altered).issues.map((issue) => issue.code).includes("INVALID_HIND_FAILURE_RULE"));
});

test("Phase 1 rejects an unresolved content record", () => {
    const altered = structuredClone(gameData) as { moods: Array<{ status: string }> };
    altered.moods[0].status = "unresolved";
  assert.ok(validateGameData(altered).issues.map((issue) => issue.code).includes("UNRESOLVED_CONTENT"));
});

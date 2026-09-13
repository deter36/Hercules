import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { replayGoldenRunTrace } from "../../src/replay/golden-run.js";

const readJson = (path: string): any => JSON.parse(readFileSync(path, "utf8"));
const load = (): { script: any; record: any } => ({
  script: readJson("src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json"),
  record: readJson("src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json"),
});

test("IMP-001 replay rejects a skipped initial approval before consuming RNG", () => {
  const { script, record } = load();
  script.inputs.shift();
  script.inputs.forEach((input: any, index: number) => { input.seq = index + 1; });
  assert.throws(() => replayGoldenRunTrace(script, record), /initial Mood approval is missing or skipped/);
});

test("IMP-001 replay rejects an illegal phase at the first offending action", () => {
  const { script, record } = load();
  script.inputs[1] = { seq: 2, labor: 1, roll: 0, action: "finalize_blue_phase" };
  assert.throws(() => replayGoldenRunTrace(script, record), /Golden input 2.*finalize blue requires BLUE_ABILITY_WINDOW/);
});

test("IMP-001 replay rejects a blue operation whose from state is false", () => {
  const { script, record } = load();
  script.inputs[2].operation.from = 2;
  assert.throws(() => replayGoldenRunTrace(script, record), /Golden input 3.*operation\.from 2 does not match 1/);
});

test("IMP-001 replay rejects the first divergent intermediate checkpoint", () => {
  const { script, record } = load();
  record.checkpoints[0].spirit = 15;
  assert.throws(() => replayGoldenRunTrace(script, record), /Golden input 9.*intermediate checkpoint 1 diverged/);
});

test("IMP-001 replay rejects the first mismatched RNG event", () => {
  const { script, record } = load();
  record.rng_event_ledger[0].raw64 = "0";
  assert.throws(() => replayGoldenRunTrace(script, record), /Golden RNG mismatch at 0/);
});

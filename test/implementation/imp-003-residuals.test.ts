import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { applyContentEffect } from "../../src/engine/effects/content.js";
import { getNode } from "../../src/engine/labor/content.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";
import { replayGoldenRunTrace } from "../../src/replay/golden-run.js";

const readJson = (path: string): any => JSON.parse(readFileSync(path, "utf8"));
const loadGolden = (): { script: any; record: any } => ({
  script: readJson("src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json"),
  record: readJson("src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json"),
});

test("IMP-003 replay rejects a terminal Hercules-face mismatch", () => {
  const { script, record } = loadGolden();
  record.terminal_state.hercules_dice.H1.face = 6;
  assert.throws(() => replayGoldenRunTrace(script, record), /Golden terminal hercules_dice\.H1\.face diverged/);
});

test("IMP-003 replay rejects a terminal hidden-order mismatch", () => {
  const { script, record } = loadGolden();
  const deck = record.terminal_state.ordered_hidden_mood_deck_top_to_bottom;
  [deck[0], deck[1]] = [deck[1], deck[0]];
  assert.throws(() => replayGoldenRunTrace(script, record), /Golden terminal ordered_hidden_mood_deck_top_to_bottom diverged/);
});

test("IMP-003 replay rejects other state-bearing terminal evidence at its first differing field", () => {
  const cases: Array<{ mutate: (record: any) => void; error: RegExp }> = [
    { mutate: (record) => { record.terminal_state.active_mood.name = "Resolute"; }, error: /Golden terminal active_mood\.name diverged/ },
    { mutate: (record) => { record.terminal_state.owned_rewards.pop(); }, error: /Golden terminal owned_rewards diverged/ },
    { mutate: (record) => { record.terminal_state.hercules_dice.H4.allocated = false; }, error: /Golden terminal hercules_dice\.H4\.allocated diverged/ },
    { mutate: (record) => { record.terminal_state.pending_state_at_defeat.reward_flow_started = true; }, error: /Golden terminal pending_state_at_defeat\.reward_flow_started diverged/ },
  ];
  for (const entry of cases) {
    const { script, record } = loadGolden();
    entry.mutate(record);
    assert.throws(() => replayGoldenRunTrace(script, record), entry.error);
  }
});

test("IMP-003 rejects F053 invalid healing source contexts without mutation", () => {
  const cases = [
    { name: "missing source", sourceId: "L08B.n1", sourceLaborDieId: undefined },
    { name: "unknown source", sourceId: "L08B.n1", sourceLaborDieId: "labor.L08.unknown" },
    { name: "wrong-track source", sourceId: "L08B.n1", sourceLaborDieId: "labor.L08.A" },
    { name: "source not on entered node", sourceId: "L08B.n3", sourceLaborDieId: "labor.L08.B" },
  ];
  const effect = getNode("labor.L08", "track.L08.B", "L08B.n1").effect!;
  for (const entry of cases) {
    const state = startLabor(createInitialState("human", `imp-003-${entry.name}`), "labor.L08");
    state.currentLabor!.laborDice["labor.L08.A"].health = 2;
    state.currentLabor!.laborDice["labor.L08.A"].nodeId = "L08A.n2";
    state.currentLabor!.laborDice["labor.L08.B"].health = 3;
    state.currentLabor!.laborDice["labor.L08.B"].nodeId = "L08B.n1";
    state.game.phase = "IMPACT_RESOLUTION";
    const before = structuredClone(state);
    assert.throws(() => applyContentEffect(state, effect, entry.sourceId, entry.sourceLaborDieId), /Healing/);
    assert.deepEqual(state, before, `${entry.name} changed state`);
  }
});

test("IMP-003 rejects stale inactive healing source context without mutation", () => {
  const state = startLabor(createInitialState("human", "imp-003-stale-source"), "labor.L08");
  const source = state.currentLabor!.laborDice["labor.L08.B"];
  source.health = 0;
  source.status = "defeated_inactive";
  source.nodeId = "L08B.n1";
  state.game.phase = "IMPACT_RESOLUTION";
  const before = structuredClone(state);
  const effect = getNode("labor.L08", source.trackId, source.nodeId).effect!;
  assert.throws(() => applyContentEffect(state, effect, source.nodeId, source.id), /Healing source Labor die .* is not active/);
  assert.deepEqual(state, before);
});

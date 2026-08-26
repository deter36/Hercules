import assert from "node:assert/strict";
import test from "node:test";
import { completeLaborTransition } from "../../src/engine/labor/transition.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("Labor transition preserves progression and starts the next certified Labor", () => {
  const state = startLabor(createInitialState("human", "transition"), "labor.L01");
  state.game.phase = "LABOR_TRANSITION";
  state.player.temporaryEffects.push({type:"disabled_reward"});
  const next = completeLaborTransition(state);
  assert.deepEqual(next.game.completedLaborIds, ["labor.L01"]);
  assert.equal(next.game.currentLaborId, "labor.L02");
  assert.equal(next.game.phase, "READY_TO_ROLL");
  assert.equal(next.mood.activeMoodId !== null, true);
  assert.equal(next.rng.ledger[0].purpose, "labor1:end_mood_shuffle:swap_i=8");
  assert.deepEqual(next.player.temporaryEffects, []);
});

test("completion after the twelfth Labor uses the certified Divinity victory boundary", () => {
  const state = startLabor(createInitialState("human", "end"), "labor.L12");
  state.game.completedLaborIds = Array.from({length: 11}, (_, index) => `labor.L${String(index + 1).padStart(2, "0")}`);
  state.game.phase = "LABOR_TRANSITION";
  state.player.divinity = "TOP";
  assert.equal(completeLaborTransition(state).game.result, "victory");
});

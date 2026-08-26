import assert from "node:assert/strict";
import test from "node:test";
import { advanceLaborDice, resolveEnteredImpacts } from "../../src/engine/round/progress.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("graph advancement enters the next node before resolving that node's impact", () => {
  const state = startLabor(createInitialState("human", "progress"), "labor.L01");
  state.game.phase = "LABOR_ADVANCE";
  const advanced = advanceLaborDice(state);
  assert.equal(advanced.currentLabor!.laborDice["labor.L01.d1"].nodeId, "L01.n1");
  const impacted = resolveEnteredImpacts(advanced);
  assert.equal(impacted.player.spirit, 16);
  assert.equal(impacted.game.phase, "FAILURE_CHECK");
});

test("entered skull is an explicit defeat", () => {
  const state = startLabor(createInitialState("human", "progress"), "labor.L01");
  state.currentLabor!.laborDice["labor.L01.d1"].nodeId = "L01.n5";
  state.game.phase = "IMPACT_RESOLUTION";
  const resolved = resolveEnteredImpacts(state);
  assert.equal(resolved.game.result, "defeat");
});

import assert from "node:assert/strict";
import test from "node:test";
import { getForecastProjection, getGameplayScreenModel, getLegalTargets } from "../../src/engine/ui-projection.js";
import { allocateAttack } from "../../src/engine/actions/placement.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("screen projection uses only engine-certified exact-selection targets", () => {
  const state = startLabor(createInitialState("human", "ui-targets"), "labor.L01");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state.herculesDice.H1.face = 5;
  state.herculesDice.H2.face = 4;
  const legal = getLegalTargets(state, ["H1"]);
  assert.equal(legal.length, 1);
  assert.equal(legal[0].kind, "attack");
  assert.equal(getLegalTargets(state, ["H1", "H2"]).length, 0);
  assert.equal(getGameplayScreenModel(state, ["H1"]).phaseCta, "UNSELECT");
});

test("forecast is pure and describes committed attacks", () => {
  const state = startLabor(createInitialState("human", "ui-forecast"), "labor.L01");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state.herculesDice.H1.face = 5;
  const committed = allocateAttack(state, "labor.L01.d1", ["H1"]);
  const before = JSON.stringify(committed);
  const forecast = getForecastProjection(committed);
  assert.equal(JSON.stringify(committed), before);
  assert.deepEqual(forecast.entries, [{ id: "attack", label: "Attack", value: 1 }]);
});

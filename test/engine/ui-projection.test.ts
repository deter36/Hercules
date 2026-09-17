import assert from "node:assert/strict";
import test from "node:test";
import { getEditableAttackTargets, getEditableGoldTargets, getForecastProjection, getGameplayScreenModel, getLegalTargets } from "../../src/engine/ui-projection.js";
import { allocateAttack, moveAttackAllocation, moveGoldPlacement, placeGoldAbility, removeAttackAllocation } from "../../src/engine/actions/placement.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";
import { getPlayView } from "../../src/engine/view-model.js";

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

test("a mapped Blue ability is exposed only for a certified source face", () => {
  const state = startLabor(createInitialState("human", "ui-mapped-blue"), "labor.L01");
  state.player.ownedRewardIds.push("reward.L01");
  state.game.phase = "BLUE_ABILITY_WINDOW";
  state.herculesDice.H1.face = 4;
  assert.equal(getPlayView(state).actions.some(action => action.command.type === "USE_BLUE_ABILITY" && action.command.abilityId === "ability.reward.L01.blue"), false);
  state.herculesDice.H1.face = 6;
  assert.equal(getPlayView(state).actions.some(action => action.command.type === "USE_BLUE_ABILITY" && action.command.abilityId === "ability.reward.L01.blue"), true);
});

test("Blue-only rewards retain their Blue presentation color", () => {
  const state = createInitialState("human", "ui-reward-color");
  state.player.ownedRewardIds.push("reward.L02");
  assert.equal(getPlayView(state).rewards.find(reward => reward.id === "reward.L02")?.color, "blue");
});

test("an assigned attack bundle has engine-certified move targets and can return to the tray", () => {
  const state = startLabor(createInitialState("human", "editable-attack"), "labor.L06");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state.herculesDice.H1.face = 6;
  const committed = allocateAttack(state, "labor.L06.C14", ["H1"]);
  const targets = getEditableAttackTargets(committed, 0);
  assert.ok(targets.some(target => target.id === "attack:labor.L06.C15"));
  const moved = moveAttackAllocation(committed, 0, "labor.L06.C15");
  assert.equal(moved.round.attackAllocations[0].targetId, "labor.L06.C15");
  const released = removeAttackAllocation(moved, 0);
  assert.equal(released.herculesDice.H1.allocated, false);
  assert.equal(released.herculesDice.H1.rollable, true);
});

test("a committed Gold bundle has engine-certified attack targets and moves atomically", () => {
  const state = startLabor(createInitialState("human", "editable-gold"), "labor.L06");
  state.player.ownedRewardIds.push("reward.L01");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state.herculesDice.H1.face = 6;
  const committed = placeGoldAbility(state, "ability.reward.L01.gold", ["H1"]);
  const targets = getEditableGoldTargets(committed, "ability.reward.L01.gold");
  assert.ok(targets.some(target => target.id === "attack:labor.L06.C14"));
  const moved = moveGoldPlacement(committed, "ability.reward.L01.gold", "attack", "labor.L06.C14");
  assert.equal(moved.round.goldPlacements.length, 0);
  assert.equal(moved.round.attackAllocations[0].targetId, "labor.L06.C14");
});

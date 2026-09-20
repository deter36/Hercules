import assert from "node:assert/strict";
import test from "node:test";
import { getEditableAttackTargets, getEditableGoldTargets, getForecastProjection, getGameplayScreenModel, getLegalTargets } from "../../src/engine/ui-projection.js";
import { allocateAttack, moveAttackAllocation, moveGoldPlacement, placeGoldAbility, removeAttackAllocation, useBlueAbility } from "../../src/engine/actions/placement.js";
import { submit } from "../../src/engine/commands/dispatcher.js";
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

test("forecast is pure and projects end-of-turn totals", () => {
  const state = startLabor(createInitialState("human", "ui-forecast"), "labor.L01");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state.herculesDice.H1.face = 5;
  const committed = allocateAttack(state, "labor.L01.d1", ["H1"]);
  const before = JSON.stringify(committed);
  const forecast = getForecastProjection(committed);
  assert.equal(JSON.stringify(committed), before);
  assert.deepEqual(forecast.entries, [
    { id: "damage", label: "damage", value: 1 },
    { id: "spirit", label: "Spirit", value: -1 }
  ]);
});

test("forecast ignores a defeated die's next node effect", () => {
  const state = startLabor(createInitialState("human", "ui-forecast-defeated"), "labor.L01");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state.currentLabor!.laborDice["labor.L01.d1"].health = 1;
  state.herculesDice.H1.face = 5;
  const forecast = getForecastProjection(allocateAttack(state, "labor.L01.d1", ["H1"]));
  assert.deepEqual(forecast.entries, [{ id: "damage", label: "damage", value: 1 }]);
});

test("forecast totals only effective Labor healing", () => {
  const state = startLabor(createInitialState("human", "ui-forecast-heal"), "labor.L01");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state.currentLabor!.laborDice["labor.L01.d1"].nodeId = "L01.n2";
  state.currentLabor!.laborDice["labor.L01.d1"].health = 4;
  const forecast = getForecastProjection(state);
  assert.deepEqual(forecast.entries, [{ id: "heal", label: "heal", value: 1 }]);
});

test("forecast is available during the post-roll Blue window", () => {
  const state = startLabor(createInitialState("human", "ui-forecast-blue"), "labor.L01");
  state.game.phase = "BLUE_ABILITY_WINDOW";
  const forecast = getForecastProjection(state);
  assert.deepEqual(forecast.entries, [{ id: "spirit", label: "Spirit", value: -1 }]);
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

test("same-color multi-use Rewards expose one card with stable placement slots", () => {
  const state = createInitialState("human", "ui-reward-slots");
  state.player.ownedRewardIds.push("reward.L02");
  const card = getPlayView(state).actionCards.find(candidate => candidate.id === "reward.L02");
  assert.deepEqual(card?.slots, [
    { id: "ability.reward.L02.blueA", color: "blue" },
    { id: "ability.reward.L02.blueB", color: "blue" }
  ]);
  assert.equal(getPlayView(state).actionCards.filter(candidate => candidate.id === "reward.L02").length, 1);
});

test("a used Blue die parks on its ability and returns after finishing Blue", () => {
  const state = startLabor(createInitialState("human", "blue-parking"), "labor.L01");
  state.game.phase = "BLUE_ABILITY_WINDOW";
  state.herculesDice.H1.face = 6;
  const parked = useBlueAbility(state, "ability.bow.blue", "H1", 1);
  assert.deepEqual(getPlayView(parked).bluePlacements, [{ abilityId: "ability.bow.blue", rewardName: "Bow of Hercules", dieIds: ["H1"] }]);
  const finished = submit(parked, { type: "FINISH_BLUE_PHASE" }).state;
  assert.equal(finished.herculesDice.H1.placement, null);
  assert.deepEqual(getPlayView(finished).bluePlacements, []);
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

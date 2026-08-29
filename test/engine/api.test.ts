import assert from "node:assert/strict";
import test from "node:test";
import { HerculesEngine } from "../../src/engine/api.js";
import { startLabor } from "../../src/engine/labor/setup.js";

test("the public engine facade creates, validates, saves, and submits", () => {
  const created = HerculesEngine.createGame({ difficulty: "human", seed: "public-api" });
  assert.equal(created.validation.valid, true);
  const saved = HerculesEngine.serialize(created.state);
  const restored = HerculesEngine.deserialize(saved);
  assert.deepEqual(restored, created.state);
  assert.ok(HerculesEngine.getLegalCommands(restored).some((command) => command.type === "ROLL"));
});

test("the public playtest view exposes display data and engine-owned controls without the Mood deck", () => {
  let state = HerculesEngine.createGame({ difficulty: "human", seed: "playtest-view" }).state;
  let view = HerculesEngine.getPlayView(state);
  assert.equal(view.actions.some((action) => action.command.type === "ROLL"), true);
  assert.equal("deck" in view.mood, false);
  assert.equal(typeof view.mood.effect, "string");
  state = HerculesEngine.submit(state, { type: "ROLL" }).state;
  view = HerculesEngine.getPlayView(state);
  assert.equal(view.actions.some((action) => action.command.type === "FINISH_BLUE_PHASE"), true);
  assert.equal(view.actions.every((action) => action.command.type !== "RESOLVE_ANYWAY"), true);
  const bowActions = view.actions.filter((action) => action.command.type === "USE_BLUE_ABILITY" && action.command.abilityId === "ability.bow.blue");
  assert.equal(bowActions.length, 10);
  assert.equal(bowActions.every((action) => action.command.type === "USE_BLUE_ABILITY" && (action.command.target === -1 || action.command.target === 1)), true);
  const bow = view.blueAbilities.find((ability) => ability.id === "ability.bow.blue");
  assert.equal(bow?.choices.length, 5);
  assert.equal(bow?.choices.every((source) => source.choices?.length === 2), true);
});

test("multi-track Labors pair stable track labels with their attack requirements", () => {
  const state = startLabor(HerculesEngine.createGame({ difficulty: "human", seed: "track-labels" }).state, "labor.L06");
  const view = HerculesEngine.getPlayView(state);
  assert.deepEqual(view.labor?.tracks.map(track => track.label), ["Track A", "Track B", "Track C", "Track D"]);
  assert.deepEqual(view.labor?.tracks.map(track => track.attack), ["one 3 or 6", "one 6", "one 3", "one 3 or 6"]);
});

test("the public playtest view supplies player-facing reward summaries and choice labels", () => {
  const state = HerculesEngine.createGame({ difficulty: "human", seed: "reward-display" }).state;
  state.player.ownedRewardIds.push("reward.L04.B");
  state.pendingDecision = {
    id: "reward:labor.L04",
    type: "CHOOSE_REWARD",
    prompt: "Choose a Reward",
    legalOptions: [{ id: "reward.L04.A" }, { id: "reward.L04.B" }],
    source: { kind: "labor", id: "labor.L04" },
    context: {},
    allowSkip: false,
    randomnessOnResolve: false,
    revealsHiddenInformation: false,
    undoBarrierOnResolve: false
  };
  const view = HerculesEngine.getPlayView(state);
  assert.equal(view.rewards.find((reward) => reward.id === "reward.L04.B")?.summary, "Blue: one die counts as two; costs 2 Spirit.");
  assert.ok(view.actions.some((action) => action.label === "Regret B — +2 Spirit · +1 Hercules die. Blue: one die counts as two; costs 2 Spirit."));
  state.pendingDecision = { ...state.pendingDecision, type: "CHOOSE_REWARD_TO_REMOVE", legalOptions: [{ id: "reward.L04.B" }, { id: "component.bow" }] };
  const removalView = HerculesEngine.getPlayView(state);
  assert.ok(removalView.actions.some((action) => action.label === "Regret B"));
  assert.ok(removalView.actions.some((action) => action.command.type === "CHOOSE_OPTION" && action.command.optionId === "component.bow" && action.label !== "component.bow"));
});

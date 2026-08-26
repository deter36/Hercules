import assert from "node:assert/strict";
import test from "node:test";
import { HerculesEngine } from "../../src/engine/api.js";

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
  state = HerculesEngine.submit(state, { type: "ROLL" }).state;
  view = HerculesEngine.getPlayView(state);
  assert.equal(view.actions.some((action) => action.command.type === "FINISH_BLUE_PHASE"), true);
  assert.equal(view.actions.every((action) => action.command.type !== "RESOLVE_ANYWAY"), true);
});

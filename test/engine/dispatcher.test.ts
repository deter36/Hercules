import assert from "node:assert/strict";
import test from "node:test";
import { getLegalCommands, submit } from "../../src/engine/commands/dispatcher.js";
import { createInitialState } from "../../src/engine/state/create.js";
import { startLabor, resolveMood } from "../../src/engine/labor/setup.js";
import { checkpointDeterministicAction } from "../../src/engine/state/undo.js";
import { rollFromRng } from "../../src/engine/round/resolve.js";
import { commitInitialRoll } from "../../src/engine/round/resolve.js";

test("dispatcher advances only a legal generic phase command", () => {
  const state = resolveMood(startLabor(createInitialState("human", "dispatcher-seed"), "labor.L01"), "mood.haunted_a");
  const result = submit(state, { type: "ROLL" });
  assert.equal(state.game.phase, "READY_TO_ROLL");
  assert.equal(result.state.game.phase, "BLUE_ABILITY_WINDOW");
  assert.equal(result.transitions[0].type, "DICE_ROLLED");
  assert.equal(result.state.rng.ledger.length, 5);
  assert.notEqual(result.transitions[0].beforeHash, result.transitions[0].afterHash);
});

test("dispatcher rejects phase-illegal commands", () => {
  const state = createInitialState("human", "illegal-seed");
  assert.throws(() => submit(state, { type: "ROLL" }), /Illegal command/);
});

test("pending decisions expose only engine-owned choice commands", () => {
  const state = createInitialState("human", "decision-seed");
  state.pendingDecision = { id: "decision.test", type: "CHOOSE_REWARD", prompt: "Choose", legalOptions: [{ id: "reward.A" }], source: { kind: "test", id: "test" }, context: {}, allowSkip: false, randomnessOnResolve: false, revealsHiddenInformation: false, undoBarrierOnResolve: false };
  assert.deepEqual(getLegalCommands(state), [{ type: "CHOOSE_OPTION", decisionId: "decision.test", optionId: "reward.A" }]);
});

test("deterministic commands can be undone inside the current RNG interval", () => {
  const initial = resolveMood(startLabor(createInitialState("human", "undo-seed"), "labor.L01"), "mood.haunted_a");
  const rolled = submit(initial, { type: "ROLL" }).state;
  const afterFinishBlue = submit(rolled, { type: "FINISH_BLUE_PHASE" }).state;
  assert.ok(getLegalCommands(afterFinishBlue).some((command) => command.type === "UNDO_DETERMINISTIC"));
  const undone = submit(afterFinishBlue, { type: "UNDO_DETERMINISTIC" }).state;
  assert.equal(undone.game.phase, "BLUE_ABILITY_WINDOW");
  assert.equal(undone.rng.nextEvent, rolled.rng.nextEvent);
  assert.deepEqual(undone.rng.ledger, rolled.rng.ledger);
});

test("a direct random operation clears older deterministic undo checkpoints", () => {
  const state = resolveMood(startLabor(createInitialState("human", "direct-rng-boundary"), "labor.L01"), "mood.haunted_a");
  const checkpointed = checkpointDeterministicAction(state);
  const rolled = rollFromRng(checkpointed);
  assert.equal(rolled.undoStack.length, 0);
});

test("public action commands route through engine validation and create undo checkpoints", () => {
  let state = resolveMood(startLabor(createInitialState("human", "command-actions"), "labor.L01"), "mood.haunted_a");
  state = commitInitialRoll(state, { H1: 6, H2: 2, H3: 3, H4: 4, H5: 5 });
  const result = submit(state, { type: "USE_BLUE_ABILITY", abilityId: "ability.bow.blue", sourceDieId: "H1", target: 1 });
  assert.equal(result.state.herculesDice.H1.face, 1);
  assert.equal(result.state.player.spirit, 14);
  assert.equal(result.transitions[0].type, "BLUE_ABILITY_USED");
  assert.ok(getLegalCommands(result.state).some((command) => command.type === "UNDO_DETERMINISTIC"));
});

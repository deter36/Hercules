import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../../src/engine/state/create.js";
import { validateState } from "../../src/engine/state/invariants.js";
import { deserialize, serialize } from "../../src/engine/state/save.js";
import { exportDiagnostics } from "../../src/engine/diagnostics/export.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { rollFromRng } from "../../src/engine/round/resolve.js";
import { submit } from "../../src/engine/commands/dispatcher.js";
import { resolveMood } from "../../src/engine/labor/setup.js";
import { commitInitialRoll } from "../../src/engine/round/resolve.js";

test("initial state satisfies invariants for every difficulty", () => {
  for (const difficulty of ["human", "hero", "god"] as const) {
    const state = createInitialState(difficulty, "phase-2-seed");
    assert.equal(validateState(state).valid, true);
    assert.equal(Object.keys(state.herculesDice).length, 11);
    assert.equal(Object.values(state.herculesDice).filter((die) => die.availableForLabor).length, { human: 5, hero: 4, god: 3 }[difficulty]);
    assert.equal(state.player.persistentHerculesDice, { human: 5, hero: 4, god: 3 }[difficulty]);
    assert.equal(state.mood.deck.length, difficulty === "god" ? 8 : 9);
  }
});

test("save/load preserves canonical equality", () => {
  const state = createInitialState("human", "round-trip-seed");
  const restored = deserialize(serialize(state));
  assert.deepEqual(restored, state);
});

test("save/load continues from the same RNG event and diagnostics retain audit sources", () => {
  const state = startLabor(createInitialState("human", "continuation-seed"), "labor.L01");
  state.game.phase = "READY_TO_ROLL";
  const saved = deserialize(serialize(state));
  const originalRoll = rollFromRng(state);
  const restoredRoll = rollFromRng(saved);
  assert.deepEqual(restoredRoll.rng, originalRoll.rng);
  const diagnostics = exportDiagnostics(restoredRoll);
  assert.equal(diagnostics.validation.valid, true);
  assert.equal(diagnostics.hiddenSources.orderedMoodDeck.length, restoredRoll.mood.deck.length);
  assert.equal(diagnostics.rngLedger.length, restoredRoll.rng.ledger.length);
});

test("save/load preserves the current deterministic undo window", () => {
  let state = resolveMood(startLabor(createInitialState("human", "undo-save"), "labor.L01"), "mood.haunted_a");
  state = commitInitialRoll(state, { H1: 6, H2: 2, H3: 3, H4: 4, H5: 5 });
  state = submit(state, { type: "USE_BLUE_ABILITY", abilityId: "ability.bow.blue", sourceDieId: "H1", target: 1 }).state;
  const restored = deserialize(serialize(state));
  const undone = submit(restored, { type: "UNDO_DETERMINISTIC" }).state;
  assert.equal(restored.undoStack.length, 1);
  assert.equal(undone.herculesDice.H1.face, 6);
  assert.equal(undone.rng.nextEvent, restored.rng.nextEvent);
});

test("save/load restores the skipped Apples route choice from the affected build", () => {
  const state = startLabor(createInitialState("human", "repair-apples-route"), "labor.L11");
  state.game.phase = "READY_TO_ROLL";
  state.currentLabor!.laborDice["labor.L11.left"].nodeId = "A2";
  state.transitions.push({ index: 0, type: "DECISION_RESOLVED", source: { kind: "command", id: "CHOOSE_OPTION" }, payload: { command: { type: "CHOOSE_OPTION", decisionId: "branch:labor.L11.left:A1", optionId: "A2" } }, beforeHash: "before", afterHash: "after" });
  const repaired = deserialize(serialize(state));
  assert.equal(repaired.game.phase, "LABOR_ADVANCE");
  assert.equal(repaired.pendingDecision?.context.laborDieId, "labor.L11.right");
  assert.deepEqual(repaired.pendingDecision?.legalOptions.map(option => option.id), ["A2", "B3", "B4"]);
});

test("invariants reject illegal die reuse", () => {
  const state = createInitialState("human", "invalid-state-seed");
  state.herculesDice.H1.locked = true;
  state.herculesDice.H1.allocated = true;
  assert.equal(validateState(state).valid, false);
});

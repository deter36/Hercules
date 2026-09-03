import assert from "node:assert/strict";
import test from "node:test";
import { advanceLaborDice, resolveEnteredImpacts } from "../../src/engine/round/progress.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";
import { submit } from "../../src/engine/commands/dispatcher.js";

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

test("Cerberus Cannot Block entered during impacts does not invalidate this round's Spirit block", () => {
  const state = startLabor(createInitialState("human", "cerberus-nonretroactive-block"), "labor.L12");
  state.game.phase = "IMPACT_RESOLUTION";
  state.round.blockedSpirit = 1;
  state.currentLabor!.laborDice["labor.L12.A"].nodeId = "L12A.n2";
  state.currentLabor!.laborDice["labor.L12.B"].nodeId = "L12B.n2";
  state.currentLabor!.laborDice["labor.L12.C"].status = "defeated_inactive";
  state.currentLabor!.laborDice["labor.L12.C"].health = 0;

  const resolved = resolveEnteredImpacts(state);

  assert.equal(resolved.currentLabor!.cannotBlockThisRound, false);
  assert.equal(resolved.player.spirit, 16);
});

test("Apples asks for each die's route independently before resolving their movement", () => {
  const state = startLabor(createInitialState("human", "apples-two-routes"), "labor.L11");
  state.game.phase = "LABOR_ADVANCE";
  const leftChoice = advanceLaborDice(state);
  assert.equal(leftChoice.pendingDecision?.context.laborDieId, "labor.L11.left");
  assert.deepEqual(leftChoice.pendingDecision?.context.remainingLaborDieIds, ["labor.L11.right"]);
  const rightChoice = submit(leftChoice, { type: "CHOOSE_OPTION", decisionId: leftChoice.pendingDecision!.id, optionId: "A2" }).state;
  assert.equal(rightChoice.pendingDecision?.context.laborDieId, "labor.L11.right");
  const resolved = submit(rightChoice, { type: "CHOOSE_OPTION", decisionId: rightChoice.pendingDecision!.id, optionId: "B3" }).state;
  assert.equal(resolved.currentLabor!.laborDice["labor.L11.left"].nodeId, "A2");
  assert.equal(resolved.currentLabor!.laborDice["labor.L11.right"].nodeId, "B3");
});

test("Apples auto-advances only a die with one literal next node", () => {
  const state = startLabor(createInitialState("human", "apples-single-route"), "labor.L11");
  state.currentLabor!.laborDice["labor.L11.right"].nodeId = "B1";
  state.game.phase = "LABOR_ADVANCE";
  const advanced = advanceLaborDice(state);
  assert.equal(advanced.pendingDecision?.context.laborDieId, "labor.L11.left");
  assert.equal(advanced.currentLabor!.laborDice["labor.L11.right"].nodeId, "B2");
});

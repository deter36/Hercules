import assert from "node:assert/strict";
import test from "node:test";
import { allocateAttack, useBlueAbility } from "../../src/engine/actions/placement.js";
import { resolveAssignments } from "../../src/engine/commands/resolve-assignments.js";
import { getTracks } from "../../src/engine/labor/content.js";
import { startLabor, resolveMood } from "../../src/engine/labor/setup.js";
import { commitInitialRoll } from "../../src/engine/round/resolve.js";
import { satisfies } from "../../src/engine/requirements/evaluate.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("F004/F005 Cannot Block is a round-start snapshot", () => {
  const startBlocked = startLabor(createInitialState("human", "snapshot"), "labor.L06");
  startBlocked.currentLabor!.laborDice["labor.L06.C15"].nodeId = "L06C15.n1";
  const rolled = commitInitialRoll(resolveMood(startBlocked, "mood.haunted_a"), {H1:2,H2:2,H3:2,H4:2,H5:2});
  assert.equal(rolled.currentLabor!.cannotBlockThisRound, true);
  const enteredLater = startLabor(createInitialState("human", "snapshot"), "labor.L06");
  const rolledLater = commitInitialRoll(resolveMood(enteredLater, "mood.haunted_a"), {H1:2,H2:2,H3:2,H4:2,H5:2});
  assert.equal(rolledLater.currentLabor!.cannotBlockThisRound, false);
});

test("F009 Blood of the Amazons A creates one linked nonphysical derived contribution", () => {
  let state = resolveMood(startLabor(createInitialState("human", "derived"), "labor.L01"), "mood.haunted_a");
  state.player.ownedRewardIds.push("reward.L09.A");
  state = commitInitialRoll(state, {H1:4,H2:2,H3:2,H4:2,H5:2});
  const result = useBlueAbility(state, "ability.reward.L09.A.blue", "H1");
  assert.deepEqual(Object.values(result.round.derivedContributions), [{id:"H1-D1",sourceDieId:"H1",face:4,allocated:false}]);
});

test("F019/F022 resolve assignments distinguishes no available dice from a meaningful legal attack", () => {
  let state = startLabor(createInitialState("human", "assign-fixture"), "labor.L01");
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  assert.equal(resolveAssignments(state).game.phase, "DAMAGE_RESOLUTION");
  state.herculesDice.H1.face = 6;
  assert.equal(resolveAssignments(state).pendingDecision?.type, "CONFIRM_RESOLVE_WITH_UNUSED_MEANINGFUL_PLACEMENT");
});

test("F030 and F032 retain Apples directionality and Cerberus exact-18 multi-die requirements", () => {
  const apples = getTracks("labor.L11")["track.L11"].nodes;
  assert.equal(apples.B3.next.includes("B4"), true);
  assert.equal(apples.B4.next.includes("B3"), false);
  assert.equal(satisfies({type:"exact_sum",sum:18,min_dice:1}, [6,5,4,3]), true);
});

import assert from "node:assert/strict";
import test from "node:test";
import { allocateAttack, placeGoldAbility, useBlueAbility } from "../../src/engine/actions/placement.js";
import { resolveAssignments } from "../../src/engine/commands/resolve-assignments.js";
import { applyContentEffect } from "../../src/engine/effects/content.js";
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

test("every Cannot Block node applies only through the next round's snapshot", () => {
  const laborIds = ["labor.L04", "labor.L05", "labor.L06", "labor.L08", "labor.L09", "labor.L10", "labor.L12"];
  for (const laborId of laborIds) {
    for (const track of Object.values(getTracks(laborId))) {
      for (const node of Object.values(track.nodes).filter((entry) => entry.effect?.cannot_block === true)) {
        const atRoundStart = startLabor(createInitialState("human", `cannot-block-start:${node.id}`), laborId);
        const die = Object.values(atRoundStart.currentLabor!.laborDice).find((entry) => entry.trackId === track.id)!;
        die.nodeId = node.id;
        const snapshotted = commitInitialRoll(resolveMood(atRoundStart, "mood.haunted_a"), {H1:2,H2:2,H3:2,H4:2,H5:2});
        assert.equal(snapshotted.currentLabor!.cannotBlockThisRound, true, node.id);

        const enteredThisRound = startLabor(createInitialState("human", `cannot-block-entered:${node.id}`), laborId);
        const enteredDie = Object.values(enteredThisRound.currentLabor!.laborDice).find((entry) => entry.trackId === track.id)!;
        const rolled = commitInitialRoll(resolveMood(enteredThisRound, "mood.haunted_a"), {H1:2,H2:2,H3:2,H4:2,H5:2});
        const afterImpact = applyContentEffect(rolled, node.effect!, node.id, enteredDie.id, true);
        assert.equal(afterImpact.currentLabor!.cannotBlockThisRound, false, node.id);
      }
    }
  }
});

test("F009 Blood of the Amazons A creates one linked nonphysical derived contribution", () => {
  let state = resolveMood(startLabor(createInitialState("human", "derived"), "labor.L01"), "mood.haunted_a");
  state.player.ownedRewardIds.push("reward.L09.A");
  state = commitInitialRoll(state, {H1:4,H2:2,H3:2,H4:2,H5:2});
  const result = useBlueAbility(state, "ability.reward.L09.A.blue", "H1");
  assert.deepEqual(Object.values(result.round.derivedContributions), [{id:"H1-D1",sourceDieId:"H1",face:4,allocated:false}]);
});

test("Regret B creates an independently assignable linked copy", () => {
  let state = resolveMood(startLabor(createInitialState("human", "regret-copy"), "labor.L05"), "mood.haunted_a");
  state.player.ownedRewardIds.push("reward.L04.B", "reward.L01");
  state = commitInitialRoll(state, {H1:2,H2:1,H3:3,H4:4,H5:5});
  state = useBlueAbility(state, "ability.reward.L04.B.blue", "H2");
  assert.deepEqual(Object.values(state.round.derivedContributions), [{id:"H2-D1",sourceDieId:"H2",face:1,allocated:false}]);
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  const attack = allocateAttack(state, "labor.L05.A", ["H2"]);
  assert.equal(attack.round.attackAllocations[0].damage, 1);
  const gold = placeGoldAbility(state, "ability.reward.L01.gold", [], ["H2-D1"]);
  assert.equal(gold.round.derivedContributions["H2-D1"].allocated, true);
  assert.equal(gold.herculesDice.H2.locked, false);
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

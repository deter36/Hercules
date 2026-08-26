import assert from "node:assert/strict";
import test from "node:test";
import { allocateAttack, placeGoldAbility, useBlueAbility, useCowsA, useCowsB } from "../../src/engine/actions/placement.js";
import { resolveRoundDamage, commitInitialRoll, cleanupRound } from "../../src/engine/round/resolve.js";
import { startLabor, resolveMood } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

const faces = { H1: 6, H2: 6, H3: 4, H4: 4, H5: 3 };

test("initial roll applies a Mood only once and enters the blue window", () => {
  const state = resolveMood(startLabor(createInitialState("human", "roll"), "labor.L01"), "mood.melancholic");
  const rolled = commitInitialRoll(state, faces);
  assert.equal(rolled.herculesDice.H1.face, 5);
  assert.equal(rolled.game.phase, "BLUE_ABILITY_WINDOW");
});

test("blue, gold, attack, damage, and cleanup mutate only canonical engine state", () => {
  let state = resolveMood(startLabor(createInitialState("human", "actions"), "labor.L01"), "mood.haunted_a");
  state.player.ownedRewardIds.push("reward.L01");
  state = commitInitialRoll(state, faces);
  state = useBlueAbility(state, "ability.reward.L01.blue", "H5");
  assert.equal(state.herculesDice.H5.face, 6);
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state = placeGoldAbility(state, "ability.reward.L01.gold", ["H2"]);
  assert.equal(state.herculesDice.H2.locked, true);
  state = allocateAttack(state, "labor.L01.d1", ["H5"]);
  assert.equal(state.herculesDice.H5.allocated, true);
  const resolved = resolveRoundDamage(state);
  assert.equal(resolved.currentLabor!.laborDice["labor.L01.d1"].health, 5);
  const cleaned = cleanupRound(resolved);
  assert.equal(cleaned.herculesDice.H5.allocated, false);
  assert.equal(cleaned.herculesDice.H2.locked, false);
  assert.equal(cleaned.game.phase, "READY_TO_ROLL");
});

test("Bow and Ferocious blue spaces are engine abilities with their certified costs and values", () => {
  let state = resolveMood(startLabor(createInitialState("human", "bow"), "labor.L01"), "mood.ferocious");
  state = commitInitialRoll(state, faces);
  state = useBlueAbility(state, "ability.bow.blue", "H1", 1);
  assert.equal(state.herculesDice.H1.face, 1);
  assert.equal(state.player.spirit, 16);
  state = useBlueAbility(state, "ability.mood.ferocious.blue", "H2", 4);
  assert.equal(state.herculesDice.H2.face, 4);
});

test("Cows A spends its source but permits an already-blue-used target, while Cows B keeps its source reusable", () => {
  let state = resolveMood(startLabor(createInitialState("human", "cows"), "labor.L01"), "mood.haunted_a");
  state.player.ownedRewardIds.push("reward.L01", "reward.L05.A", "reward.L05.B");
  state = commitInitialRoll(state, faces);
  state = useBlueAbility(state, "ability.reward.L01.blue", "H5");
  state = useCowsA(state, "H1", "H5", 2);
  assert.equal(state.herculesDice.H1.spent, true);
  assert.equal(state.herculesDice.H5.face, 2);
  state = useCowsB(state, "H2", ["H3"]);
  assert.equal(state.herculesDice.H2.blueUsed, true);
  assert.equal(state.herculesDice.H2.spent, false);
  assert.equal(state.rng.ledger.length, 1);
});

test("Stables attacks use the shared single-1 requirement but damage only their selected Labor die", () => {
  let state = resolveMood(startLabor(createInitialState("human", "all-targets"), "labor.L05"), "mood.haunted_a");
  const sixes = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5 };
  state = commitInitialRoll(state, sixes);
  state.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
  state = allocateAttack(state, "labor.L05.A", ["H1"]);
  const resolved = resolveRoundDamage(state);
  assert.deepEqual(Object.values(resolved.currentLabor!.laborDice).map((die) => die.health), [4, 5]);
});

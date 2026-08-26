import assert from "node:assert/strict";
import test from "node:test";
import { chooseReward, chooseRewardToRemove } from "../../src/engine/rewards/resolve.js";
import { startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("Reward side effects alter only the certified Mood and prior-Reward state", () => {
  const state = startLabor(createInitialState("human", "reward-effects"), "labor.L05");
  state.player.ownedRewardIds.push("reward.L01", "reward.L04.A");
  const pending = chooseReward(state, "reward.L05.A");
  assert.equal(pending.pendingDecision?.type, "CHOOSE_REWARD_TO_REMOVE");
  const resolved = chooseRewardToRemove(pending, "remove-reward:reward.L05.A", "reward.L01");
  assert.ok(resolved.player.removedRewardOrComponentIds.includes("reward.L01"));
});

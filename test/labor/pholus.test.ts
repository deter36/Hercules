import assert from "node:assert/strict";
import test from "node:test";
import { choosePholusReward } from "../../src/engine/decisions/resolve.js";
import { startLabor, resolveMood } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("Ghost of Pholus requires a Reward choice and records the selected Labor-only disablement", () => {
  const base = createInitialState("human", "pholus");
  base.player.ownedRewardIds.push("reward.L04.A", "reward.L05.B");
  const pending = resolveMood(startLabor(base, "labor.L06"), "mood.ghost_pholus");
  assert.equal(pending.pendingDecision?.type, "CHOOSE_PHOLUS_REWARD");
  const resolved = choosePholusReward(pending, "mood:mood.ghost_pholus", "reward.L05.B");
  assert.equal(resolved.game.phase, "READY_TO_ROLL");
  assert.deepEqual(resolved.player.temporaryEffects, [{type:"disabled_reward",rewardId:"reward.L05.B",duration:"labor",source:"mood.ghost_pholus"}]);
});

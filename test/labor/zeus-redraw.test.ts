import assert from "node:assert/strict";
import test from "node:test";
import { resolveMood, resolveZeusRedraw, startLabor } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("Zeus B redraw takes the next ordered Mood without RNG and bottoms the rejected Mood", () => {
  const state = startLabor(createInitialState("human", "zeus"), "labor.L09");
  state.player.ownedRewardIds.push("reward.L08.B");
  state.mood.deck = ["mood.enraged", "mood.haunted_a", "mood.battered"];
  const pending = resolveMood(state, "mood.enraged");
  assert.equal(pending.pendingDecision?.type, "CHOOSE_ZEUS_REDRAW");
  const redrawn = resolveZeusRedraw(pending, "zeus-redraw:mood.enraged", "redraw");
  assert.equal(redrawn.mood.activeMoodId, "mood.haunted_a");
  assert.deepEqual(redrawn.mood.deck, ["mood.battered", "mood.enraged"]);
  assert.equal(redrawn.rng.nextEvent, "0");
  assert.equal(redrawn.player.spirit, 15);
});

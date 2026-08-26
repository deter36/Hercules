import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../../src/engine/state/create.js";

test("the Spirit X starting space is represented as the one-time value 17", () => {
  const state = createInitialState("human", "starting-spirit");
  assert.equal(state.player.spirit, 17);
  assert.equal(state.player.divinity, 0);
});

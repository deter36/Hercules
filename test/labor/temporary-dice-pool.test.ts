import assert from "node:assert/strict";
import test from "node:test";
import { chooseGhostAbderusCost } from "../../src/engine/decisions/resolve.js";
import { startLabor, resolveMood } from "../../src/engine/labor/setup.js";
import { createInitialState } from "../../src/engine/state/create.js";

const availableIds = (state: ReturnType<typeof createInitialState>) => Object.values(state.herculesDice).filter((die) => die.availableForLabor).map((die) => die.id);

test("Battered removes the highest available stable ID without a player die choice", () => {
  const state = resolveMood(startLabor(createInitialState("human", "pool"), "labor.L01"), "mood.battered");
  assert.deepEqual(availableIds(state), ["H1", "H2", "H3", "H4"]);
  assert.equal(state.herculesDice.H5.poolSource, "temporarily_unavailable");
  assert.equal(state.pendingDecision, null);
});

test("Resolute adds the lowest unused stable ID and the next Labor restores the persistent base pool", () => {
  const state = resolveMood(startLabor(createInitialState("human", "pool"), "labor.L01"), "mood.resolute");
  assert.deepEqual(availableIds(state), ["H1", "H2", "H3", "H4", "H5", "H6"]);
  const restored = startLabor(state, "labor.L02");
  assert.deepEqual(availableIds(restored), ["H1", "H2", "H3", "H4", "H5"]);
});

test("Ghost of Abderus lets the player choose the cost but maps die removal automatically", () => {
  const pending = resolveMood(startLabor(createInitialState("human", "pool"), "labor.L01"), "mood.ghost_abderus");
  const resolved = chooseGhostAbderusCost(pending, "mood:mood.ghost_abderus", "lose_die");
  assert.deepEqual(availableIds(resolved), ["H1", "H2", "H3", "H4"]);
  assert.equal(resolved.game.phase, "READY_TO_ROLL");
});

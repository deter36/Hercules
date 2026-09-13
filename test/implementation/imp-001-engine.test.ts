import assert from "node:assert/strict";
import test from "node:test";

import { startLabor } from "../../src/engine/labor/setup.js";
import { resolveEnteredImpacts } from "../../src/engine/round/progress.js";
import { createInitialState } from "../../src/engine/state/create.js";

test("IMP-001 keeps Cannot Block fixed when a die enters the node later in the round", () => {
  const state = startLabor(createInitialState("human", "imp-cannot-block"), "labor.L04");
  const dice = state.currentLabor!.laborDice;
  dice["labor.L04.left"].health = 0;
  dice["labor.L04.left"].status = "defeated_inactive";
  dice["labor.L04.right"].nodeId = "L04R.n3";
  state.currentLabor!.cannotBlockThisRound = false;
  state.game.phase = "IMPACT_RESOLUTION";

  assert.equal(state.currentLabor!.cannotBlockThisRound, false);
  const resolved = resolveEnteredImpacts(state);
  assert.equal(resolved.currentLabor!.cannotBlockThisRound, false);
});

test("IMP-001 heals only the Labor die that entered the healing node", () => {
  const state = startLabor(createInitialState("human", "imp-source-heal"), "labor.L08");
  const dice = state.currentLabor!.laborDice;
  dice["labor.L08.A"].health = 5;
  dice["labor.L08.B"].health = 5;
  dice["labor.L08.B"].nodeId = "L08B.n1";
  state.game.phase = "IMPACT_RESOLUTION";

  assert.deepEqual(
    { A: dice["labor.L08.A"].health, B: dice["labor.L08.B"].health },
    { A: 5, B: 5 },
  );
  const resolved = resolveEnteredImpacts(state);
  assert.deepEqual(
    {
      A: resolved.currentLabor!.laborDice["labor.L08.A"].health,
      B: resolved.currentLabor!.laborDice["labor.L08.B"].health,
    },
    { A: 5, B: 6 },
  );
});

test("IMP-001 preserves the exact terminal die when a chained advance reaches failure", () => {
  const state = startLabor(createInitialState("human", "imp-terminal"), "labor.L06");
  const dice = state.currentLabor!.laborDice;
  dice["labor.L06.C14"].health = 0;
  dice["labor.L06.C14"].status = "defeated_inactive";
  dice["labor.L06.C15"].nodeId = "L06C15.n2";
  dice["labor.L06.C16"].nodeId = "L06C16.n2";
  dice["labor.L06.C17"].nodeId = "L06C17.n2";
  state.game.phase = "IMPACT_RESOLUTION";

  assert.deepEqual(
    {
      nodeId: dice["labor.L06.C17"].nodeId,
      status: dice["labor.L06.C17"].status,
      nextEvent: state.rng.nextEvent,
    },
    { nodeId: "L06C17.n2", status: "active", nextEvent: "0" },
  );
  const resolved = resolveEnteredImpacts(state);
  assert.deepEqual(
    {
      phase: resolved.game.phase,
      result: resolved.game.result,
      nodeId: resolved.currentLabor!.laborDice["labor.L06.C17"].nodeId,
      status: resolved.currentLabor!.laborDice["labor.L06.C17"].status,
      nextEvent: resolved.rng.nextEvent,
    },
    {
      phase: "DEFEAT",
      result: "defeat",
      nodeId: "L06C17.n3",
      status: "active_failure_terminal",
      nextEvent: "0",
    },
  );
});

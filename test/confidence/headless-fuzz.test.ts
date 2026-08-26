import assert from "node:assert/strict";
import test from "node:test";
import { HerculesEngine } from "../../src/engine/api.js";
import { submit } from "../../src/engine/commands/dispatcher.js";
import { canPlace } from "../../src/engine/dice/lifecycle.js";
import { attackForLaborDie } from "../../src/engine/labor/attacks.js";
import { satisfies } from "../../src/engine/requirements/evaluate.js";
import { assertValidState } from "../../src/engine/state/invariants.js";
import type { EngineCommand } from "../../src/engine/commands/types.js";
import type { GameState } from "../../src/engine/state/types.js";

const subsets = <T>(items: readonly T[]): T[][] => items.reduce<T[][]>((all, item) => [...all, ...all.map((set) => [...set, item])], [[]]);
const preferredDecision = (commands: EngineCommand[]): EngineCommand => commands.find((command) => command.type === "CHOOSE_OPTION" && command.optionId === "resolve_anyway") ?? commands[0];

function firstLegalAttack(state: GameState): EngineCommand | null {
  if (!state.currentLabor || state.game.phase !== "GOLD_AND_ATTACK_PLACEMENT") return null;
  const dice = Object.values(state.herculesDice).filter((die) => canPlace(die) && die.face !== null);
  for (const target of Object.values(state.currentLabor.laborDice).filter((die) => die.status === "active")) {
    const requirement = attackForLaborDie(state.currentLabor.laborId, target.id).requirement;
    const selection = subsets(dice).find((set) => set.length > 0 && satisfies(requirement, set.map((die) => die.face!)));
    if (selection) return { type: "ALLOCATE_ATTACK", targetId: target.id, dieIds: selection.map((die) => die.id) };
  }
  return null;
}

function runHumanSimulation(seed: string, maximumTransitions = 120): GameState {
  let state = HerculesEngine.createGame({ difficulty: "human", seed }).state;
  let previousEvent = BigInt(state.rng.nextEvent);
  for (let step = 0; step < maximumTransitions && state.game.result === null; step += 1) {
    assertValidState(state, `simulation ${seed} step ${step}`);
    let command: EngineCommand | null = null;
    if (state.game.phase === "BLUE_ABILITY_WINDOW") {
      const source = Object.values(state.herculesDice).find((die) => canPlace(die) && die.face !== null && !die.blueUsed);
      if (source && step % 2 === 0) command = { type: "USE_BLUE_ABILITY", abilityId: "ability.bow.blue", sourceDieId: source.id, target: 1 };
    } else command = firstLegalAttack(state);
    command ??= preferredDecision(HerculesEngine.getLegalCommands(state));
    try { state = submit(state, command).state; } catch (error) { throw new Error(`simulation ${seed} step ${step} command ${JSON.stringify(command)} phase ${state.game.phase} spirit ${String(state.player.spirit)} pending ${state.pendingDecision?.type ?? "none"}: ${error instanceof Error ? error.message : String(error)}`); }
    assertValidState(state, `simulation ${seed} step ${step} after ${command.type}`);
    assert.ok(BigInt(state.rng.nextEvent) >= previousEvent, "RNG event index must be monotonic");
    previousEvent = BigInt(state.rng.nextEvent);
    if (step % 5 === 0) assert.deepEqual(HerculesEngine.deserialize(HerculesEngine.serialize(state)), state);
  }
  return state;
}

test("deterministic Human simulations preserve legal state, save continuity, and RNG monotonicity", () => {
  for (let index = 0; index < 8; index += 1) {
    const state = runHumanSimulation(`phase6-human-${index}`);
    assert.notEqual(state.game.result, null, `simulation ${index} did not reach a terminal state`);
  }
});

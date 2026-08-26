import { getLegalCommands, submit } from "./commands/dispatcher.js";
import type { EngineCommand, EngineResult } from "./commands/types.js";
import { assertValidState, validateState } from "./state/invariants.js";
import { initializeGame } from "./state/create.js";
import { deserialize, serialize } from "./state/save.js";
import { exportDiagnostics } from "./diagnostics/export.js";
import { getPlayView } from "./view-model.js";
export type { PlayAbility, PlayControl, PlayView } from "./view-model.js";
import type { Difficulty, GameState, SerializedGame } from "./state/types.js";

export interface NewGameConfig { difficulty: Difficulty; seed: string; }

/** The supported boundary for callers such as the Phase 7 UI. */
export const HerculesEngine = {
  createGame(config: NewGameConfig): EngineResult {
    const state = initializeGame(config.difficulty, config.seed);
    assertValidState(state, "game creation");
    return { state, transitions: [], pendingDecision: state.pendingDecision, rngEvents: state.rng.ledger, validation: validateState(state) };
  },
  submit(state: GameState, command: EngineCommand): EngineResult { return submit(state, command); },
  getLegalCommands(state: GameState): EngineCommand[] { return getLegalCommands(state); },
  validateState,
  serialize(state: GameState): SerializedGame { return serialize(state); },
  deserialize(save: SerializedGame): GameState { return deserialize(save); },
  getPlayView,
  exportDiagnostics,
};

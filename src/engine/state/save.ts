import { currentContentHash } from "./create.js";
import { BUILD_VERSION } from "../build-version.js";
import type { GameState, SerializedGame } from "./types.js";
import { validateState } from "./invariants.js";
const canonicalize = (value: unknown): unknown => Array.isArray(value) ? value.map(canonicalize) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)])) : value;
export function canonicalJson(value: unknown): string { return JSON.stringify(canonicalize(value)); }
export function serialize(state: GameState): SerializedGame { const report = validateState(state); if (!report.valid) throw new Error(`Cannot serialize invalid state: ${report.errors.join("; ")}`); return { schemaVersion: state.schemaVersion, dataRevision: state.dataRevision, contentHash: currentContentHash(), buildVersion: BUILD_VERSION, state: structuredClone(state) }; }
const addResourceQueue = (state: GameState | Omit<GameState, "undoStack">): void => {
  state.round.resourceQueue ??= { spiritDeltas: [], divinityDeltas: [] };
  for (const placement of state.round.goldPlacements) placement.contributionIds ??= [];
  // v0.1.2 represented an effective-double source as an inseparable doubled
  // value. Convert persisted rounds to the linked contribution model so active
  // saves retain both independently assignable contributions.
  for (const sourceDieId of state.round.effectiveDoubleDieIds ?? []) {
    const source = state.herculesDice[sourceDieId];
    const alreadyCreated = Object.values(state.round.derivedContributions ?? {}).some(entry => entry.sourceDieId === sourceDieId);
    if (source?.face !== null && !alreadyCreated) {
      const id = `${sourceDieId}-D${Object.values(state.round.derivedContributions ?? {}).filter(entry => entry.sourceDieId === sourceDieId).length + 1}`;
      (state.round.derivedContributions ??= {})[id] = { id, sourceDieId, face: source.face, allocated: false };
    }
  }
  state.round.effectiveDoubleDieIds = [];
  for (const checkpoint of ("undoStack" in state ? state.undoStack : [])) addResourceQueue(checkpoint.state);
};
export function deserialize(save: SerializedGame): GameState { if (save.contentHash !== currentContentHash()) throw new Error("Save content hash does not match current game data."); if (save.schemaVersion !== save.state.schemaVersion || save.dataRevision !== save.state.dataRevision) throw new Error("Save envelope and canonical state revisions disagree."); const state = structuredClone(save.state); addResourceQueue(state); if (!Array.isArray(state.transitions)) throw new Error("Save is missing deterministic transition history."); const report = validateState(state); if (!report.valid) throw new Error(`Invalid saved state: ${report.errors.join("; ")}`); return state; }

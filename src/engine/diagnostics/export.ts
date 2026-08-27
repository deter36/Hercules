import { currentContentHash } from "../state/create.js";
import { validateState, type InvariantReport } from "../state/invariants.js";
import { canonicalJson } from "../state/save.js";
import type { GameState } from "../state/types.js";
import { BUILD_VERSION } from "../build-version.js";

export interface DiagnosticsBundle { buildVersion: string; schemaVersion: string; dataRevision: string; contentHash: string; canonicalState: string; hiddenSources: { orderedMoodDeck: string[]; activeMoodId: string | null }; rng: GameState["rng"]; rngLedger: GameState["rng"]["ledger"]; transitions: GameState["transitions"]; pendingDecision: GameState["pendingDecision"]; validation: InvariantReport; }
export function exportDiagnostics(state: GameState): DiagnosticsBundle { return { buildVersion: BUILD_VERSION, schemaVersion: state.schemaVersion, dataRevision: state.dataRevision, contentHash: currentContentHash(), canonicalState: canonicalJson(state), hiddenSources: { orderedMoodDeck: [...state.mood.deck], activeMoodId: state.mood.activeMoodId }, rng: structuredClone(state.rng), rngLedger: structuredClone(state.rng.ledger), transitions: structuredClone(state.transitions), pendingDecision: structuredClone(state.pendingDecision), validation: validateState(state) }; }

import { startLabor } from "./setup.js";
import type { GameState } from "../state/types.js";
import { resolveMood } from "./setup.js";
import { shuffleMoodDeck } from "../../rng/herc-rng.js";

export function completeLaborTransitionWithCheckpoint(state: GameState): { state: GameState; checkpoint: GameState } {
  if (state.game.phase !== "LABOR_TRANSITION" || !state.game.currentLaborId) throw new Error("Labor transition is not legal.");
  const next = structuredClone(state);
  const completed = next.game.currentLaborId!;
  if (!next.game.completedLaborIds.includes(completed)) next.game.completedLaborIds.push(completed);
  next.player.temporaryEffects = [];
  if (next.mood.activeMoodId) next.mood.deck.push(next.mood.activeMoodId);
  next.mood.activeMoodId = null;
  if (next.game.completedLaborIds.length === 12) {
    next.game.phase = next.player.divinity === "TOP" || next.player.divinity === 10 ? "VICTORY" : "DEFEAT";
    next.game.result = next.game.phase === "VICTORY" ? "victory" : "defeat";
    return { state: next, checkpoint: structuredClone(next) };
  }
  const nextNumber = Math.max(...next.game.completedLaborIds.map((id) => Number(id.slice(-2)))) + 1;
  const shuffled = shuffleMoodDeck(next, `labor${Number(completed.slice(-2))}:end_mood_shuffle`);
  const checkpoint = structuredClone(shuffled);
  const laborStarted = startLabor(shuffled, `labor.L${String(nextNumber).padStart(2, "0")}`);
  const moodId = laborStarted.mood.deck[0];
  if (!moodId) throw new Error("Labor transition requires an ordered Mood deck.");
  return { state: resolveMood(laborStarted, moodId), checkpoint };
}
export function completeLaborTransition(state: GameState): GameState { return completeLaborTransitionWithCheckpoint(state).state; }

import { GAME_DATA, GAME_DATA_CONTENT_HASH } from "../../data/generated/game-data.js";
import type { Difficulty, GameState } from "./types.js";
import { shuffleMoodDeck } from "../../rng/herc-rng.js";
import { resolveMood, startLabor } from "../labor/setup.js";

export function createInitialState(difficulty: Difficulty, seed: string): GameState {
  if (!seed) throw new Error("A deterministic game seed is required.");
  const definition = GAME_DATA.difficulty[difficulty];
  const removedMoods: readonly string[] = definition.remove_moods;
  // Only normal Moods form the opening deck. Special Moods enter later through
  // their certified Reward replacement effects (add_mood/remove_mood).
  const deck = GAME_DATA.moods.filter((mood) => mood.class === "normal" && !removedMoods.includes(mood.id)).map((mood) => mood.id);
  const dice: GameState["herculesDice"] = Object.fromEntries(GAME_DATA.components.hercules_dice.map((die, index) => [die.id, { id: die.id, face: null, rollable: index < definition.starting_hercules_dice, blueUsed: false, spent: false, locked: false, allocated: false, broken: false, availableForLabor: index < definition.starting_hercules_dice, poolSource: index < definition.starting_hercules_dice ? "base" as const : "temporarily_unavailable" as const, placement: null, history: [] }]));
  // The physical Spirit track's initial X space is its seventeenth (and maximum)
  // space, immediately before the printed 16 space.
  // Divinity's physical X is the zero ordinal (the Golden Run records it as 0/10).
  return { schemaVersion: "hercules_game_state_v1", dataRevision: GAME_DATA.schema_version, game: { difficulty, currentLaborId: null, completedLaborIds: [], phase: "LABOR_SETUP", result: null }, player: { spirit: 17, divinity: 0, ownedRewardIds: [], removedRewardOrComponentIds: [], temporaryEffects: [], persistentHerculesDice: definition.starting_hercules_dice }, herculesDice: dice, currentLabor: null, round: { rollNumber: 0, rerollNumber: 0, cowsBRerollNumber: 0, effectiveDoubleDieIds: [], derivedContributions: {}, goldPlacements: [], attackAllocations: [], blockedSpirit: 0, resourceQueue: { spiritDeltas: [], divinityDeltas: [] } }, mood: { deck, activeMoodId: null, returnedMoodIds: [] }, rng: { algorithm: "SHA256_COUNTER_V1", policyVersion: "HERC-RNG-v3", seed, nextEvent: "0", ledger: [] }, pendingDecision: null, pendingTriggers: [], transitionIndex: 0, transitions: [], undoStack: [] };
}
export const currentContentHash = (): string => GAME_DATA_CONTENT_HASH;

/** Certified setup path: create -> RNG initialize -> Mood shuffle -> Labor I -> ordered Mood draw. */
export function initializeGame(difficulty: Difficulty, seed: string): GameState {
  let state = shuffleMoodDeck(createInitialState(difficulty, seed));
  state = startLabor(state, "labor.L01");
  const moodId = state.mood.deck[0];
  if (!moodId) throw new Error("The initialized Mood deck is empty.");
  return resolveMood(state, moodId);
}

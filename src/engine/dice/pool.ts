import type { GameState, HerculesDieState } from "../state/types.js";

const stableOrder = (left: HerculesDieState, right: HerculesDieState): number => Number(left.id.slice(1)) - Number(right.id.slice(1));

/** Restores the persistent pool before a new Labor's temporary Mood adjustment. */
export function restorePersistentDicePool(state: GameState): GameState {
  const next = structuredClone(state);
  const dice = Object.values(next.herculesDice).sort(stableOrder);
  if (next.player.persistentHerculesDice > dice.length) throw new Error("Persistent Hercules dice exceed the certified physical die inventory.");
  for (const [index, die] of dice.entries()) {
    const available = index < next.player.persistentHerculesDice;
    Object.assign(die, { face: null, rollable: available, blueUsed: false, spent: false, locked: false, allocated: false, broken: false, availableForLabor: available, poolSource: available ? "base" : "temporarily_unavailable", placement: null });
  }
  return next;
}

/** Applies the v5 deterministic bookkeeping convention for count-only Labor pool changes. */
export function applyTemporaryDiceDelta(state: GameState, delta: number): GameState {
  if (!Number.isInteger(delta)) throw new Error("Temporary Hercules die delta must be an integer.");
  const next = structuredClone(state);
  const dice = Object.values(next.herculesDice).sort(stableOrder);
  const candidates = delta < 0 ? dice.filter((die) => die.availableForLabor).reverse() : dice.filter((die) => !die.availableForLabor);
  if (Math.abs(delta) > candidates.length) throw new Error("Temporary Hercules die adjustment exceeds the certified physical die inventory.");
  for (const die of candidates.slice(0, Math.abs(delta))) {
    const available = delta > 0;
    Object.assign(die, { face: null, rollable: available && !die.broken, blueUsed: false, spent: false, locked: false, allocated: false, availableForLabor: available, poolSource: available ? "temporary_gain" : "temporarily_unavailable", placement: null });
  }
  return next;
}

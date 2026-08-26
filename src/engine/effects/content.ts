import type { GameState, PendingDecision } from "../state/types.js";
import { breakDie } from "../dice/lifecycle.js";
import { getNode } from "../labor/content.js";

type Effect = Record<string, unknown>;

export function applyContentEffect(state: GameState, effect: Effect, sourceId: string, sourceLaborDieId?: string): GameState {
  let next = structuredClone(state);
  if (typeof effect.spirit_delta === "number" && typeof next.player.spirit === "number") {
    const loss = effect.spirit_delta < 0 ? -effect.spirit_delta : 0;
    const blocked = loss > 0 && !next.currentLabor?.cannotBlockThisRound ? Math.min(loss, next.round.blockedSpirit) : 0;
    next.round.blockedSpirit -= blocked;
    const total = next.player.spirit + effect.spirit_delta + blocked;
    next.player.spirit = total <= 0 ? "SKULL" : Math.min(17, total);
  }
  if (typeof effect.divinity_delta === "number" && typeof next.player.divinity === "number") next.player.divinity = Math.max(0, Math.min(10, next.player.divinity + effect.divinity_delta));
  if (typeof effect.hercules_dice_delta === "number") {
    const total = next.player.persistentHerculesDice + effect.hercules_dice_delta;
    if (!Number.isInteger(total) || total < 1 || total > Object.keys(next.herculesDice).length) throw new Error("Persistent Hercules die adjustment exceeds the certified physical die inventory.");
    next.player.persistentHerculesDice = total;
  }
  if (typeof effect.heal === "number" && next.currentLabor) for (const die of Object.values(next.currentLabor.laborDice)) if (die.status === "active") die.health = Math.min(die.startingHealth, die.health + effect.heal);
  if (effect.cannot_block === true && next.currentLabor) next.currentLabor.cannotBlockThisRound = true;
  if (typeof effect.advance_all_other_active_labor_dice === "number" && next.currentLabor && sourceLaborDieId) {
    const targets = Object.values(next.currentLabor!.laborDice).filter((die) => die.status === "active" && die.id !== sourceLaborDieId).map((die) => die.id);
    for (const targetId of targets) {
      const die = next.currentLabor!.laborDice[targetId];
      for (let step = 0; step < effect.advance_all_other_active_labor_dice; step += 1) {
        const node = getNode(next.currentLabor!.laborId, die.trackId, die.nodeId);
        if (node.next.length !== 1) throw new Error("Advance-all effect encountered a non-deterministic track edge.");
        die.nodeId = node.next[0];
      }
      const entered = getNode(next.currentLabor!.laborId, die.trackId, die.nodeId);
      if (entered.effect?.failure !== undefined) { next.game.phase = "DEFEAT"; next.game.result = "defeat"; return next; }
      if (entered.effect) next = applyContentEffect(next, entered.effect, entered.id, targetId);
      if (next.pendingDecision || next.game.phase === "DEFEAT") return next;
    }
  }
  if (typeof effect.break_hercules_die === "string" && next.herculesDice[effect.break_hercules_die]) next.herculesDice[effect.break_hercules_die] = breakDie(next.herculesDice[effect.break_hercules_die]);
  if (typeof effect.break_hercules_die === "number") {
    const legal = Object.values(next.herculesDice).filter((die) => die.availableForLabor && !die.broken).map((die) => ({ id: die.id }));
    const decision: PendingDecision = { id: `break:${sourceId}`, type: "CHOOSE_DIE_TO_BREAK", prompt: "Choose a die to break", legalOptions: legal, source: { kind: "effect", id: sourceId }, context: { count: effect.break_hercules_die }, allowSkip: false, randomnessOnResolve: false, undoBarrierOnResolve: false, revealsHiddenInformation: false };
    next.pendingDecision = decision;
  }
  return next;
}

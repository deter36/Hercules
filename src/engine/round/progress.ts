import { applyContentEffect, resolveQueuedResources } from "../effects/content.js";
import { getNode } from "../labor/content.js";
import type { GameState, PendingDecision } from "../state/types.js";

export function advanceLaborDice(state: GameState, laborDieIds?: readonly string[]): GameState {
  if (state.game.phase !== "LABOR_ADVANCE" || !state.currentLabor) throw new Error("Labor advancement is not legal.");
  const next = structuredClone(state);
  const labor = next.currentLabor!;
  const selectedIds = laborDieIds ? new Set(laborDieIds) : null;
  const branchDice: Array<(typeof labor.laborDice)[string]> = [];
  for (const die of Object.values(labor.laborDice).filter((entry) => entry.status === "active" && (!selectedIds || selectedIds.has(entry.id)))) {
    const node = getNode(labor.laborId, die.trackId, die.nodeId);
    if (node.next.length === 0) throw new Error(`Active Labor die ${die.id} has no certified outgoing track edge.`);
    if (node.next.length > 1) {
      branchDice.push(die);
    } else die.nodeId = node.next[0];
  }
  if (branchDice.length > 0) {
    const die = branchDice[0];
    const node = getNode(labor.laborId, die.trackId, die.nodeId);
    const decision: PendingDecision = { id: `branch:${die.id}:${node.id}`, type: "CHOOSE_TRACK_BRANCH", prompt: "Choose route", legalOptions: node.next.map((id) => ({ id })), source: { kind: "track", id: node.id }, context: { laborDieId: die.id, trackId: die.trackId, from: node.id, remainingLaborDieIds: branchDice.slice(1).map(entry => entry.id) }, allowSkip: false, randomnessOnResolve: false, revealsHiddenInformation: false, undoBarrierOnResolve: false };
    next.pendingDecision = decision;
    return next;
  }
  next.game.phase = "IMPACT_RESOLUTION";
  return next;
}

export function resolveEnteredImpacts(state: GameState): GameState {
  if (state.game.phase !== "IMPACT_RESOLUTION" || !state.currentLabor) throw new Error("Impact resolution is not legal.");
  let next = structuredClone(state);
  const labor = next.currentLabor!;
  for (const die of Object.values(labor.laborDice).filter((entry) => entry.status === "active")) {
    const node = getNode(labor.laborId, die.trackId, die.nodeId);
    const effect = node.effect;
    if (effect?.failure !== undefined) { next.game.phase = "DEFEAT"; next.game.result = "defeat"; return next; }
    if (effect) next = applyContentEffect(next, effect, node.id, die.id, true);
    if (next.pendingDecision) return next;
  }
  next = resolveQueuedResources(next);
  if (next.game.phase === "DEFEAT") return next;
  next.game.phase = "FAILURE_CHECK";
  if (next.player.spirit === 0 || next.player.spirit === "SKULL") { next.game.phase = "DEFEAT"; next.game.result = "defeat"; }
  return next;
}

import { commitFaces } from "../dice/commit.js";
import { resetRound } from "../dice/lifecycle.js";
import { applyLaborDamage, allLaborDiceDefeated } from "../labor/damage.js";
import { getNode } from "../labor/content.js";
import { GAME_DATA } from "../../data/generated/game-data.js";
import { modifyInitialRoll, setAsideForMood } from "../moods/roll-modifiers.js";
import type { GameState } from "../state/types.js";
import { commitStagedDraws, stageDraws } from "../../rng/herc-rng.js";
import { advanceLaborDice, resolveEnteredImpacts } from "./progress.js";
import { beginRewardChoice } from "../rewards/resolve.js";
import { enforceHindSoftLock } from "../labor/hind.js";
import { completeLaborTransition } from "../labor/transition.js";
import { beginRngUndoInterval } from "../state/undo.js";

const moodEffect = (state: GameState): unknown => GAME_DATA.moods.find((mood) => mood.id === state.mood.activeMoodId)?.effect;

/** Commit already-produced initial-roll faces; RNG production is intentionally kept at the command boundary. */
export function commitInitialRoll(state: GameState, faces: Readonly<Record<string, number>>): GameState {
  if (state.game.phase !== "READY_TO_ROLL") throw new Error("Initial roll is only legal at READY_TO_ROLL.");
  const next = structuredClone(state);
  next.currentLabor!.cannotBlockThisRound = Object.values(next.currentLabor!.laborDice).some((die) => die.status === "active" && getNode(next.currentLabor!.laborId, die.trackId, die.nodeId).effect?.cannot_block === true);
  const effect = moodEffect(next);
  const raw = commitFaces(next.herculesDice, faces);
  for (const die of Object.values(raw)) if (die.face !== null) {
    die.face = modifyInitialRoll(die.face, effect);
    if (setAsideForMood(die.face, effect, false)) { die.spent = true; die.rollable = false; die.placement = { kind: "mood_set_aside", moodId: next.mood.activeMoodId }; }
  }
  next.herculesDice = raw;
  next.game.phase = "BLUE_ABILITY_WINDOW";
  return next;
}

export function rollFromRng(state: GameState): GameState {
  if (!state.currentLabor) throw new Error("Cannot roll without an active Labor.");
  let next = structuredClone(state);
  const labor = next.currentLabor!;
  const laborNumber = Number(labor.laborId.slice(-2));
  const rollNumber = next.round.rollNumber + 1;
  const dice = Object.values(next.herculesDice).filter((entry) => entry.rollable && !entry.broken).sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  const staged = stageDraws(next, dice.map((die) => ({ purpose: `labor${laborNumber}:roll${rollNumber}:${die.id}`, bound: 6, result: (value) => value + 1 })));
  next = commitStagedDraws(next, staged);
  const faces = Object.fromEntries(staged.map((entry, index) => [dice[index].id, entry.request.result(entry.draw.value) as number]));
  next.round.rollNumber = rollNumber;
  return beginRngUndoInterval(commitInitialRoll(next, faces));
}

export function rerollFromRng(state: GameState, dieIds: readonly string[], scope: "normal" | "cows_b" = "normal"): GameState {
  if (state.game.phase !== "BLUE_ABILITY_WINDOW" || !state.currentLabor || dieIds.length === 0) throw new Error("Rerolls are only legal for selected dice in the blue window.");
  if (new Set(dieIds).size !== dieIds.length) throw new Error("A die cannot be rerolled twice in one action.");
  let next = structuredClone(state);
  const labor = next.currentLabor!;
  const laborNumber = Number(labor.laborId.slice(-2));
  const rerollNumber = scope === "cows_b" ? next.round.cowsBRerollNumber + 1 : next.round.rerollNumber + 1;
  const effect = moodEffect(next);
  const orderedIds = [...dieIds].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  for (const id of orderedIds) {
    const die = next.herculesDice[id];
    if (!die || !die.availableForLabor || die.broken || die.spent || die.locked || die.allocated || die.face === null) throw new Error(`Die ${id} is not eligible for reroll.`);
  }
  const staged = stageDraws(next, orderedIds.map((id) => ({ purpose: scope === "cows_b" ? `labor${laborNumber}:cows_b:reroll${rerollNumber}:${id}` : `labor${laborNumber}:reroll${rerollNumber}:${id}`, bound: 6, result: (value) => value + 1 })));
  next = commitStagedDraws(next, staged);
  for (const [index, id] of orderedIds.entries()) {
    const die = next.herculesDice[id];
    const entry = staged[index];
    die.face = entry.request.result(entry.draw.value) as number;
    die.history.push({ type: "reroll", purpose: entry.request.purpose, eventIndex: entry.eventIndex.toString() });
    if (setAsideForMood(die.face, effect, true)) { die.spent = true; die.rollable = false; die.placement = { kind: "mood_set_aside", moodId: next.mood.activeMoodId }; }
  }
  if (scope === "cows_b") next.round.cowsBRerollNumber = rerollNumber; else next.round.rerollNumber = rerollNumber;
  return beginRngUndoInterval(next);
}

export function resolveRoundDamage(state: GameState): GameState {
  if (state.game.phase !== "GOLD_AND_ATTACK_PLACEMENT" && state.game.phase !== "DAMAGE_RESOLUTION") throw new Error("Damage resolution is not legal.");
  let next = structuredClone(state);
  for (const allocation of next.round.attackAllocations) { if(allocation.targetId==="__all_active_targets__"){for(const target of Object.values(next.currentLabor!.laborDice).filter(die=>die.status==="active"))next=applyLaborDamage(next,target.id,allocation.damage);}else if(next.currentLabor!.laborDice[allocation.targetId]?.status==="active")next = applyLaborDamage(next, allocation.targetId, allocation.damage); }
  if(allLaborDiceDefeated(next)){next.game.phase="REWARD_SELECTION";return beginRewardChoice(next);}
  next.game.phase = "LABOR_ADVANCE";
  next=advanceLaborDice(next);
  if(next.pendingDecision)return next;
  next=resolveEnteredImpacts(next);
  next=enforceHindSoftLock(next);
  if(next.pendingDecision||next.game.phase==="DEFEAT")return next;
  if(next.game.phase==="FAILURE_CHECK")return cleanupRound(next);
  return next;
}

export function cleanupRound(state: GameState): GameState {
  const next = structuredClone(state);
  (next.round as GameState["round"] & { usedBlueAbilityIds?: string[] }).usedBlueAbilityIds = [];
  next.herculesDice = resetRound(next.herculesDice);
  next.round = { rollNumber: next.round.rollNumber, rerollNumber: next.round.rerollNumber, cowsBRerollNumber: next.round.cowsBRerollNumber, effectiveDoubleDieIds: [], derivedContributions: {}, goldPlacements: [], attackAllocations: [], blockedSpirit: 0 };
  next.game.phase = "READY_TO_ROLL";
  return next;
}

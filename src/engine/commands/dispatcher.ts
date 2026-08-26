import { sha256Hex } from "../../rng/sha256.js";
import { assertValidState, validateState } from "../state/invariants.js";
import type { EngineResult, EngineCommand, TransitionRecord } from "./types.js";
import type { GameState } from "../state/types.js";
import { beginRngUndoInterval, checkpointDeterministicAction, undoDeterministicAction } from "../state/undo.js";
import { cleanupRound, rollFromRng, resolveRoundDamage } from "../round/resolve.js";
import { resolveEnteredImpacts } from "../round/progress.js";
import { chooseBranch, chooseBrokenDie, chooseGhostAbderusCost, choosePholusReward } from "../decisions/resolve.js";
import { allocateAttack, placeGoldAbility, useBlueAbility, useCowsA, useCowsB, useRerollOne } from "../actions/placement.js";
import { chooseReward, chooseRewardToRemove } from "../rewards/resolve.js";
import { resolveAssignments, resolveAnyway } from "./resolve-assignments.js";
import { resolveZeusRedraw } from "../labor/setup.js";
import { completeLaborTransition } from "../labor/transition.js";

const hash = (state: GameState): string => sha256Hex(JSON.stringify(state));
const sameCommand = (left: EngineCommand, right: EngineCommand): boolean => JSON.stringify(left) === JSON.stringify(right);
const directAction = (command: EngineCommand): boolean => ["USE_BLUE_ABILITY", "REROLL_DIE", "USE_COWS_A", "USE_COWS_B", "PLACE_GOLD", "ALLOCATE_ATTACK"].includes(command.type);

export function getLegalCommands(state: GameState): EngineCommand[] {
  const undo = state.undoStack.length > 0 ? [{ type: "UNDO_DETERMINISTIC" } as const] : [];
  if (state.pendingDecision) return [...state.pendingDecision.legalOptions.map((option) => ({ type: "CHOOSE_OPTION" as const, decisionId: state.pendingDecision!.id, optionId: option.id })), ...undo];
  switch (state.game.phase) {
    case "READY_TO_ROLL": return [{ type: "ROLL" }, ...undo];
    case "BLUE_ABILITY_WINDOW": return [{ type: "FINISH_BLUE_PHASE" }, ...undo];
    case "GOLD_AND_ATTACK_PLACEMENT": return [{ type: "RESOLVE_ASSIGNMENTS" }, ...undo];
    default: return undo;
  }
}

export function submit(state: GameState, command: EngineCommand): EngineResult {
  const before = hash(state);
  if (!directAction(command) && !getLegalCommands(state).some((candidate) => sameCommand(candidate, command))) throw new Error(`Illegal command ${command.type} in ${state.game.phase}.`);
  let next: GameState;
  let type: string;
  if (command.type === "UNDO_DETERMINISTIC") {
    next = undoDeterministicAction(state);
    type = "DETERMINISTIC_ACTION_UNDONE";
  } else {
    next = structuredClone(state);
    if (command.type === "ROLL") {
      next = beginRngUndoInterval(rollFromRng(next));
      type = "DICE_ROLLED";
    } else if (command.type === "REROLL_DIE") {
      next = useRerollOne(next, command.abilityId, command.dieId);
      type = "DIE_REROLLED";
    } else if (command.type === "USE_COWS_B") {
      next = useCowsB(next, command.sourceDieId, command.rerollDieIds);
      type = "COWS_B_REROLLED";
    } else {
      next = checkpointDeterministicAction(next);
      if (command.type === "USE_BLUE_ABILITY") {
        next = useBlueAbility(next, command.abilityId, command.sourceDieId, command.target);
        type = "BLUE_ABILITY_USED";
      } else if (command.type === "USE_COWS_A") {
        next = useCowsA(next, command.sourceDieId, command.targetDieId, command.face);
        type = "COWS_A_USED";
      } else if (command.type === "PLACE_GOLD") {
        next = placeGoldAbility(next, command.abilityId, command.dieIds);
        type = "GOLD_ABILITY_PLACED";
      } else if (command.type === "ALLOCATE_ATTACK") {
        next = allocateAttack(next, command.targetId, command.dieIds, command.contributionIds);
        type = "ATTACK_ALLOCATED";
      } else if (command.type === "FINISH_BLUE_PHASE") {
        next.game.phase = "GOLD_AND_ATTACK_PLACEMENT";
        type = "BLUE_PHASE_FINISHED";
      } else if (command.type === "RESOLVE_ASSIGNMENTS") {
        next = resolveAssignments(next);
        if (next.game.phase === "DAMAGE_RESOLUTION") next = resolveRoundDamage(next);
        type = "ASSIGNMENTS_RESOLVED";
      } else if (command.type === "CHOOSE_OPTION") {
        const decision = next.pendingDecision!;
        if (decision.type === "CHOOSE_TRACK_BRANCH") {
          next = chooseBranch(next, command.decisionId, command.optionId);
          next = resolveEnteredImpacts(next);
          if (next.game.phase === "FAILURE_CHECK") next = cleanupRound(next);
        }
        else if (decision.type === "CHOOSE_DIE_TO_BREAK") next = chooseBrokenDie(next, command.decisionId, command.optionId);
        else if (decision.type === "CHOOSE_GHOST_ABDERUS_COST") next = chooseGhostAbderusCost(next, command.decisionId, command.optionId as "lose_die" | "lose_spirit");
        else if (decision.type === "CHOOSE_PHOLUS_REWARD") next = choosePholusReward(next, command.decisionId, command.optionId);
        else if (decision.type === "CHOOSE_REWARD") next = chooseReward(next, command.optionId);
        else if (decision.type === "CHOOSE_REWARD_TO_REMOVE") next = chooseRewardToRemove(next, command.decisionId, command.optionId);
        else if (decision.type === "CHOOSE_ZEUS_REDRAW") next = resolveZeusRedraw(next, command.decisionId, command.optionId as "keep" | "redraw");
        else if (decision.type === "CONFIRM_RESOLVE_WITH_UNUSED_MEANINGFUL_PLACEMENT") {
          if (command.optionId === "return") { next.pendingDecision = null; next.game.phase = "GOLD_AND_ATTACK_PLACEMENT"; }
          else next = resolveRoundDamage(resolveAnyway(next, command.decisionId));
        } else next.pendingDecision = null;
        type = "DECISION_RESOLVED";
      } else {
        throw new Error(`Unsupported legal command ${command.type}.`);
      }
    }
  }
  if (next.game.phase === "LABOR_TRANSITION" && !next.pendingDecision) next = completeLaborTransition(next);
  const after = hash(next);
  const payload: Record<string, unknown> = { command, spirit: { before: state.player.spirit, after: next.player.spirit }, divinity: { before: state.player.divinity, after: next.player.divinity } };
  if (command.type === "PLACE_GOLD") payload.goldAbilityId = command.abilityId;
  if (command.type === "ALLOCATE_ATTACK") payload.attack = { targetId: command.targetId, dieIds: command.dieIds };
  const transition: TransitionRecord = { index: next.transitionIndex++, type, source: { kind: "command", id: command.type }, payload, beforeHash: before, afterHash: after };
  next.transitions.push(structuredClone(transition));
  assertValidState(next, type);
  return { state: next, transitions: [transition], pendingDecision: next.pendingDecision, rngEvents: next.rng.ledger, validation: validateState(next) };
}

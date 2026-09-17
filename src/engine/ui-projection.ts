import type { EngineCommand } from "./commands/types.js";
import type { GameState } from "./state/types.js";
import { getPlayView, type PlayAction, type PlayView } from "./view-model.js";
import { removeAttackAllocation } from "./actions/placement.js";

export type UiPieceId = string;
export type UiTargetKind = "blue" | "gold" | "attack";

export interface LegalTarget {
  id: string;
  kind: UiTargetKind;
  label: string;
  commands: EngineCommand[];
}

export interface ForecastEntry {
  id: "attack" | "block" | "spirit" | "divinity";
  label: string;
  value: number;
}

export interface ForecastProjection {
  entries: ForecastEntry[];
  neutral: boolean;
}

export interface GameplayScreenModel {
  view: PlayView;
  legalTargets: LegalTarget[];
  forecast: ForecastProjection;
  undoAvailable: boolean;
  phaseCta: "ROLL" | "FINISH_BLUE" | "RESOLVE_ASSIGNMENTS" | "UNSELECT" | null;
}

function commandPieces(command: EngineCommand): string[] {
  if (command.type === "USE_BLUE_ABILITY") return [command.sourceDieId];
  if (command.type === "REROLL_DIE") return [command.dieId];
  if (command.type === "USE_COWS_A") return [command.sourceDieId, command.targetDieId];
  if (command.type === "USE_COWS_B") return [command.sourceDieId, ...command.rerollDieIds];
  if (command.type === "PLACE_GOLD" || command.type === "ALLOCATE_ATTACK") return [...command.dieIds, ...(command.contributionIds ?? [])];
  return [];
}

function samePieces(left: string[], right: string[]): boolean {
  return left.length === right.length && [...left].sort().every((id, index) => id === [...right].sort()[index]);
}

function targetFor(action: PlayAction): Omit<LegalTarget, "commands"> | null {
  const { command } = action;
  if (action.group === "blue") {
    const abilityId = command.type === "USE_BLUE_ABILITY" || command.type === "REROLL_DIE" ? command.abilityId : command.type === "USE_COWS_A" ? "ability.reward.L05.A.blue" : command.type === "USE_COWS_B" ? "ability.reward.L05.B.blue" : null;
    return abilityId ? { id: `blue:${abilityId}`, kind: "blue", label: action.label.split(":")[0] } : null;
  }
  if (command.type === "PLACE_GOLD") return { id: `gold:${command.abilityId}`, kind: "gold", label: action.label.split(":")[0] };
  if (command.type === "ALLOCATE_ATTACK") return { id: `attack:${command.targetId}`, kind: "attack", label: action.label.replace(/ with .+$/, "") };
  return null;
}

/**
 * Returns only engine-certified destinations for an exact loose selection.
 * React may group or decorate these targets, but cannot add a destination.
 */
export function getLegalTargets(state: GameState, selection: UiPieceId[]): LegalTarget[] {
  if (selection.length === 0) return [];
  const view = getPlayView(state);
  const groups = new Map<string, LegalTarget>();
  for (const action of view.actions) {
    if ((action.group !== "blue" && action.group !== "placement") || !samePieces(commandPieces(action.command), selection)) continue;
    const target = targetFor(action);
    if (!target) continue;
    const existing = groups.get(target.id);
    if (existing) existing.commands.push(action.command);
    else groups.set(target.id, { ...target, commands: [action.command] });
  }
  return [...groups.values()];
}

/** Engine-certified destinations for one already committed attack bundle. */
export function getEditableAttackTargets(state: GameState, allocationIndex: number): LegalTarget[] {
  const allocation = state.round.attackAllocations[allocationIndex];
  if (!allocation) return [];
  try {
    const released = removeAttackAllocation(state, allocationIndex);
    return getLegalTargets(released, [...allocation.dieIds, ...allocation.contributionIds])
      .filter(target => target.kind === "attack")
      .map(target => ({ ...target, commands: target.commands
        .filter((command): command is Extract<EngineCommand, { type: "ALLOCATE_ATTACK" }> => command.type === "ALLOCATE_ATTACK")
        .map(command => ({ type: "MOVE_ATTACK_ALLOCATION" as const, allocationIndex, targetId: command.targetId })) }));
  } catch {
    return [];
  }
}

/** A pure, compact preview of effects already committed to the current round. */
export function getForecastProjection(state: GameState): ForecastProjection {
  const attackCount = state.round.attackAllocations.reduce((total, allocation) => total + allocation.damage, 0);
  const block = state.currentLabor?.cannotBlockThisRound ? 0 : state.round.blockedSpirit;
  const resourceQueue = state.round.resourceQueue;
  const spirit = resourceQueue.spiritDeltas.reduce((total, value) => total + value, 0);
  const divinity = resourceQueue.divinityDeltas.reduce((total, value) => total + value, 0);
  const entries: ForecastEntry[] = [];
  if (attackCount) entries.push({ id: "attack", label: "Attack", value: attackCount });
  if (block) entries.push({ id: "block", label: "Block", value: block });
  if (spirit) entries.push({ id: "spirit", label: "Spirit", value: spirit });
  if (divinity) entries.push({ id: "divinity", label: "Divinity", value: divinity });
  return { entries, neutral: entries.length === 0 };
}

export function getGameplayScreenModel(state: GameState, selection: UiPieceId[] = []): GameplayScreenModel {
  const view = getPlayView(state);
  const cta = selection.length > 0 ? "UNSELECT" : state.game.phase === "READY_TO_ROLL" ? "ROLL" : state.game.phase === "BLUE_ABILITY_WINDOW" ? "FINISH_BLUE" : state.game.phase === "GOLD_AND_ATTACK_PLACEMENT" ? "RESOLVE_ASSIGNMENTS" : null;
  return {
    view,
    legalTargets: getLegalTargets(state, selection),
    forecast: getForecastProjection(state),
    undoAvailable: state.undoStack.length > 0,
    phaseCta: cta
  };
}

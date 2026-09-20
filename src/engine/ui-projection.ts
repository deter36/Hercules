import type { EngineCommand } from "./commands/types.js";
import type { GameState } from "./state/types.js";
import { getPlayView, type PlayAction, type PlayView } from "./view-model.js";
import { removeAttackAllocation, removeGoldPlacement } from "./actions/placement.js";
import { applyLaborDamage } from "./labor/damage.js";
import { resolveRoundDamage } from "./round/resolve.js";

export type UiPieceId = string;
export type UiTargetKind = "blue" | "gold" | "attack";

export interface LegalTarget {
  id: string;
  kind: UiTargetKind;
  label: string;
  commands: EngineCommand[];
}

export interface ForecastEntry {
  id: "damage" | "heal" | "spirit" | "divinity" | "break" | "defeat" | "route";
  label: string;
  value?: number;
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
      .map(target => ({ ...target, commands: target.commands.flatMap<EngineCommand>(command => {
        if (command.type === "ALLOCATE_ATTACK") return [{ type: "MOVE_ATTACK_ALLOCATION", allocationIndex, targetKind: "attack", targetId: command.targetId }];
        if (command.type === "PLACE_GOLD") return [{ type: "MOVE_ATTACK_ALLOCATION", allocationIndex, targetKind: "gold", targetId: command.abilityId }];
        return [];
      }) })).filter(target => target.commands.length > 0);
  } catch {
    return [];
  }
}

/** Engine-certified destinations for one already committed Gold bundle. */
export function getEditableGoldTargets(state: GameState, abilityId: string): LegalTarget[] {
  const placement = state.round.goldPlacements.find(candidate => candidate.abilityId === abilityId);
  if (!placement) return [];
  try {
    const released = removeGoldPlacement(state, abilityId);
    return getLegalTargets(released, [...placement.dieIds, ...placement.contributionIds])
      .filter(target => target.id !== `gold:${abilityId}`)
      .map(target => ({ ...target, commands: target.commands.flatMap<EngineCommand>(command => {
        if (command.type === "ALLOCATE_ATTACK") return [{ type: "MOVE_GOLD_PLACEMENT", abilityId, targetKind: "attack", targetId: command.targetId }];
        if (command.type === "PLACE_GOLD") return [{ type: "MOVE_GOLD_PLACEMENT", abilityId, targetKind: "gold", targetId: command.abilityId }];
        return [];
      }) })).filter(target => target.commands.length > 0);
  } catch {
    return [];
  }
}

function healthByLaborDie(state: GameState): Record<string, number> {
  return Object.fromEntries(Object.entries(state.currentLabor?.laborDice ?? {}).map(([id, die]) => [id, die.health]));
}

function brokenDieCount(state: GameState): number {
  return Object.values(state.herculesDice).filter(die => die.broken).length;
}

function numericResource(value: number | "X" | "SKULL" | "TOP"): number | null {
  return typeof value === "number" ? value : null;
}

/**
 * Applies only the attack step of resolution so the Forecast can report damage
 * actually dealt, rather than damage merely committed to a target that may
 * already have been defeated by an earlier bundle.
 */
function resolveCommittedAttacks(state: GameState): GameState {
  let next = structuredClone(state);
  if (!next.currentLabor) return next;
  for (const allocation of next.round.attackAllocations) {
    if (allocation.targetId === "__all_active_targets__") {
      for (const target of Object.values(next.currentLabor!.laborDice).filter(die => die.status === "active")) next = applyLaborDamage(next, target.id, allocation.damage);
    } else if (next.currentLabor!.laborDice[allocation.targetId]?.status === "active") {
      next = applyLaborDamage(next, allocation.targetId, allocation.damage);
    }
  }
  return next;
}

/** A pure end-of-turn tally for committed placements. It never mutates the game state or consumes RNG. */
export function getForecastProjection(state: GameState): ForecastProjection {
  if (state.game.phase !== "GOLD_AND_ATTACK_PLACEMENT" || !state.currentLabor) return { entries: [], neutral: true };

  const afterAttacks = resolveCommittedAttacks(state);
  const damage = Object.entries(healthByLaborDie(state)).reduce((total, [id, before]) => total + Math.max(0, before - (healthByLaborDie(afterAttacks)[id] ?? before)), 0);
  const resolved = resolveRoundDamage(state);
  const afterAttackHealth = healthByLaborDie(afterAttacks);
  const resolvedHealth = healthByLaborDie(resolved);
  const healing = Object.entries(afterAttackHealth).reduce((total, [id, afterAttack]) => total + Math.max(0, (resolvedHealth[id] ?? afterAttack) - afterAttack), 0);
  const beforeSpirit = numericResource(state.player.spirit);
  const afterSpirit = numericResource(resolved.player.spirit);
  const beforeDivinity = numericResource(state.player.divinity);
  const afterDivinity = numericResource(resolved.player.divinity);
  const spirit = beforeSpirit !== null && afterSpirit !== null ? afterSpirit - beforeSpirit : 0;
  const divinity = beforeDivinity !== null && afterDivinity !== null ? afterDivinity - beforeDivinity : 0;
  const breaks = Math.max(0, brokenDieCount(resolved) - brokenDieCount(state));
  const entries: ForecastEntry[] = [];
  if (damage) entries.push({ id: "damage", label: "damage", value: damage });
  if (healing) entries.push({ id: "heal", label: "heal", value: healing });
  if (spirit) entries.push({ id: "spirit", label: "Spirit", value: spirit });
  if (divinity) entries.push({ id: "divinity", label: "Divinity", value: divinity });
  if (breaks) entries.push({ id: "break", label: breaks === 1 ? "break" : "breaks", value: breaks });
  if (resolved.game.result === "defeat") entries.push({ id: "defeat", label: "Defeat" });
  if (resolved.pendingDecision?.type === "CHOOSE_TRACK_BRANCH") entries.push({ id: "route", label: "Route choice pending" });
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

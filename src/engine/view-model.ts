import { GAME_DATA } from "../data/generated/game-data.js";
import { attackForLaborDie } from "./labor/attacks.js";
import { getLabor, getNode } from "./labor/content.js";
import { canPlace } from "./dice/lifecycle.js";
import { satisfies, type Requirement } from "./requirements/evaluate.js";
import type { EngineCommand } from "./commands/types.js";
import type { GameState } from "./state/types.js";

type RecordValue = Record<string, unknown>;
export interface PlayAction { id: string; label: string; command: EngineCommand; group: "round" | "blue" | "placement" | "decision" | "utility"; }
export interface PlayView {
  game: GameState["game"];
  player: GameState["player"];
  dice: GameState["herculesDice"];
  labor: { id: string; name: string; dice: Array<{ id: string; health: number; startingHealth: number; trackId: string; nodeId: string; nodeEffect: unknown; status: string }> } | null;
  mood: { id: string | null; name: string | null };
  rewards: Array<{ id: string; name: string }>;
  pendingDecision: GameState["pendingDecision"];
  actions: PlayAction[];
  transitions: GameState["transitions"];
}

const records = (value: unknown): RecordValue[] => Array.isArray(value) ? value as RecordValue[] : [];
const findReward = (id: string): RecordValue | undefined => GAME_DATA.labors.flatMap((labor) => records(labor.rewards)).find((reward) => reward.id === id);
const rewardName = (id: string): string => id === "component.bow" ? String(GAME_DATA.components.bow.name) : String(findReward(id)?.name ?? id);
const activeReward = (state: GameState, id: string): boolean => !state.player.removedRewardOrComponentIds.includes(id) && !state.player.temporaryEffects.some(effect => typeof effect === "object" && effect !== null && (effect as RecordValue).type === "disabled_reward" && (effect as RecordValue).rewardId === id);
const eligibleDice = (state: GameState) => Object.values(state.herculesDice).filter(die => canPlace(die) && die.face !== null);
const combinations = <T>(items: T[]): T[][] => items.flatMap((item, index) => [[item], ...combinations(items.slice(index + 1)).map(rest => [item, ...rest])]);
const validPhysicalSets = (state: GameState, requirement: Requirement): string[][] => combinations(eligibleDice(state)).filter(dice => satisfies(requirement, dice.flatMap(die => state.round.effectiveDoubleDieIds.includes(die.id) ? [die.face!, die.face!] : [die.face!]))).map(dice => dice.map(die => die.id));

function blueActions(state: GameState): PlayAction[] {
  if (state.game.phase !== "BLUE_ABILITY_WINDOW") return [];
  const entries: Array<{ id: string; name: string; definition: RecordValue }> = [];
  if (!state.player.removedRewardOrComponentIds.includes("component.bow")) entries.push({ id: "ability.bow.blue", name: String(GAME_DATA.components.bow.name), definition: GAME_DATA.components.bow.blue_ability as unknown as RecordValue });
  if (state.mood.activeMoodId === "mood.ferocious") entries.push({ id: "ability.mood.ferocious.blue", name: "Ferocious", definition: { type: "set_any" } });
  for (const rewardId of state.player.ownedRewardIds.filter(id => activeReward(state, id))) for (const ability of records(findReward(rewardId)?.blue)) entries.push({ id: String(ability.id), name: rewardName(rewardId), definition: ability });
  const actions: PlayAction[] = [];
  for (const entry of entries) for (const source of eligibleDice(state).filter(die => !die.blueUsed)) {
    const type = String(entry.definition.type ?? entry.definition.operation ?? "");
    if (entry.id === "ability.reward.L05.A.blue") for (const target of eligibleDice(state).filter(die => die.id !== source.id)) for (let face = 1; face <= 6; face += 1) actions.push({ id: `${entry.id}:${source.id}:${target.id}:${face}`, label: `${entry.name}: ${source.id} sets ${target.id} to ${face}`, group: "blue", command: { type: "USE_COWS_A", sourceDieId: source.id, targetDieId: target.id, face } });
    else if (entry.id === "ability.reward.L05.B.blue") for (const target of eligibleDice(state).filter(die => die.id !== source.id)) actions.push({ id: `${entry.id}:${source.id}:${target.id}`, label: `${entry.name}: reroll ${target.id}`, group: "blue", command: { type: "USE_COWS_B", sourceDieId: source.id, rerollDieIds: [target.id] } });
    else if (type === "reroll_one") for (const target of eligibleDice(state).filter(die => !die.blueUsed)) actions.push({ id: `${entry.id}:${target.id}`, label: `${entry.name}: reroll ${target.id}`, group: "blue", command: { type: "REROLL_DIE", abilityId: entry.id, dieId: target.id } });
    else if (type === "set_any") for (let face = 1; face <= 6; face += 1) actions.push({ id: `${entry.id}:${source.id}:${face}`, label: `${entry.name}: set ${source.id} to ${face}`, group: "blue", command: { type: "USE_BLUE_ABILITY", abilityId: entry.id, sourceDieId: source.id, target: face } });
    else if (!["sacrifice_source_set_other_any", "place_source_reroll_any", "mood_redraw_next_ordered_no_rng"].includes(type)) actions.push({ id: `${entry.id}:${source.id}`, label: `${entry.name}: use ${source.id}`, group: "blue", command: { type: "USE_BLUE_ABILITY", abilityId: entry.id, sourceDieId: source.id } });
  }
  return actions;
}

/** A display-and-command projection. The UI only renders this projection and submits its commands. */
export function getPlayView(state: GameState): PlayView {
  const actions: PlayAction[] = [];
  const command = (id: string, label: string, action: EngineCommand, group: PlayAction["group"]): void => { actions.push({ id, label, command: action, group }); };
  if (state.pendingDecision) for (const option of state.pendingDecision.legalOptions) command(`decision:${option.id}`, option.label ?? option.id, { type: "CHOOSE_OPTION", decisionId: state.pendingDecision.id, optionId: option.id }, "decision");
  else if (state.game.phase === "READY_TO_ROLL") command("roll", "Roll Hercules dice", { type: "ROLL" }, "round");
  else if (state.game.phase === "BLUE_ABILITY_WINDOW") { actions.push(...blueActions(state)); command("finish-blue", "Finish blue phase", { type: "FINISH_BLUE_PHASE" }, "round"); }
  else if (state.game.phase === "GOLD_AND_ATTACK_PLACEMENT") {
    const usedGold = new Set(state.round.goldPlacements.map(placement => placement.abilityId));
    for (const rewardId of state.player.ownedRewardIds.filter(id => activeReward(state, id))) for (const ability of records(findReward(rewardId)?.gold)) {
      const requirement = ability.requirement as Requirement;
      if (usedGold.has(String(ability.id)) || !requirement) continue;
      for (const dieIds of validPhysicalSets(state, requirement)) command(`gold:${ability.id}:${dieIds.join("-")}`, `${rewardName(rewardId)}: ${dieIds.join(", ")}`, { type: "PLACE_GOLD", abilityId: String(ability.id), dieIds }, "placement");
    }
    for (const target of Object.values(state.currentLabor?.laborDice ?? {}).filter(die => die.status === "active")) {
      const attack = attackForLaborDie(state.currentLabor!.laborId, target.id);
      for (const dieIds of validPhysicalSets(state, attack.requirement)) command(`attack:${target.id}:${dieIds.join("-")}`, `Attack ${target.id} with ${dieIds.join(", ")}`, { type: "ALLOCATE_ATTACK", targetId: target.id, dieIds }, "placement");
    }
    command("resolve", "Resolve assignments", { type: "RESOLVE_ASSIGNMENTS" }, "round");
  }
  if (state.undoStack.length > 0) command("undo", "Undo last deterministic action", { type: "UNDO_DETERMINISTIC" }, "utility");
  const labor = state.currentLabor ? (() => { const source = getLabor(state.currentLabor!.laborId); return { id: state.currentLabor!.laborId, name: String(source.name ?? state.currentLabor!.laborId), dice: Object.values(state.currentLabor!.laborDice).map(die => ({ ...die, nodeEffect: getNode(state.currentLabor!.laborId, die.trackId, die.nodeId).effect })) }; })() : null;
  const mood = GAME_DATA.moods.find(entry => entry.id === state.mood.activeMoodId);
  return { game: state.game, player: state.player, dice: state.herculesDice, labor, mood: { id: state.mood.activeMoodId, name: mood ? String(mood.name) : null }, rewards: state.player.ownedRewardIds.map(id => ({ id, name: rewardName(id) })), pendingDecision: state.pendingDecision, actions, transitions: state.transitions };
}

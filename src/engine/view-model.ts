import { GAME_DATA } from "../data/generated/game-data.js";
import { attackForLaborDie } from "./labor/attacks.js";
import { getLabor, getNode, getTracks } from "./labor/content.js";
import { canPlace } from "./dice/lifecycle.js";
import { satisfies, type Requirement } from "./requirements/evaluate.js";
import type { EngineCommand } from "./commands/types.js";
import type { GameState } from "./state/types.js";

type RecordValue = Record<string, unknown>;
export interface PlayAction { id: string; label: string; command: EngineCommand; group: "round" | "blue" | "placement" | "decision" | "utility"; }
export interface PlayControl { id: string; label: string; command?: EngineCommand; choices?: PlayControl[]; }
export interface PlayAbility { id: string; label: string; choices: PlayControl[]; }
export interface PlayView {
  game: GameState["game"];
  player: GameState["player"];
  dice: GameState["herculesDice"];
  labor: { id: string; name: string; dice: Array<{ id: string; health: number; startingHealth: number; trackId: string; nodeId: string; nodeEffect: unknown; status: string; attack: string }>; tracks: Array<{ id: string; type: string; startId: string; nodes: Array<{ id: string; effect: unknown; next: string[] }> }> } | null;
  mood: { id: string | null; name: string | null; effect: string | null };
  rewards: Array<{ id: string; name: string }>;
  pendingDecision: GameState["pendingDecision"];
  actions: PlayAction[];
  blueAbilities: PlayAbility[];
  transitions: GameState["transitions"];
}

const records = (value: unknown): RecordValue[] => Array.isArray(value) ? value as RecordValue[] : [];
const findReward = (id: string): RecordValue | undefined => GAME_DATA.labors.flatMap((labor) => records(labor.rewards)).find((reward) => reward.id === id);
const rewardName = (id: string): string => id === "component.bow" ? String(GAME_DATA.components.bow.name) : String(findReward(id)?.name ?? id);
const activeReward = (state: GameState, id: string): boolean => !state.player.removedRewardOrComponentIds.includes(id) && !state.player.temporaryEffects.some(effect => typeof effect === "object" && effect !== null && (effect as RecordValue).type === "disabled_reward" && (effect as RecordValue).rewardId === id);
const eligibleDice = (state: GameState) => Object.values(state.herculesDice).filter(die => canPlace(die) && die.face !== null);
const combinations = <T>(items: T[]): T[][] => items.flatMap((item, index) => [[item], ...combinations(items.slice(index + 1)).map(rest => [item, ...rest])]);
const validPhysicalSets = (state: GameState, requirement: Requirement): string[][] => combinations(eligibleDice(state)).filter(dice => satisfies(requirement, dice.flatMap(die => state.round.effectiveDoubleDieIds.includes(die.id) ? [die.face!, die.face!] : [die.face!]))).map(dice => dice.map(die => die.id));
const requirementLabel = (r: Requirement): string => {
  switch (r.type) {
    case "any_die": return "any 1 die";
    case "exact_die": return `one ${r.value}`;
    case "die_in": return `one ${r.values.join(" or ")}`;
    case "matching_pair": return "2 matching dice";
    case "matching_triple": return "3 matching dice";
    case "matching_exact_pair": return `2 matching ${r.value}s`;
    case "exact_sum": return `dice totaling ${r.sum}`;
    case "variable_straight": return `${r.length}-die straight`;
    case "sum_equals_third": return "A + B = C";
    case "three_plus_x_lte_y": return "A + B ≤ C";
    case "fixed_straight": return `${r.values.length}-die straight`;
    case "multiplication_equals_sum_of_others": return "A × B = C";
    case "one_even_one_odd": return "1 even and 1 odd die";
    case "exact_values": return r.values.join(", ");
  }
};
const moodEffectDescription = (mood: RecordValue | undefined): string | null => {
  if (!mood) return null;
  const effect = mood.effect as RecordValue | undefined;
  if (!effect) return null;
  switch (effect.type) {
    case "initial_roll_delta": return `Initial rolls are ${Number(effect.value) > 0 ? "increased" : "reduced"} by ${Math.abs(Number(effect.value))}${effect.min ? ` (minimum ${effect.min})` : ""}${effect.max ? ` (maximum ${effect.max})` : ""}.`;
    case "temporary_dice_delta": return `${Number(effect.value) > 0 ? "Gain" : "Lose"} ${Math.abs(Number(effect.value))} temporary Hercules ${Math.abs(Number(effect.value)) === 1 ? "die" : "dice"} for this Labor.`;
    case "grant_blue_any": return "Once this roll, a Hercules die may use a blue space to become any face.";
    case "spirit_delta": return `Lose ${Math.abs(Number(effect.value))} Spirit.`;
    case "player_choice": return "Choose: lose one temporary Hercules die, or lose 5 Spirit.";
    case "set_aside_roll_face": return `Set aside every ${effect.face} rolled, including rerolls.`;
    case "disable_owned_reward_choice": return "Choose an owned Reward to disable for this Labor.";
    default: return `Verified Mood effect: ${JSON.stringify(effect)}.`;
  }
};

function blueActions(state: GameState): { actions: PlayAction[]; abilities: PlayAbility[] } {
  if (state.game.phase !== "BLUE_ABILITY_WINDOW") return { actions: [], abilities: [] };
  const used = (state.round as GameState["round"] & { usedBlueAbilityIds?: string[] }).usedBlueAbilityIds ?? [];
  const entries: Array<{ id: string; name: string; definition: RecordValue }> = [];
  if (!state.player.removedRewardOrComponentIds.includes("component.bow")) entries.push({ id: "ability.bow.blue", name: String(GAME_DATA.components.bow.name), definition: GAME_DATA.components.bow.blue_ability as unknown as RecordValue });
  if (state.mood.activeMoodId === "mood.ferocious") entries.push({ id: "ability.mood.ferocious.blue", name: "Ferocious", definition: { type: "set_any" } });
  for (const rewardId of state.player.ownedRewardIds.filter(id => activeReward(state, id))) for (const ability of records(findReward(rewardId)?.blue)) entries.push({ id: String(ability.id), name: rewardName(rewardId), definition: ability });
  const actions: PlayAction[] = [];
  for (const entry of entries.filter(entry => !used.includes(entry.id))) for (const source of eligibleDice(state).filter(die => !die.blueUsed)) {
    const type = String(entry.definition.type ?? entry.definition.operation ?? "");
    if (entry.id === "ability.reward.L05.A.blue") for (const target of eligibleDice(state).filter(die => die.id !== source.id)) for (let face = 1; face <= 6; face += 1) actions.push({ id: `${entry.id}:${source.id}:${target.id}:${face}`, label: `${entry.name}: ${source.id} sets ${target.id} to ${face}`, group: "blue", command: { type: "USE_COWS_A", sourceDieId: source.id, targetDieId: target.id, face } });
    else if (entry.id === "ability.reward.L05.B.blue") for (const target of eligibleDice(state).filter(die => die.id !== source.id)) actions.push({ id: `${entry.id}:${source.id}:${target.id}`, label: `${entry.name}: reroll ${target.id}`, group: "blue", command: { type: "USE_COWS_B", sourceDieId: source.id, rerollDieIds: [target.id] } });
    else if (type === "reroll_one") for (const target of eligibleDice(state).filter(die => !die.blueUsed)) actions.push({ id: `${entry.id}:${target.id}`, label: `${entry.name}: reroll ${target.id}`, group: "blue", command: { type: "REROLL_DIE", abilityId: entry.id, dieId: target.id } });
    else if (type === "set_any") for (let face = 1; face <= 6; face += 1) actions.push({ id: `${entry.id}:${source.id}:${face}`, label: `${entry.name}: set ${source.id} to ${face}`, group: "blue", command: { type: "USE_BLUE_ABILITY", abilityId: entry.id, sourceDieId: source.id, target: face } });
    else if (type === "modify_pip" && Array.isArray(entry.definition.delta)) for (const delta of entry.definition.delta.filter((value): value is number => typeof value === "number")) { const after = entry.definition.wrap === true ? ((source.face! - 1 + delta + 6) % 6) + 1 : Math.max(1, Math.min(6, source.face! + delta)); actions.push({ id: `${entry.id}:${source.id}:${delta}`, label: `${entry.name}: ${source.id} ${source.face} → ${after}`, group: "blue", command: { type: "USE_BLUE_ABILITY", abilityId: entry.id, sourceDieId: source.id, target: delta } }); }
    else if (!["sacrifice_source_set_other_any", "place_source_reroll_any", "mood_redraw_next_ordered_no_rng"].includes(type)) actions.push({ id: `${entry.id}:${source.id}`, label: `${entry.name}: use ${source.id}`, group: "blue", command: { type: "USE_BLUE_ABILITY", abilityId: entry.id, sourceDieId: source.id } });
  }
  const uniqueActions = [...new Map(actions.map(action => [action.id, action])).values()];
  const entryActions = (entry: { id: string }) => uniqueActions.filter((action) => {
    const command = action.command;
    return (command.type === "USE_BLUE_ABILITY" && command.abilityId === entry.id) ||
      (command.type === "REROLL_DIE" && command.abilityId === entry.id) ||
      (entry.id === "ability.reward.L05.A.blue" && command.type === "USE_COWS_A") ||
      (entry.id === "ability.reward.L05.B.blue" && command.type === "USE_COWS_B");
  });
  const pathFor = (action: PlayAction): string[] => {
    const command = action.command;
    if (command.type === "USE_BLUE_ABILITY") return [command.sourceDieId];
    if (command.type === "REROLL_DIE") return [command.dieId];
    if (command.type === "USE_COWS_A") return [command.sourceDieId, command.targetDieId];
    if (command.type === "USE_COWS_B") return [command.sourceDieId, command.rerollDieIds.join(", ")];
    return [];
  };
  const nestedControls = (group: PlayAction[], depth = 0): PlayControl[] => {
    const keyed = new Map<string, PlayAction[]>();
    for (const action of group) { const key = pathFor(action)[depth]; if (key) keyed.set(key, [...(keyed.get(key) ?? []), action]); }
    return [...keyed.entries()].map(([key, matches]) => matches.length === 1 ? { id: `${matches[0].id}:choice`, label: key, command: matches[0].command } : { id: `${matches[0].id}:step:${depth}`, label: key, choices: nestedControls(matches, depth + 1).length ? nestedControls(matches, depth + 1) : matches.map(action => ({ id: `${action.id}:leaf`, label: action.label, command: action.command })) });
  };
  const abilities = entries.map((entry) => ({ id: entry.id, label: entry.name, choices: nestedControls(entryActions(entry)) })).filter((ability) => ability.choices.length > 0);
  return { actions: uniqueActions, abilities };
}

/** A display-and-command projection. The UI only renders this projection and submits its commands. */
export function getPlayView(state: GameState): PlayView {
  const actions: PlayAction[] = [];
  let blueAbilities: PlayAbility[] = [];
  const command = (id: string, label: string, action: EngineCommand, group: PlayAction["group"]): void => { actions.push({ id, label, command: action, group }); };
  if (state.pendingDecision) for (const option of state.pendingDecision.legalOptions) command(`decision:${option.id}`, option.label ?? option.id, { type: "CHOOSE_OPTION", decisionId: state.pendingDecision.id, optionId: option.id }, "decision");
  else if (state.game.phase === "READY_TO_ROLL") command("roll", "Roll Hercules dice", { type: "ROLL" }, "round");
  else if (state.game.phase === "BLUE_ABILITY_WINDOW") { const blue = blueActions(state); actions.push(...blue.actions); blueAbilities = blue.abilities; command("finish-blue", "Finish blue phase", { type: "FINISH_BLUE_PHASE" }, "round"); }
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
  const labor = state.currentLabor ? (() => { const source = getLabor(state.currentLabor!.laborId); const tracks = Object.values(getTracks(state.currentLabor!.laborId)).map(track => ({ id: track.id, type: track.type, startId: track.startId, nodes: Object.values(track.nodes).map(node => ({ id: node.id, effect: node.effect, next: node.next })) })); return { id: state.currentLabor!.laborId, name: String(source.name ?? state.currentLabor!.laborId), dice: Object.values(state.currentLabor!.laborDice).map(die => ({ ...die, nodeEffect: getNode(state.currentLabor!.laborId, die.trackId, die.nodeId).effect, attack: requirementLabel(attackForLaborDie(state.currentLabor!.laborId, die.id).requirement) })), tracks }; })() : null;
  const mood = GAME_DATA.moods.find(entry => entry.id === state.mood.activeMoodId);
  return { game: state.game, player: state.player, dice: state.herculesDice, labor, mood: { id: state.mood.activeMoodId, name: mood ? String(mood.name) : null, effect: moodEffectDescription(mood as unknown as RecordValue | undefined) }, rewards: state.player.ownedRewardIds.map(id => ({ id, name: rewardName(id) })), pendingDecision: state.pendingDecision, actions, blueAbilities, transitions: state.transitions };
}

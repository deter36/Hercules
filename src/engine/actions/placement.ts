import { GAME_DATA } from "../../data/generated/game-data.js";
import { applyDieAbility } from "../dice/content-abilities.js";
import { canPlace } from "../dice/lifecycle.js";
import { applyContentEffect } from "../effects/content.js";
import { attackForLaborDie } from "../labor/attacks.js";
import { satisfies, type Requirement } from "../requirements/evaluate.js";
import type { GameState } from "../state/types.js";
import { rerollFromRng } from "../round/resolve.js";

type RecordValue = Record<string, unknown>;
const allRewards = (): RecordValue[] => GAME_DATA.labors.flatMap((labor) => (labor.rewards as unknown as RecordValue[] | undefined) ?? []);
const reward = (id: string): RecordValue => { const found = allRewards().find((entry) => entry.id === id); if (!found) throw new Error(`Unknown Reward ${id}.`); return found; };
const disabled = (state: GameState, rewardId: string): boolean => state.player.temporaryEffects.some((effect) => typeof effect === "object" && effect !== null && (effect as RecordValue).type === "disabled_reward" && (effect as RecordValue).rewardId === rewardId);
const activeRewards = (state: GameState): RecordValue[] => state.player.ownedRewardIds.filter((id) => !state.player.removedRewardOrComponentIds.includes(id) && !disabled(state, id)).map(reward);
const ability = (state: GameState, id: string, color: "blue" | "gold"): RecordValue & { rewardId: string } => { if(color==="blue"&&id==="ability.bow.blue")return{...(GAME_DATA.components.bow.blue_ability as unknown as RecordValue),type:"modify_pip",rewardId:"component.bow"};if(color==="blue"&&id==="ability.mood.ferocious.blue"&&state.mood.activeMoodId==="mood.ferocious")return{id,type:"set_any",rewardId:"mood.ferocious"};for (const owned of activeRewards(state)) { const found = ((owned[color] as RecordValue[] | undefined) ?? []).find((entry) => entry.id === id); if (found) return { ...found, rewardId: owned.id as string }; } throw new Error(`Ability ${id} is not active.`); };

export function useBlueAbility(state: GameState, abilityId: string, sourceDieId: string, target?: number | string): GameState {
  if (state.game.phase !== "BLUE_ABILITY_WINDOW") throw new Error("Blue abilities are only legal in the blue window.");
  const definition = ability(state, abilityId, "blue");
  const source = state.herculesDice[sourceDieId];
  if (!source || !canPlace(source) || source.face === null) throw new Error("Blue source die is not eligible.");
  if (source.blueUsed) throw new Error("Blue source die has already been used this roll.");
  const next = structuredClone(state);
  if(typeof definition.spirit_cost==="number"){if(typeof next.player.spirit!=="number"||next.player.spirit<definition.spirit_cost)throw new Error("Insufficient Spirit for blue ability.");next.player.spirit=next.player.spirit===definition.spirit_cost?"SKULL":next.player.spirit-definition.spirit_cost;if(next.player.spirit==="SKULL"){next.game.phase="DEFEAT";next.game.result="defeat";return next;}}
  if (definition.type === "temporary_derived_contribution") {
    const id = `${sourceDieId}-D${Object.values(next.round.derivedContributions).filter((entry) => entry.sourceDieId === sourceDieId).length + 1}`;
    next.round.derivedContributions[id] = { id, sourceDieId, face: source.face, allocated: false };
    next.herculesDice[sourceDieId].blueUsed = true;
    return next;
  }
  if(definition.type==="effective_double_value"){next.herculesDice[sourceDieId]={...source,blueUsed:true};next.round.effectiveDoubleDieIds.push(sourceDieId);return next;}
  if (definition.type === "sacrifice_source_set_other_any" || definition.type === "place_source_reroll_any" || definition.type === "reroll_one" || definition.type === "mood_redraw_next_ordered_no_rng") throw new Error(`Ability ${abilityId} requires its dedicated decision/RNG action.`);
  next.herculesDice[sourceDieId] = applyDieAbility(source, definition, typeof target === "number" ? target : undefined);
  return next;
}

export function placeGoldAbility(state: GameState, abilityId: string, dieIds: string[]): GameState {
  if (state.game.phase !== "GOLD_AND_ATTACK_PLACEMENT") throw new Error("Gold placement is only legal during placement.");
  if (state.round.goldPlacements.some((placement) => placement.abilityId === abilityId)) throw new Error("Gold ability is already used this roll.");
  const definition = ability(state, abilityId, "gold");
  const requirement = definition.requirement as Requirement;
  if (new Set(dieIds).size !== dieIds.length) throw new Error("A physical die cannot be placed twice.");
  const values = dieIds.map((id) => { const die = state.herculesDice[id]; if (!die || !canPlace(die) || die.face === null) throw new Error(`Die ${id} is not eligible for gold placement.`); return die.face; });
  if (!satisfies(requirement, values)) throw new Error("Gold placement does not satisfy its requirement.");
  let next = structuredClone(state);
  for (const id of dieIds) next.herculesDice[id] = { ...next.herculesDice[id], locked: true, rollable: false, placement: { kind: "gold", abilityId } };
  next.round.goldPlacements.push({ abilityId, dieIds: [...dieIds] });
  if (typeof definition.effect === "object" && definition.effect !== null) {
    const effect = definition.effect as RecordValue;
    if (typeof effect.block_spirit === "number" && !next.currentLabor?.cannotBlockThisRound) next.round.blockedSpirit += effect.block_spirit;
    else next = applyContentEffect(next, effect, abilityId);
  }
  return next;
}

export function allocateAttack(state: GameState, targetId: string, dieIds: string[], contributionIds: string[] = []): GameState {
  if (state.game.phase !== "GOLD_AND_ATTACK_PLACEMENT" || !state.currentLabor || state.currentLabor.laborDice[targetId]?.status !== "active") throw new Error("Attack allocation is not legal.");
  const definition = attackForLaborDie(state.currentLabor.laborId, targetId);
  if (new Set(dieIds).size !== dieIds.length || new Set(contributionIds).size !== contributionIds.length) throw new Error("Allocation IDs must be unique.");
  const physicalValues = dieIds.flatMap((id) => { const die = state.herculesDice[id]; if (!die || !canPlace(die) || die.face === null) throw new Error(`Die ${id} is not eligible for attack allocation.`); return state.round.effectiveDoubleDieIds.includes(id) ? [die.face,die.face] : [die.face]; });
  const derivedValues = contributionIds.map((id) => { const contribution = state.round.derivedContributions[id]; if (!contribution || contribution.allocated) throw new Error(`Contribution ${id} is not eligible for attack allocation.`); return contribution.face; });
  if (!satisfies(definition.requirement, [...physicalValues, ...derivedValues])) throw new Error("Attack allocation does not satisfy its requirement.");
  const next = structuredClone(state);
  for (const id of dieIds) next.herculesDice[id] = { ...next.herculesDice[id], allocated: true, rollable: false, placement: { kind: "attack", targetId } };
  for (const id of contributionIds) next.round.derivedContributions[id].allocated = true;
  next.round.attackAllocations.push({ targetId: definition.scope === "all_active_targets" ? "__all_active_targets__" : targetId, dieIds: [...dieIds], contributionIds: [...contributionIds], damage: definition.damage });
  return next;
}

export function useCowsA(state: GameState, sourceDieId: string, targetDieId: string, face: number): GameState {
  if (state.game.phase !== "BLUE_ABILITY_WINDOW" || !Number.isInteger(face) || face < 1 || face > 6) throw new Error("Cows A requires a valid blue-window target face.");
  const definition = ability(state, "ability.reward.L05.A.blue", "blue");
  if (definition.type !== "sacrifice_source_set_other_any") throw new Error("Cows A source data is invalid.");
  const source = state.herculesDice[sourceDieId], target = state.herculesDice[targetDieId];
  if (!source || !target || sourceDieId === targetDieId || !canPlace(source) || source.face === null || target.face === null) throw new Error("Cows A requires distinct eligible source and rolled target dice.");
  if (source.blueUsed) throw new Error("Cows A source already used a blue space.");
  const next = structuredClone(state);
  next.herculesDice[sourceDieId] = { ...source, blueUsed: true, spent: true, rollable: false, placement: { kind: "blue", abilityId: definition.id } };
  next.herculesDice[targetDieId] = { ...target, face, history: [...target.history, { type: "cows_a_set_any", sourceDieId }] };
  return next;
}

export function useCowsB(state: GameState, sourceDieId: string, rerollDieIds: string[]): GameState {
  if (state.game.phase !== "BLUE_ABILITY_WINDOW" || rerollDieIds.length === 0) throw new Error("Cows B requires one or more reroll targets in the blue window.");
  const definition = ability(state, "ability.reward.L05.B.blue", "blue");
  if (definition.type !== "place_source_reroll_any") throw new Error("Cows B source data is invalid.");
  const source = state.herculesDice[sourceDieId];
  if (!source || !canPlace(source) || source.face === null || source.blueUsed) throw new Error("Cows B source is not eligible.");
  const marked = structuredClone(state);
  marked.herculesDice[sourceDieId] = { ...source, blueUsed: true, placement: { kind: "blue", abilityId: definition.id } };
  return rerollFromRng(marked, rerollDieIds, "cows_b");
}

export function useRerollOne(state: GameState, abilityId: string, dieId: string): GameState {const definition=ability(state,abilityId,"blue");if(definition.type!=="reroll_one")throw new Error("This ability is not a certified reroll-one effect.");const die=state.herculesDice[dieId];if(!die||!canPlace(die)||die.face===null||die.blueUsed)throw new Error("Reroll target is not eligible.");const marked=structuredClone(state);marked.herculesDice[dieId]={...die,blueUsed:true,placement:{kind:"blue",abilityId}};return rerollFromRng(marked,[dieId]);}

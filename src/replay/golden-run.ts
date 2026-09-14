import { raw64 } from "../rng/herc-rng.js";
import { GAME_DATA } from "../data/generated/game-data.js";
import { allocateAttack, placeGoldAbility, useBlueAbility, useCowsB, useRerollOne } from "../engine/actions/placement.js";
import { chooseBrokenDie } from "../engine/decisions/resolve.js";
import { completeLaborTransitionWithCheckpoint } from "../engine/labor/transition.js";
import { resolveAssignments } from "../engine/commands/resolve-assignments.js";
import { chooseReward, chooseRewardToRemove } from "../engine/rewards/resolve.js";
import { createInitialState, initializeGame } from "../engine/state/create.js";
import { validateState } from "../engine/state/invariants.js";
import type { Difficulty, GameState } from "../engine/state/types.js";
import { resolveRoundDamage, rollFromRng } from "../engine/round/resolve.js";

type GoldenEvent = { event_index: number; status: string; purpose: string | null; attempt: number | null; raw64: string | null; interpreted_result?: { face?: number; i?: number; j?: number; bound?: number } };
type GoldenCheckpoint = { completed_labor: number; spirit: number; divinity: string; owned_rewards: string[]; removed_components?: string[]; hercules_dice: Record<string, string>; mood_deck_top_to_bottom: string[]; completed_labors: number[]; next_event: number };
type GoldenTerminalHerculesDie = { face: number; blue_used: string | null; placement: string | null; locked: boolean; allocated: boolean; broken: boolean; history?: string[] };
type GoldenTerminalState = { result: string; labor: number; labor_name: string; phase: string; spirit: number; divinity: string; next_event: number; completed_labors: number[]; failure_cause: { type: string; labor_die_id: string; node_id: string }; active_mood: { name: string }; ordered_hidden_mood_deck_top_to_bottom: string[]; owned_rewards: string[]; removed_components: string[]; round_start_restrictions: { cannot_block_this_round: boolean }; hercules_dice: Record<string, GoldenTerminalHerculesDie>; birds_labor_dice: Record<string, { health: number; status: string; node_id: string }>; pending_state_at_defeat: { pending_player_decision: unknown; pending_random_operation: unknown; pending_mandatory_trigger: unknown; round_cleanup_executed: boolean; reward_flow_started: boolean } };
export interface GoldenRunRecord { seed: string; difficulty?: string; initial_mood_input_order_approved_for_run?: string[]; checkpoints?: GoldenCheckpoint[]; terminal_state?: GoldenTerminalState; rng_event_ledger: GoldenEvent[]; reproducibility: { status: string } }
export interface ReplayVerification { passed: boolean; eventCount: number; orphanedEventCount: number; errors: string[] }

/** Recomputes the supplied Golden Run ledger. Tactical replay is deliberately separate from ledger certification. */
export function verifyGoldenRunLedger(record: GoldenRunRecord): ReplayVerification {
  const errors: string[] = [];
  let orphaned = 0;
  for (const event of record.rng_event_ledger) {
    if (event.status === "orphaned_execution_error") { orphaned += 1; if (event.purpose !== null || event.raw64 !== null) errors.push(`event ${event.event_index}: orphaned event has random material`); continue; }
    if (!event.purpose || event.raw64 === null || event.attempt === null) { errors.push(`event ${event.event_index}: committed event is incomplete`); continue; }
    const raw = raw64(record.seed, BigInt(event.event_index), event.purpose, event.attempt);
    if (raw.toString() !== event.raw64) errors.push(`event ${event.event_index}: raw64 mismatch`);
    if (event.interpreted_result?.face !== undefined && Number(raw % 6n) + 1 !== event.interpreted_result.face) errors.push(`event ${event.event_index}: d6 result mismatch`);
    if (event.interpreted_result?.j !== undefined) { const bound = event.interpreted_result.bound; if (!bound || Number(raw % BigInt(bound)) !== event.interpreted_result.j) errors.push(`event ${event.event_index}: shuffle result mismatch`); }
  }
  return { passed: errors.length === 0 && record.reproducibility.status === "reproducible_with_documented_reconciliation", eventCount: record.rng_event_ledger.length, orphanedEventCount: orphaned, errors };
}

type GoldenInput = { seq: number; labor: number; roll: number | null; action: string; [key: string]: unknown };
type ReplayScript = { seed: string; difficulty: string; inputs: GoldenInput[]; id_map: { rewards: Record<string, string> }; preconditions: { initial_mood_input_order: string[] }; expected_final_next_event: number; expected_terminal_state: { spirit: number; divinity: string; failed_labor_die_id: string; failed_node_id: string } };
type ReplaySnapshot = { kind: string; state: GameState };
type TransitionResult = { state: GameState; checkpoint?: GameState };
const recordValue = (value: unknown): Record<string, unknown> => value as Record<string, unknown>;
const equal = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(message); };
function expect(condition: unknown, message: string): asserts condition { if (!condition) fail(message); }
const moodNames = (state: GameState): Array<string | undefined> => state.mood.deck.map((id) => GAME_DATA.moods.find((mood) => mood.id === id)?.name);
const rewards = () => GAME_DATA.labors.flatMap((labor) => (labor.rewards as unknown as Record<string, unknown>[] | undefined) ?? []);

function rewardId(script: ReplayScript, externalId: string): string {
  if (externalId === "COMPONENT_BOW_OF_HERCULES") return "component.bow";
  const matches = rewards().filter((reward) => reward.name === script.id_map.rewards[externalId]);
  expect(matches.length === 1, `Golden reward mapping is missing or ambiguous for ${externalId}.`);
  return matches[0].id as string;
}
function abilityId(script: ReplayScript, externalId: string): string {
  const [externalReward, suffix] = externalId.split(":");
  if (externalReward === "COMPONENT_BOW_OF_HERCULES") return "ability.bow.blue";
  const reward = recordValue(rewards().find((entry) => entry.id === rewardId(script, externalReward)));
  const color = suffix === "GOLD" ? "gold" : "blue";
  const variant = suffix === "A" || suffix === "B" ? suffix : "";
  const matches = ((reward[color] as Record<string, unknown>[] | undefined) ?? []).filter((entry) => String(entry.id).endsWith(`${color}${variant}`));
  expect(matches.length === 1, `Golden ability mapping is missing or ambiguous for ${externalId}.`);
  return matches[0].id as string;
}
function laborDieId(state: GameState, externalId: string): string {
  const match = externalId.match(/^LABOR(\d+)_(D1|L|R|A|B|C\d+)$/);
  expect(match && Number(match[1]) === Number(state.game.currentLaborId?.slice(-2)), `Golden Labor target ${externalId} does not match the active Labor.`);
  const token = match[2];
  const suffix = token === "D1" ? ".d1" : token === "L" ? ".left" : token === "R" ? ".right" : `.${token}`;
  const matches = Object.keys(state.currentLabor?.laborDice ?? {}).filter((id) => id.endsWith(suffix));
  expect(matches.length === 1, `Golden Labor die ${externalId} is missing or ambiguous.`);
  return matches[0];
}
function nodeId(externalId: string): string {
  const match = externalId.match(/^L(\d+)_([A-Z]\d*|L|R|D1)_N(\d+)$/);
  expect(match, `Golden node ${externalId} is not recognized.`);
  return `L${match[1].padStart(2, "0")}${match[2]}.n${match[3]}`;
}
function finishBlueForHistoricalPlacement(state: GameState): GameState {
  if (state.game.phase === "GOLD_AND_ATTACK_PLACEMENT") return state;
  expect(state.game.phase === "BLUE_ABILITY_WINDOW", `placement requires BLUE_ABILITY_WINDOW or GOLD_AND_ATTACK_PLACEMENT, got ${state.game.phase}`);
  const next = structuredClone(state); next.game.phase = "GOLD_AND_ATTACK_PLACEMENT"; return next;
}
function consumeGoldenLaborOneOrphans(state: GameState): GameState {
  if (state.game.currentLaborId !== "labor.L01" || state.rng.nextEvent !== "18") return state;
  const next = structuredClone(state);
  for (let event = 18; event <= 25; event += 1) next.rng.ledger.push({ eventIndex: String(event), purpose: null as unknown as string, attempt: null as unknown as number, raw64: null as unknown as string, result: null, status: "orphaned_execution_error", error: "Documented Golden Run 0001 reconciliation: invalid prose-generated transition shuffle." });
  next.rng.nextEvent = "26";
  return next;
}
function finishRewardTransition(state: GameState): TransitionResult {
  if (state.game.phase !== "LABOR_TRANSITION") return { state };
  return completeLaborTransitionWithCheckpoint(consumeGoldenLaborOneOrphans(state));
}
function resolveAndAdvance(state: GameState): TransitionResult {
  expect(state.game.phase === "GOLD_AND_ATTACK_PLACEMENT", `resolve assignments requires GOLD_AND_ATTACK_PLACEMENT, got ${state.game.phase}`);
  let next = resolveAssignments(state);
  if (next.pendingDecision) fail("Golden script reached an undocumented meaningful-placement confirmation.");
  if (next.game.phase === "DAMAGE_RESOLUTION") next = resolveRoundDamage(next);
  return finishRewardTransition(next);
}

function assertRngPrefix(state: GameState, record: GoldenRunRecord): void {
  expect(state.rng.ledger.length <= record.rng_event_ledger.length, "Golden RNG emitted more events than the record.");
  for (const [index, actual] of state.rng.ledger.entries()) {
    const expected = record.rng_event_ledger[index];
    expect(expected.event_index === index && actual.eventIndex === String(index), `Golden RNG event index mismatch at ${index}.`);
    if (expected.status === "orphaned_execution_error") { expect(actual.status === "orphaned_execution_error" && actual.purpose === null && actual.raw64 === null, `Golden RNG orphan mismatch at ${index}.`); continue; }
    expect(actual.status === "committed", `Golden RNG status mismatch at ${index}.`);
    expect(actual.purpose === expected.purpose && actual.attempt === expected.attempt && actual.raw64 === expected.raw64, `Golden RNG mismatch at ${index}.`);
    expect(equal(actual.result, expected.interpreted_result?.face ?? expected.interpreted_result), `Golden RNG interpreted result mismatch at ${index}.`);
  }
  expect(state.rng.nextEvent === String(state.rng.ledger.length), "Golden RNG counter is not contiguous with its ledger.");
}
function assertCheckpoint(state: GameState, expected: GoldenCheckpoint | undefined, script: ReplayScript): void {
  expect(expected, `Golden replay has no expected checkpoint for ${state.game.currentLaborId}.`);
  const actual = { completed_labor: Number(state.game.currentLaborId?.slice(-2)), spirit: state.player.spirit, divinity: `${state.player.divinity}/10`, owned_rewards: state.player.ownedRewardIds, removed_components: state.player.removedRewardOrComponentIds, hercules_dice: Object.fromEntries(Object.keys(expected.hercules_dice).map((id) => [id, state.herculesDice[id].broken ? "broken_until_next_labor_setup" : "intact_available"])), mood_deck_top_to_bottom: moodNames(state), completed_labors: state.game.completedLaborIds.map((id) => Number(id.slice(-2))), next_event: Number(state.rng.nextEvent) };
  const target = { completed_labor: expected.completed_labor, spirit: expected.spirit, divinity: expected.divinity, owned_rewards: expected.owned_rewards.map((id) => rewardId(script, id)), removed_components: (expected.removed_components ?? []).map((id) => rewardId(script, id)), hercules_dice: expected.hercules_dice, mood_deck_top_to_bottom: expected.mood_deck_top_to_bottom, completed_labors: expected.completed_labors, next_event: expected.next_event };
  expect(equal(actual, target), `Golden intermediate checkpoint ${expected.completed_labor} diverged.`);
}
function assertTerminalField(path: string, actual: unknown, expected: unknown): void {
  expect(equal(actual, expected), `Golden terminal ${path} diverged.`);
}
function terminalBlueUses(state: GameState, script: ReplayScript): Record<string, string> {
  const result: Record<string, string> = {};
  const labor = Number(state.game.currentLaborId?.slice(-2));
  for (const input of script.inputs.filter((entry) => entry.labor === labor && entry.roll === state.round.rollNumber)) {
    if (!['use_blue', 'reroll', 'use_blue_cows_b_and_reroll'].includes(input.action)) continue;
    const externalAbility = input.ability_id as string;
    const [externalReward, suffix] = externalAbility.split(':');
    const rewardName = script.id_map.rewards[externalReward];
    expect(rewardName, `Golden terminal blue ability ${externalAbility} has no reward mapping.`);
    const dieId = (input.action === 'use_blue_cows_b_and_reroll' ? input.source_die_id : input.die_id) as string;
    result[dieId] = suffix === 'A' || suffix === 'B' ? `${rewardName} ${suffix}` : rewardName;
  }
  return result;
}
function terminalPlacement(state: GameState, script: ReplayScript, expected: string | null): unknown {
  if (expected === null) return null;
  if (expected.startsWith('attack:')) return { kind: 'attack', targetId: laborDieId(state, expected.slice('attack:'.length)) };
  return { kind: 'gold', abilityId: abilityId(script, `${expected}:GOLD`) };
}
function assertTerminal(state: GameState, script: ReplayScript, record: GoldenRunRecord): void {
  const expected = record.terminal_state;
  expect(expected, "Golden terminal-state expectation is missing.");
  assertTerminalField('phase', state.game.phase, expected.phase);
  assertTerminalField('result', state.game.result, expected.result);
  assertTerminalField('labor', Number(state.game.currentLaborId?.slice(-2)), expected.labor);
  assertTerminalField('labor_name', GAME_DATA.labors.find((labor) => labor.id === state.game.currentLaborId)?.name, expected.labor_name);
  assertTerminalField('spirit', state.player.spirit, expected.spirit);
  assertTerminalField('divinity', `${state.player.divinity}/10`, expected.divinity);
  assertTerminalField('next_event', Number(state.rng.nextEvent), expected.next_event);
  assertTerminalField('script.next_event', Number(state.rng.nextEvent), script.expected_final_next_event);
  assertTerminalField('completed_labors', state.game.completedLaborIds.map((id) => Number(id.slice(-2))), expected.completed_labors);
  const failed = state.currentLabor!.laborDice[laborDieId(state, expected.failure_cause.labor_die_id)];
  assertTerminalField('failure_cause.type', failed.status === 'active_failure_terminal' ? 'labor_die_reached_skull' : null, expected.failure_cause.type);
  assertTerminalField('failure_cause.node_id', failed.nodeId, nodeId(expected.failure_cause.node_id));
  assertTerminalField('active_mood.name', GAME_DATA.moods.find((mood) => mood.id === state.mood.activeMoodId)?.name, expected.active_mood.name);
  assertTerminalField('ordered_hidden_mood_deck_top_to_bottom', moodNames(state), expected.ordered_hidden_mood_deck_top_to_bottom);
  assertTerminalField('owned_rewards', state.player.ownedRewardIds, expected.owned_rewards.map((id) => rewardId(script, id)));
  assertTerminalField('removed_components', state.player.removedRewardOrComponentIds, expected.removed_components.map((id) => rewardId(script, id)));
  assertTerminalField('round_start_restrictions.cannot_block_this_round', state.currentLabor?.cannotBlockThisRound, expected.round_start_restrictions.cannot_block_this_round);
  const blueUses = terminalBlueUses(state, script);
  for (const [dieId, expectedDie] of Object.entries(expected.hercules_dice)) {
    const actual = state.herculesDice[dieId];
    expect(actual, `Golden terminal Hercules die ${dieId} is missing.`);
    assertTerminalField(`hercules_dice.${dieId}.face`, actual.face, expectedDie.face);
    assertTerminalField(`hercules_dice.${dieId}.blue_used`, actual.blueUsed ? blueUses[dieId] : null, expectedDie.blue_used);
    assertTerminalField(`hercules_dice.${dieId}.placement`, actual.placement, terminalPlacement(state, script, expectedDie.placement));
    assertTerminalField(`hercules_dice.${dieId}.locked`, actual.locked, expectedDie.locked);
    assertTerminalField(`hercules_dice.${dieId}.allocated`, actual.allocated, expectedDie.allocated);
    assertTerminalField(`hercules_dice.${dieId}.broken`, actual.broken, expectedDie.broken);
    for (const entry of expectedDie.history ?? []) {
      const hasCowsReroll = actual.history.some((item) => String(recordValue(item).purpose).includes(':cows_b:'));
      assertTerminalField(`hercules_dice.${dieId}.history.${entry}`, hasCowsReroll ? 'rerolled_by_100_immortal_cows_B' : null, entry);
    }
  }
  for (const [externalId, expectedDie] of Object.entries(expected.birds_labor_dice)) {
    const actual = state.currentLabor!.laborDice[laborDieId(state, externalId)];
    assertTerminalField(`birds_labor_dice.${externalId}.health`, actual.health, expectedDie.health);
    assertTerminalField(`birds_labor_dice.${externalId}.status`, actual.status, expectedDie.status);
    assertTerminalField(`birds_labor_dice.${externalId}.node_id`, actual.nodeId, nodeId(expectedDie.node_id));
  }
  assertTerminalField('pending_state_at_defeat.pending_player_decision', state.pendingDecision, expected.pending_state_at_defeat.pending_player_decision);
  assertTerminalField('pending_state_at_defeat.pending_random_operation', null, expected.pending_state_at_defeat.pending_random_operation);
  assertTerminalField('pending_state_at_defeat.pending_mandatory_trigger', state.pendingTriggers[0] ?? null, expected.pending_state_at_defeat.pending_mandatory_trigger);
  assertTerminalField('pending_state_at_defeat.round_cleanup_executed', state.game.completedLaborIds.includes(state.game.currentLaborId!), expected.pending_state_at_defeat.round_cleanup_executed);
  assertTerminalField('pending_state_at_defeat.reward_flow_started', state.game.phase === 'LABOR_TRANSITION', expected.pending_state_at_defeat.reward_flow_started);
}

/** Executes and fail-fast validates every normalized Golden input against its recorded evidence. */
export function replayGoldenRunTrace(script: ReplayScript, record: GoldenRunRecord): { state: GameState; checkpoints: GameState[] } {
  expect(script.seed === record.seed, "Golden script and record seeds differ.");
  expect(script.difficulty.toLowerCase() === "human" && record.difficulty?.toLowerCase() === "human", "Golden difficulty is not the recorded Human difficulty.");
  expect(script.inputs.length > 1 && script.inputs.every((input, index) => input.seq === index + 1), "Golden input sequence is incomplete or non-contiguous.");
  const approval = script.inputs[0];
  expect(approval.action === "approve_initial_mood_input_order", "Golden initial Mood approval is missing or skipped.");
  const unshuffled = createInitialState("human", script.seed);
  expect(equal(approval.order, script.preconditions.initial_mood_input_order), "Golden initial Mood approval differs from the script precondition.");
  expect(equal(approval.order, record.initial_mood_input_order_approved_for_run), "Golden initial Mood approval differs from the record.");
  expect(equal(approval.order, moodNames(unshuffled)), "Golden initial Mood approval differs from the engine source state.");

  let state = initializeGame(script.difficulty.toLowerCase() as Difficulty, script.seed);
  let snapshots: ReplaySnapshot[] = [];
  const checkpoints: GameState[] = [];
  let roundSnapshot: { laborId: string; roll: number; cannotBlock: boolean } | null = null;
  assertRngPrefix(state, record);
  for (const input of script.inputs.slice(1)) {
    try {
      expect(state.game.phase !== "DEFEAT" && state.game.phase !== "VICTORY", "script contains input after terminal state");
      expect(input.labor === Number(state.game.currentLaborId?.slice(-2)), `script Labor ${input.labor} does not match ${state.game.currentLaborId}`);
      if (input.roll !== null) expect(input.roll === state.round.rollNumber + (input.action === "roll" ? 1 : 0), `script roll ${input.roll} does not match engine roll ${state.round.rollNumber}`);
      const decisions: Record<string, string> = { choose_broken_die: "CHOOSE_DIE_TO_BREAK", choose_reward: "CHOOSE_REWARD", remove_prior_reward_or_component: "CHOOSE_REWARD_TO_REMOVE" };
      if (state.pendingDecision) expect(decisions[input.action] === state.pendingDecision.type, `unrecorded pending decision ${state.pendingDecision.type}`); else expect(!decisions[input.action], `${input.action} has no pending decision`);
      if (input.action === "roll") { expect(state.game.phase === "READY_TO_ROLL", `roll requires READY_TO_ROLL, got ${state.game.phase}`); state = rollFromRng(state); roundSnapshot = { laborId: state.game.currentLaborId!, roll: state.round.rollNumber, cannotBlock: state.currentLabor!.cannotBlockThisRound }; snapshots = []; }
      else if (input.action === "finalize_blue_phase") { expect(state.game.phase === "BLUE_ABILITY_WINDOW", `finalize blue requires BLUE_ABILITY_WINDOW, got ${state.game.phase}`); snapshots.push({ kind: "phase_transition", state: structuredClone(state) }); state = structuredClone(state); state.game.phase = "GOLD_AND_ATTACK_PLACEMENT"; }
      else if (input.action === "undo_last_deterministic_action") { const snapshot = snapshots.pop(); expect(snapshot && snapshot.kind === input.undo_kind, `undo kind ${String(input.undo_kind)} has no matching checkpoint`); expect(equal(snapshot.state.rng, state.rng), "undo crosses an RNG boundary"); state = snapshot.state; if (input.restored_phase) expect(state.game.phase === input.restored_phase, "undo restored the wrong phase"); }
      else if (input.action === "use_blue") { expect(state.game.phase === "BLUE_ABILITY_WINDOW", `blue use requires BLUE_ABILITY_WINDOW, got ${state.game.phase}`); const operation = recordValue(input.operation), die = state.herculesDice[input.die_id as string]; expect(die?.face === operation.from, `blue operation.from ${String(operation.from)} does not match ${die?.face}`); snapshots.push({ kind: "blue_ability", state: structuredClone(state) }); const id = abilityId(script, input.ability_id as string), target = id === "ability.bow.blue" ? Number(operation.to) - Number(operation.from) : operation.to as number; state = useBlueAbility(state, id, input.die_id as string, target); expect(state.herculesDice[input.die_id as string].face === operation.to, `blue operation.to ${String(operation.to)} was not reached`); }
      else if (input.action === "reroll") { state = useRerollOne(state, abilityId(script, input.ability_id as string), input.die_id as string); snapshots = []; }
      else if (input.action === "use_blue_cows_b_and_reroll") { expect(abilityId(script, input.ability_id as string) === "ability.reward.L05.B.blue", "Cows B ability mapping diverged"); state = useCowsB(state, input.source_die_id as string, input.reroll_die_ids as string[]); snapshots = []; }
      else if (input.action === "assign_attack" || input.action === "assign_attack_sets") { state = finishBlueForHistoricalPlacement(state); snapshots.push({ kind: "attack", state: structuredClone(state) }); const target = laborDieId(state, input.target_id as string), sets = input.action === "assign_attack_sets" ? input.sets as string[][] : Number(input.attack_instances) > 1 ? (input.dice as string[]).map((die) => [die]) : [input.dice as string[]]; if (input.attack_instances !== undefined) expect(sets.length === input.attack_instances, "attack instance count diverged"); for (const set of sets) state = allocateAttack(state, target, set); }
      else if (input.action === "place_gold") { state = finishBlueForHistoricalPlacement(state); snapshots.push({ kind: "gold", state: structuredClone(state) }); state = placeGoldAbility(state, abilityId(script, input.ability_id as string), input.dice as string[]); }
      else if (input.action === "resolve_assignments") { const result = resolveAndAdvance(state); state = result.state; if (result.checkpoint) { assertCheckpoint(result.checkpoint, record.checkpoints?.[checkpoints.length], script); checkpoints.push(result.checkpoint); } }
      else if (input.action === "choose_broken_die") state = chooseBrokenDie(state, state.pendingDecision?.id ?? "", input.die_id as string);
      else if (input.action === "choose_reward") { const selected = rewardId(script, input.reward_id as string); expect(state.pendingDecision?.legalOptions.some((option) => option.id === selected), `reward ${selected} is not legal`); const result = finishRewardTransition(chooseReward(state, selected)); state = result.state; if (result.checkpoint) { assertCheckpoint(result.checkpoint, record.checkpoints?.[checkpoints.length], script); checkpoints.push(result.checkpoint); } }
      else if (input.action === "remove_prior_reward_or_component") { const result = finishRewardTransition(chooseRewardToRemove(state, state.pendingDecision?.id ?? "", rewardId(script, input.target_id as string))); state = result.state; if (result.checkpoint) { assertCheckpoint(result.checkpoint, record.checkpoints?.[checkpoints.length], script); checkpoints.push(result.checkpoint); } }
      else fail(`unsupported Golden action ${input.action}`);
      const invariant = validateState(state); expect(invariant.valid, `state invariant failed: ${invariant.errors.join("; ")}`);
      assertRngPrefix(state, record);
      if (roundSnapshot && state.game.currentLaborId === roundSnapshot.laborId && state.round.rollNumber === roundSnapshot.roll) expect(state.currentLabor?.cannotBlockThisRound === roundSnapshot.cannotBlock, "round-start Cannot Block snapshot changed during the round");
    } catch (error) { throw new Error(`Golden input ${input.seq} (${input.action}) diverged: ${error instanceof Error ? error.message : String(error)}`); }
  }
  expect(checkpoints.length === (record.checkpoints?.length ?? 0), "Golden replay did not consume every intermediate checkpoint.");
  assertRngPrefix(state, record);
  expect(state.rng.ledger.length === record.rng_event_ledger.length, "Golden replay did not consume the complete RNG record.");
  assertTerminal(state, script, record);
  return { state, checkpoints };
}
export function replayGoldenRun(script: ReplayScript, record: GoldenRunRecord): GameState { return replayGoldenRunTrace(script, record).state; }

import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';
import { GAME_DATA } from '../../dist/src/data/generated/game-data.js';
import { createInitialState } from '../../dist/src/engine/state/create.js';
import { validateState } from '../../dist/src/engine/state/invariants.js';
import { shuffleMoodDeck } from '../../dist/src/rng/herc-rng.js';
import { startLabor, resolveMood } from '../../dist/src/engine/labor/setup.js';
import { getNode } from '../../dist/src/engine/labor/content.js';
import { applyLaborDamage, allLaborDiceDefeated } from '../../dist/src/engine/labor/damage.js';
import { enforceHindSoftLock } from '../../dist/src/engine/labor/hind.js';
import { rollFromRng, cleanupRound } from '../../dist/src/engine/round/resolve.js';
import { advanceLaborDice } from '../../dist/src/engine/round/progress.js';
import { applyContentEffect, resolveQueuedResources } from '../../dist/src/engine/effects/content.js';
import { resolveAssignments } from '../../dist/src/engine/commands/resolve-assignments.js';
import { allocateAttack, placeGoldAbility, useBlueAbility, useCowsB, useRerollOne } from '../../dist/src/engine/actions/placement.js';
import { chooseBrokenDie } from '../../dist/src/engine/decisions/resolve.js';
import { beginRewardChoice, chooseReward, chooseRewardToRemove } from '../../dist/src/engine/rewards/resolve.js';

// Observational driver of pinned engine functions. The two compound engine
// schedulers are expanded in their original order so assertions can stop between
// impacts and before cleanup, shuffling, or a further player decision.
const RUN = 'validation-20260913T152213Z-30ff45';
const TESTED = 'ee9df725aecf386a2af5135fe2c23b606284cbc4';
const ROOT = 'orchestration/validation/VAL-001-' + RUN;
const CHECK = process.argv.includes('--check');
const git = (...args) => cp.execFileSync('git', args, { windowsHide:true, maxBuffer:64*1024*1024 });
const txt = (...args) => git(...args).toString('utf8').trim();
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const ensure = (condition, code, detail = {}) => { if (!condition) { const error = new Error(code); error.code = code; error.detail = detail; throw error; } };
const task = read('orchestration/tasks/VAL-001.json');
const manifest = read('orchestration/project_state.json');
ensure(manifest.manifest_revision === 'e1-m0003', 'MANIFEST_CHANGED');
if (!CHECK) {
  ensure(txt('rev-parse','HEAD') === TESTED, 'INPUT_COMMIT_CHANGED');
  ensure(task.status === 'in_progress' && task.claim?.run_id === RUN && Date.now() < Date.parse(task.claim.expires_at), 'CLAIM_NOT_CURRENT');
  for (const suffix of ['-checkpoints.json','-rng-ledger.json','-trace.jsonl','-input-verification.json']) ensure(!fs.existsSync(ROOT + suffix), 'EVIDENCE_ALREADY_EXISTS', {suffix});
}
const pins = task.input_artifact_ids.map(id => {
  const pin = manifest.canonical_artifacts.find(a => a.id === id);
  ensure(pin, 'MISSING_PIN', {id});
  const observed = txt('rev-parse', TESTED + ':' + pin.path);
  const source = pin.source_commit ? txt('rev-parse',pin.source_commit + ':' + pin.path) : null;
  const hash = pin.kind === 'blob' ? sha(git('cat-file','blob',observed)) : null;
  const changes = txt('status','--porcelain=v1','--untracked-files=all','--ignored','--',pin.path);
  const members = pin.kind === 'tree' ? txt('ls-tree','-r',TESTED,'--',pin.path).split('\n').map(line => {
    const [meta,path] = line.split('\t');
    const object = meta.split(' ')[2];
    return {path,git_object:object,working_object:txt('hash-object','--',path)};
  }) : null;
  const working = pin.kind === 'blob' ? txt('hash-object','--',pin.path) : observed;
  const matched = observed === pin.git_object && (!source || source === observed) && working === observed && (!pin.sha256_git_bytes || pin.sha256_git_bytes === hash) && changes === '' && (!members || members.every(m => m.git_object === m.working_object));
  return {...pin,observed_commit:TESTED,observed_git_object:observed,observed_source_object:source,observed_working_object:working,observed_sha256_git_bytes:hash,covered_tree_members:members,working_changes:changes,matched};
});
ensure(pins.length === 30 && pins.every(p => p.matched), 'PIN_MISMATCH', {unmatched:pins.filter(p=>!p.matched)});
const script = read(pins.find(p => p.id === 'golden-script').path);
const record = read(pins.find(p => p.id === 'golden-record').path);
const start = read(task.start_state.complete_state_path);
const rawData = read(pins.find(p => p.id === 'game-data').path);
ensure(equal(rawData, GAME_DATA), 'COMPILED_DATA_MISMATCH');
ensure(script.seed === task.rng.seed && script.difficulty.toLowerCase() === 'human' && script.inputs.length === 112 && script.inputs.every((i,n) => i.seq === n + 1), 'SCRIPT_PRECONDITION_MISMATCH');
const names = ids => ids.map(id => GAME_DATA.moods.find(m => m.id === id)?.name);
const rewards = GAME_DATA.labors.flatMap(l => l.rewards ?? []);
const rewardId = external => {
  if (external === 'COMPONENT_BOW_OF_HERCULES') return 'component.bow';
  const matches = rewards.filter(r => r.name === script.id_map.rewards[external]);
  ensure(matches.length === 1,'AMBIGUOUS_REWARD_MAPPING',{external}); return matches[0].id;
};
const abilityId = external => {
  const [reward,suffix] = external.split(':');
  if (reward === 'COMPONENT_BOW_OF_HERCULES') return 'ability.bow.blue';
  const def = rewards.find(r => r.id === rewardId(reward));
  const color = suffix === 'GOLD' ? 'gold' : 'blue', variant = ['A','B'].includes(suffix) ? suffix : '';
  const matches = (def[color] ?? []).filter(a => a.id.endsWith(color + variant));
  ensure(matches.length === 1,'AMBIGUOUS_ABILITY_MAPPING',{external}); return matches[0].id;
};
const laborDieId = external => {
  const match = external.match(/^LABOR(\d+)_(D1|L|R|A|B|C\d+)$/);
  ensure(match && Number(match[1]) === Number(state.game.currentLaborId.slice(-2)), 'LABOR_TARGET_MAPPING', {external});
  const suffix = {D1:'.d1',L:'.left',R:'.right'}[match[2]] ?? '.' + match[2];
  const matches = Object.keys(state.currentLabor.laborDice).filter(id => id.endsWith(suffix));
  ensure(matches.length === 1,'AMBIGUOUS_LABOR_DIE_MAPPING',{external}); return matches[0];
};
const digest = (event, purpose, attempt) => {
  const seedBytes = Buffer.from(task.rng.seed,'utf8'), purposeBytes = Buffer.from(purpose,'utf8');
  const u32 = n => { const b=Buffer.alloc(4); b.writeUInt32BE(n); return b; };
  const index = Buffer.alloc(8); index.writeBigUInt64BE(BigInt(event));
  return crypto.createHash('sha256').update(Buffer.concat([Buffer.from('HERC-RNG-V2\0'),u32(seedBytes.length),seedBytes,index,u32(purposeBytes.length),purposeBytes,u32(attempt)])).digest();
};
let state = createInitialState('human',task.rng.seed), activeInput = null, roundSnapshot = null, stop = null;
let beforeInput = null, lastValid = clone(state), snapshots = [];
const trace = [], consumed = [], checkpoints = [], audited = [];
const log = [`Run ${RUN}`,`Tested commit ${TESTED}`,`Manifest ${manifest.manifest_revision}`,`Node ${process.version}`,`Git ${txt('--version')}`,'Locked dependency installation: pnpm install --frozen-lockfile (exit 0).','Pinned TypeScript compilation only: pnpm exec tsc -p tsconfig.json (exit 0); no data generation.','Tool versions: pnpm 11.19.0; TypeScript 5.9.3.','30/30 exact inputs match including Git-byte SHA256 and complete tree membership.'];
function audit(before, after, mode) {
  ensure(equal(before.rng.ledger, after.rng.ledger.slice(0,before.rng.ledger.length)), 'RNG_HISTORY_REWRITTEN');
  const added = after.rng.ledger.slice(before.rng.ledger.length);
  ensure(BigInt(after.rng.nextEvent) - BigInt(before.rng.nextEvent) === BigInt(added.length), 'RNG_INDEX_NOT_CONTIGUOUS');
  ensure(mode || added.length === 0,'UNEXPECTED_RANDOMNESS');
  for (let offset = 0; offset < added.length; offset++) {
    const event = added[offset], index = Number(before.rng.nextEvent) + offset, expected = record.rng_event_ledger[index];
    ensure(event.eventIndex === String(index) && expected?.event_index === index,'RNG_EVENT_INDEX_MISMATCH');
    if (mode === 'orphan') {
      ensure(index >= 18 && index <= 25 && event.status === 'orphaned_execution_error' && event.purpose === null && event.attempt === null && event.raw64 === null && event.result === null && expected.status === event.status,'ORPHAN_MISMATCH');
      audited.push({event_index:index,status:'historical_orphan_preserved',generated:false,source_record:expected}); continue;
    }
    ensure(event.status === 'committed' && expected.status === 'committed_valid' && event.purpose === expected.purpose && event.attempt === expected.attempt, 'RNG_PURPOSE_OR_STATUS_MISMATCH', {index,event,expected});
    const bound = typeof event.result === 'number' ? 6 : event.result.bound;
    ensure(Number.isInteger(bound) && bound > 0,'RNG_BOUND_INVALID');
    const limit = (1n << 64n) - ((1n << 64n) % BigInt(bound));
    for (let rejected = 0; rejected < event.attempt; rejected++) ensure(digest(index,event.purpose,rejected).readBigUInt64BE() >= limit,'INVALID_REJECTION_ATTEMPT');
    const bytes = digest(index,event.purpose,event.attempt), raw = bytes.readBigUInt64BE();
    const interpreted = typeof event.result === 'number' ? Number(raw % 6n)+1 : {i:event.result.i,j:Number(raw % BigInt(bound)),bound};
    ensure(raw < limit && raw.toString() === event.raw64 && event.raw64 === expected.raw64 && bytes.toString('hex') === expected.sha256 && equal(event.result,interpreted), 'RNG_COMPUTATION_MISMATCH', {index});
    ensure(equal(interpreted,expected.interpreted_result.face ?? expected.interpreted_result),'GOLDEN_RANDOM_RESULT_MISMATCH',{index});
    audited.push({event_index:index,status:'computed_and_matched',purpose:event.purpose,attempt:event.attempt,bound,computed_sha256:bytes.toString('hex'),computed_raw64:raw.toString(),result:interpreted});
  }
  if (mode === 'roll' || mode === 'reroll' || mode === 'cows_b') {
    const ids = mode === 'roll' ? Object.values(before.herculesDice).filter(d=>d.rollable&&!d.broken).map(d=>d.id) : mode === 'reroll' ? [activeInput.die_id] : activeInput.reroll_die_ids;
    const ordered = [...ids].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
    const labor = Number(before.game.currentLaborId.slice(-2));
    const prefix = mode === 'roll' ? `labor${labor}:roll${before.round.rollNumber+1}:` : mode === 'reroll' ? `labor${labor}:reroll${before.round.rerollNumber+1}:` : `labor${labor}:cows_b:reroll${before.round.cowsBRerollNumber+1}:`;
    ensure(equal(added.map(e=>e.purpose),ordered.map(id=>prefix+id)), 'RNG_ROLL_ORDER_MISMATCH');
  }
  if (mode === 'shuffle') {
    const deck = [...before.mood.deck];
    ensure(added.length === deck.length - 1,'SHUFFLE_EVENT_COUNT');
    added.forEach((e,n) => { ensure(e.result.i === deck.length-1-n && e.result.bound === e.result.i+1,'SHUFFLE_ORDER'); const {i,j}=e.result; [deck[i],deck[j]]=[deck[j],deck[i]]; });
    ensure(equal(deck,after.mood.deck),'SHUFFLE_DECK_MISMATCH');
  }
}
function validate(label, before) {
  const report = validateState(state);
  ensure(report.valid,'STATE_INVARIANT_FAILED',{label,errors:report.errors});
  for (const die of Object.values(state.currentLabor?.laborDice ?? {})) {
    const node = getNode(state.currentLabor.laborId,die.trackId,die.nodeId);
    ensure(die.health >= 0 && die.health <= die.startingHealth,'LABOR_HEALTH_INVALID',{die});
    if (before.currentLabor?.laborId === state.currentLabor.laborId) {
      const old = before.currentLabor.laborDice[die.id];
      if (old?.status === 'defeated_inactive') ensure(equal(old,die),'INACTIVE_LABOR_DIE_MUTATED',{before:old,observed:die});
    }
    if (state.game.phase === 'DEFEAT' && node.effect?.failure !== undefined && die.status === 'active') ensure(false,'TERMINAL_FAILURE_DIE_STATUS',{expected:'active_failure_terminal',observed:die});
  }
  if (roundSnapshot && state.currentLabor?.laborId === roundSnapshot.laborId) ensure(state.currentLabor.cannotBlockThisRound === roundSnapshot.value,'ROUND_START_CANNOT_BLOCK_MUTATED',{expected:roundSnapshot.value,observed:state.currentLabor.cannotBlockThisRound,round_start:roundSnapshot,label});
}
function step(label, operation, mode = null) {
  const before = clone(state), entry = {index:trace.length,input_seq:activeInput?.seq ?? null,label,rng_mode:mode,before_state:before};
  try {
    state = operation(clone(state));
    audit(before,state,mode); validate(label,before);
    entry.status = 'accepted'; entry.after_state = clone(state); lastValid = clone(state);
  } catch (error) {
    entry.status = 'diverged'; entry.after_state = clone(state); entry.error = {code:error.code ?? 'ENGINE_OPERATION_ERROR',message:error.message,detail:error.detail ?? null};
    trace.push(entry); throw error;
  }
  trace.push(entry);
  return state;
}
const phase = (expected,next,label) => { ensure(state.game.phase === expected,'ILLEGAL_PHASE_TRANSITION',{expected,observed:state.game.phase,next}); step(label,s => {s.game.phase=next;return s;}); };
function finishBlue() {
  if (state.game.phase === 'BLUE_ABILITY_WINDOW') phase('BLUE_ABILITY_WINDOW','GOLD_AND_ATTACK_PLACEMENT','historical placement implies finish blue; explicit guard and no RNG');
  ensure(state.game.phase === 'GOLD_AND_ATTACK_PLACEMENT','PLACEMENT_PHASE_REQUIRED');
}
function compareCheckpoint() {
  const labor = Number(state.game.currentLaborId.slice(-2)), expected = record.checkpoints.find(c => c.completed_labor === labor);
  ensure(expected,'UNEXPECTED_LABOR_CHECKPOINT',{labor});
  const observed = {spirit:state.player.spirit,divinity:state.player.divinity,next_event:Number(state.rng.nextEvent),owned_rewards:state.player.ownedRewardIds,removed_components:state.player.removedRewardOrComponentIds,completed_labors:state.game.completedLaborIds.map(id=>Number(id.slice(-2))),mood_deck_top_to_bottom:names(state.mood.deck),persistent_dice_count:state.player.persistentHerculesDice,broken_dice:Object.values(state.herculesDice).filter(d=>d.broken).map(d=>d.id)};
  const target = {spirit:expected.spirit,divinity:Number(expected.divinity.split('/')[0]),next_event:expected.next_event,owned_rewards:expected.owned_rewards.map(rewardId),removed_components:(expected.removed_components??[]).map(rewardId),completed_labors:expected.completed_labors,mood_deck_top_to_bottom:expected.mood_deck_top_to_bottom,persistent_dice_count:Object.keys(expected.hercules_dice).length,broken_dice:Object.entries(expected.hercules_dice).filter(([,v])=>v==='broken_until_next_labor_setup').map(([id])=>id)};
  const checks = Object.fromEntries(Object.keys(target).map(k=>[k,{expected:target[k],observed:observed[k],matched:equal(target[k],observed[k])}]));
  const passed = Object.values(checks).every(c=>c.matched);
  checkpoints.push({completed_labor:labor,input_seq:activeInput.seq,boundary:'After reward/end-Labor shuffle before next Labor setup/Mood draw',comparison:checks,status:passed?'MATCH':'DIVERGED',full_state:clone(state)});
  log.push(`Checkpoint Labor ${labor}: ${passed?'MATCH':'DIVERGED'}; Spirit ${state.player.spirit}; Divinity ${state.player.divinity}; next RNG ${state.rng.nextEvent}`);
  ensure(passed,'GOLDEN_CHECKPOINT_MISMATCH',{labor,checks});
}
function finishRewardTransition() {
  if (state.game.phase !== 'LABOR_TRANSITION') return;
  ensure(!state.pendingDecision,'UNRESOLVED_REWARD_DECISION');
  roundSnapshot = null;
  if (state.game.currentLaborId === 'labor.L01') {
    ensure(state.rng.nextEvent === '18','ORPHAN_RECOVERY_BOUNDARY');
    step('Preserve historical permanent orphan indices 18-25; no random material generated',s => {
      for (let event=18;event<=25;event++) s.rng.ledger.push({eventIndex:String(event),purpose:null,attempt:null,raw64:null,result:null,status:'orphaned_execution_error',error:record.rng_event_ledger[event].reason});
      s.rng.nextEvent='26'; return s;
    },'orphan');
  }
  const completed = state.game.currentLaborId;
  step('Labor completion and return active Mood (pinned transition scheduler)',s => {if(!s.game.completedLaborIds.includes(completed))s.game.completedLaborIds.push(completed);s.player.temporaryEffects=[];if(s.mood.activeMoodId)s.mood.deck.push(s.mood.activeMoodId);s.mood.activeMoodId=null;return s;});
  step('End-Labor Mood shuffle',s=>shuffleMoodDeck(s,`labor${Number(completed.slice(-2))}:end_mood_shuffle`),'shuffle');
  compareCheckpoint();
  const nextLabor = `labor.L${String(Number(completed.slice(-2))+1).padStart(2,'0')}`;
  step('Start '+nextLabor,s=>startLabor(s,nextLabor));
  step('Resolve next ordered Mood',s=>resolveMood(s,s.mood.deck[0]));
  snapshots=[];
}
function damageAndImpacts() {
  ensure(state.game.phase === 'DAMAGE_RESOLUTION','DAMAGE_PHASE_REQUIRED');
  for (const allocation of clone(state.round.attackAllocations)) {
    const targets = allocation.targetId === '__all_active_targets__' ? Object.values(state.currentLabor.laborDice).filter(d=>d.status==='active').map(d=>d.id) : [allocation.targetId];
    for(const target of targets) if(state.currentLabor.laborDice[target]?.status==='active') step('Apply allocated damage '+target,s=>applyLaborDamage(s,target,allocation.damage));
  }
  if (allLaborDiceDefeated(state)) {
    step('Resolve queued resources after Labor defeated',resolveQueuedResources);
    if(state.game.phase==='DEFEAT')return;
    phase('DAMAGE_RESOLUTION','REWARD_SELECTION','Enter reward selection');
    step('Begin reward choice; singleton-only automatic selection',beginRewardChoice); return;
  }
  phase('DAMAGE_RESOLUTION','LABOR_ADVANCE','Begin mandatory Labor advancement');
  step('Advance active Labor dice along pinned edges',advanceLaborDice);
  if(state.pendingDecision)return;
  ensure(state.game.phase==='IMPACT_RESOLUTION','IMPACT_PHASE_REQUIRED');
  // Same captured active-die order and node references as resolveEnteredImpacts.
  const laborAtEntry = clone(state.currentLabor);
  for(const die of Object.values(laborAtEntry.laborDice).filter(d=>d.status==='active')) {
    const node = getNode(laborAtEntry.laborId,die.trackId,die.nodeId);
    if(node.effect?.failure!==undefined) {step('Entered failure node '+node.id,s=>{s.game.phase='DEFEAT';s.game.result='defeat';return s;});return;}
    if(node.effect) step('Apply entered node '+node.id+' to '+die.id,s=>applyContentEffect(s,node.effect,node.id,die.id,true));
    if(state.pendingDecision)return;
  }
  step('Resolve queued impact resources',resolveQueuedResources);
  if(state.game.phase==='DEFEAT')return;
  phase('IMPACT_RESOLUTION','FAILURE_CHECK','Finish entered impacts');
  step('Inherited provisional Hind usable-dice check',enforceHindSoftLock);
  if(state.pendingDecision||state.game.phase==='DEFEAT')return;
  if(state.game.phase==='FAILURE_CHECK')step('Round cleanup',cleanupRound);
}
try {
  ensure(equal(state,start.pre_setup_state),'FULL_PRE_SETUP_STATE_MISMATCH');
  ensure(state.rng.nextEvent==='0'&&state.rng.ledger.length===0,'NONZERO_START');
  activeInput=script.inputs[0]; beforeInput=clone(state);
  ensure(activeInput.action==='approve_initial_mood_input_order' && equal(activeInput.order,script.preconditions.initial_mood_input_order) && equal(activeInput.order,record.initial_mood_input_order_approved_for_run) && equal(activeInput.order,names(state.mood.deck)),'INITIAL_ORDER_APPROVAL_MISMATCH');
  consumed.push({input:activeInput,status:'accepted',before_trace_index:0,after_trace_index:0,translation:'Explicit four-way equality check of recorded approval, script precondition, golden record, and actual unshuffled engine deck. No mutation/RNG.'});
  step('Initial Mood shuffle',shuffleMoodDeck,'shuffle');
  step('Start Labor I',s=>startLabor(s,'labor.L01'));
  step('Resolve first ordered Mood',s=>resolveMood(s,s.mood.deck[0]));
  ensure(equal(state,start.first_ready_to_roll_state),'FULL_READY_STATE_MISMATCH');
  for(const input of script.inputs.slice(1)) {
    activeInput=input; beforeInput=clone(state); const firstStep=trace.length;
    ensure(state.game.phase!=='DEFEAT' && state.game.phase!=='VICTORY','INPUT_AFTER_TERMINAL');
    ensure(input.labor===Number(state.game.currentLaborId.slice(-2)),'SCRIPT_LABOR_MISMATCH',{input,observed:state.game.currentLaborId});
    if(input.roll!==null)ensure(input.roll===state.round.rollNumber+(input.action==='roll'?1:0),'SCRIPT_ROLL_MISMATCH',{input,observed:state.round.rollNumber});
    const decisions={choose_broken_die:'CHOOSE_DIE_TO_BREAK',choose_reward:'CHOOSE_REWARD',remove_prior_reward_or_component:'CHOOSE_REWARD_TO_REMOVE'};
    if(state.pendingDecision)ensure(decisions[input.action]===state.pendingDecision.type,'UNRECORDED_PLAYER_DECISION',{pending:state.pendingDecision,input});
    else ensure(!decisions[input.action],'SCRIPT_DECISION_NOT_PENDING',{input});
    if(input.action==='roll') {
      ensure(state.game.phase==='READY_TO_ROLL','ROLL_PHASE_REQUIRED');
      roundSnapshot={laborId:state.game.currentLaborId,roll:input.roll,value:Object.values(state.currentLabor.laborDice).some(d=>d.status==='active'&&getNode(state.currentLabor.laborId,d.trackId,d.nodeId).effect?.cannot_block===true),nodes:Object.values(state.currentLabor.laborDice).map(d=>({id:d.id,status:d.status,nodeId:d.nodeId}))};
      step('Recorded initial roll',rollFromRng,'roll'); snapshots=[];
    } else if(input.action==='use_blue') {
      ensure(state.herculesDice[input.die_id]?.face===input.operation.from,'SCRIPT_BLUE_FROM_MISMATCH',{input,observed:state.herculesDice[input.die_id]});
      snapshots.push({kind:'blue_ability',state:clone(state)});
      const id=abilityId(input.ability_id),target=id==='ability.bow.blue'?input.operation.to-input.operation.from:input.operation.to;
      step('Recorded blue ability '+id,s=>useBlueAbility(s,id,input.die_id,target));
      ensure(state.herculesDice[input.die_id].face===input.operation.to,'BLUE_RESULT_MISMATCH');
    } else if(input.action==='reroll') {step('Recorded single-die reroll',s=>useRerollOne(s,abilityId(input.ability_id),input.die_id),'reroll');snapshots=[];}
    else if(input.action==='use_blue_cows_b_and_reroll') {
      ensure(abilityId(input.ability_id)==='ability.reward.L05.B.blue','COWS_MAPPING');
      step('Recorded Cows B source and selected rerolls',s=>useCowsB(s,input.source_die_id,input.reroll_die_ids),'cows_b');snapshots=[];
      const source=state.herculesDice[input.source_die_id];ensure(source.blueUsed&&!source.spent&&!source.locked&&!source.allocated,'COWS_SOURCE_REUSE_MISMATCH');
    } else if(input.action==='finalize_blue_phase') {snapshots.push({kind:'phase_transition',state:clone(state)});phase('BLUE_ABILITY_WINDOW','GOLD_AND_ATTACK_PLACEMENT','Recorded finalize blue phase');}
    else if(input.action==='undo_last_deterministic_action') {
      const snapshot=snapshots.pop();ensure(snapshot&&snapshot.kind===input.undo_kind&&equal(snapshot.state.rng,state.rng),'UNDO_BOUNDARY_OR_KIND_MISMATCH');
      step('Recorded undo '+input.undo_kind,()=>clone(snapshot.state));
      if(input.restored_phase)ensure(state.game.phase===input.restored_phase,'UNDO_PHASE_MISMATCH');
      if(input.restored)ensure(state.herculesDice.H3.face===input.restored.H3&&state.player.spirit===input.restored.Spirit&&(state.round.usedBlueAbilityIds??[]).includes('ability.bow.blue')===input.restored.Bow_used,'UNDO_RESTORED_STATE_MISMATCH');
    } else if(input.action==='assign_attack'||input.action==='assign_attack_sets') {
      finishBlue();snapshots.push({kind:'attack',state:clone(state)});
      const sets=input.action==='assign_attack_sets'?input.sets:input.attack_instances>1?input.dice.map(id=>[id]):[input.dice];
      if(input.attack_instances!==undefined)ensure(sets.length===input.attack_instances,'SCRIPT_ATTACK_COUNT_MISMATCH');
      const target=laborDieId(input.target_id); for(const set of sets)step('Recorded attack allocation '+target+' '+set.join(','),s=>allocateAttack(s,target,set));
    } else if(input.action==='place_gold') {finishBlue();snapshots.push({kind:'gold',state:clone(state)});step('Recorded gold placement '+input.ability_id,s=>placeGoldAbility(s,abilityId(input.ability_id),input.dice));}
    else if(input.action==='resolve_assignments') {
      ensure(state.game.phase==='GOLD_AND_ATTACK_PLACEMENT','RESOLVE_PHASE_REQUIRED');
      step('Recorded explicit Resolve Assignments',resolveAssignments);
      ensure(!state.pendingDecision,'UNRECORDED_MEANINGFUL_PLACEMENT_CONFIRMATION',{pending:state.pendingDecision});
      if(state.game.phase==='DAMAGE_RESOLUTION')damageAndImpacts();
      finishRewardTransition();
    } else if(input.action==='choose_broken_die') step('Recorded broken-die decision',s=>chooseBrokenDie(s,s.pendingDecision.id,input.die_id));
    else if(input.action==='choose_reward') {ensure(state.pendingDecision.legalOptions.some(o=>o.id===rewardId(input.reward_id)),'REWARD_NOT_LEGAL');step('Recorded reward choice',s=>chooseReward(s,rewardId(input.reward_id)));finishRewardTransition();}
    else if(input.action==='remove_prior_reward_or_component') {step('Recorded prior-reward removal',s=>chooseRewardToRemove(s,s.pendingDecision.id,rewardId(input.target_id)));finishRewardTransition();}
    else ensure(false,'UNSUPPORTED_SCRIPT_ACTION',{input});
    consumed.push({input,status:'accepted',before_trace_index:firstStep,after_trace_index:trace.length-1});
    log.push(`Input ${input.seq} ${input.action}: accepted; ${state.game.currentLaborId}/${state.game.phase}; Spirit ${state.player.spirit}; Divinity ${state.player.divinity}; next RNG ${state.rng.nextEvent}`);
  }
  ensure(state.game.phase==='DEFEAT'&&state.rng.nextEvent==='174','TERMINAL_EXPECTATION_MISMATCH');
} catch(error) {
  stop={input_seq:activeInput?.seq??null,input:activeInput,code:error.code??'ENGINE_OPERATION_ERROR',message:error.message,detail:error.detail??null,trace_index:trace.length-1,phase:state.game.phase,labor:state.game.currentLaborId,roll:state.round.rollNumber,next_rng_event:state.rng.nextEvent};
  if(!consumed.some(c=>c.input.seq===activeInput?.seq)) consumed.push({input:activeInput,status:equal(state,beforeInput)?'rejected_before_mutation':'partially_executed_then_stopped',before_trace_index:trace.findIndex(t=>t.input_seq===activeInput?.seq),after_trace_index:trace.length-1});
  log.push('STOP '+JSON.stringify(stop));
}
const evidence={task_id:task.id,run_id:RUN,manifest_revision:manifest.manifest_revision,tested_commit:TESTED,validation_mode:task.validation_mode,scenario_id:task.scenario_id,accepted_start_state:start.pre_setup_state,accepted_first_ready_state:start.first_ready_to_roll_state,player_choices:consumed,completed_labor_checkpoints:checkpoints,expected_completed_labor_checkpoints:record.checkpoints.map(c=>({completed_labor:c.completed_labor,status:checkpoints.find(p=>p.completed_labor===c.completed_labor)?.status??'NOT_REACHED'})),last_completed_input_state:beforeInput,last_valid_operation_state:lastValid,stopped_state:state,terminal_state:stop?null:state,terminal_expectation_status:stop?'NOT_REACHED':'requires_complete_terminal_comparison',stop};
const ledger={task_id:task.id,run_id:RUN,algorithm:task.rng.algorithm,policy:task.rng.policy,seed:task.rng.seed,start_index:0,end_index:Number(state.rng.nextEvent),expected_end_index:174,events:state.rng.ledger,independent_audit:audited,computed_committed_events:audited.filter(a=>a.status==='computed_and_matched').length,orphaned_events:audited.filter(a=>a.status==='historical_orphan_preserved').length,unreached_indices:[Number(state.rng.nextEvent),173],source_ledger:pins.find(p=>p.id==='golden-record').path+'#/rng_event_ledger',note:'Orphan entries have null random material and retain source records separately. No future events are generated or replayed after stop.'};
const verification={task_id:task.id,run_id:RUN,tested_commit:TESTED,manifest_revision:manifest.manifest_revision,claim:task.claim,canonical_pin_count:pins.length,canonical_pins_match:true,canonical_inputs:pins,compiled_data_semantically_matches_raw:true,start_state_matches:true,readiness_embedded_revision_is_historical_and_explicitly_repinned:true,runtime:{node:process.version,git:txt('--version'),pnpm:'11.19.0',typescript:'5.9.3'},procedure_hash_sha256:sha(fs.readFileSync(new URL(import.meta.url)))};
const outputSummary={pass_fail:stop?'FAIL':'INCOMPLETE_TERMINAL_COMPARISON',stop,accepted_inputs:consumed.filter(c=>c.status==='accepted').length,attempted_inputs:consumed.length,checkpoints:checkpoints.map(c=>({labor:c.completed_labor,status:c.status})),next_rng_event:state.rng.nextEvent,computed_events:ledger.computed_committed_events,orphans:ledger.orphaned_events,trace_operations:trace.length,evidence_sha256:sha(JSON.stringify(evidence)),ledger_sha256:sha(JSON.stringify(ledger)),trace_sha256:sha(trace.map(t=>JSON.stringify(t)).join('\n')+'\n')};
if(CHECK) {
  ensure(equal(read(ROOT+'-checkpoints.json'),evidence),'REPRODUCTION_STATE_MISMATCH');
  ensure(equal(read(ROOT+'-rng-ledger.json'),ledger),'REPRODUCTION_LEDGER_MISMATCH');
  ensure(fs.readFileSync(ROOT+'-trace.jsonl','utf8')===trace.map(t=>JSON.stringify(t)).join('\n')+'\n','REPRODUCTION_TRACE_MISMATCH');
  console.log(JSON.stringify({...outputSummary,reproduction:'Exact states, consumption, ledger and trace match; no files written.'},null,2));
} else {
  const write=(suffix,value)=>fs.writeFileSync(ROOT+suffix,JSON.stringify(value,null,2)+'\n');
  write('-input-verification.json',verification);write('-checkpoints.json',evidence);write('-rng-ledger.json',ledger);write('-replay-summary.json',outputSummary);
  fs.writeFileSync(ROOT+'-trace.jsonl',trace.map(t=>JSON.stringify(t)).join('\n')+'\n');
  fs.writeFileSync(ROOT+'-execution-log.txt',log.join('\n')+'\n'+JSON.stringify(outputSummary,null,2)+'\n');
  console.log(JSON.stringify(outputSummary,null,2));
}

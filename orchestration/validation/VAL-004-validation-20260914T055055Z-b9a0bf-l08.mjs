import { verifyPins } from './VAL-004-validation-20260914T055055Z-b9a0bf-common.mjs';
import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';
import { GAME_DATA } from '../../dist/src/data/generated/game-data.js';
import { allocateAttack } from '../../dist/src/engine/actions/placement.js';
import { resolveAssignments } from '../../dist/src/engine/commands/resolve-assignments.js';
import { applyLaborDamage } from '../../dist/src/engine/labor/damage.js';
import { getTracks } from '../../dist/src/engine/labor/content.js';
import { advanceLaborDice } from '../../dist/src/engine/round/progress.js';
import { applyContentEffect, resolveQueuedResources } from '../../dist/src/engine/effects/content.js';
import { cleanupRound } from '../../dist/src/engine/round/resolve.js';
import { validateState } from '../../dist/src/engine/state/invariants.js';
const RUN='validation-20260914T055055Z-b9a0bf', COMMIT='18440b2637c94807213483a73664d8a2a0f3f366';
const STEM='orchestration/validation/VAL-004-'+RUN+'-l08', CHECK=process.argv.includes('--check');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...a)=>cp.execFileSync('git',a,{windowsHide:true,maxBuffer:64*1024*1024});
const txt=(...a)=>git(...a).toString('utf8').trim();
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const clone=v=>structuredClone(v);
function requireThat(ok,code,detail=null){if(!ok){const error=new Error(code);error.code=code;error.detail=detail;throw error;}}
const manifest=read('orchestration/project_state.json'),task={...read('orchestration/tasks/VAL-004.json'),scenario_id:'HERC-ORCH-E1-L08'};
requireThat(manifest.manifest_revision==='e1-m0007'&&task.manifest_revision===manifest.manifest_revision,'MANIFEST_CHANGED');
if(!CHECK){
 requireThat(task.status==='in_progress'&&task.claim?.run_id===RUN&&Date.now()<Date.parse(task.claim.expires_at),'CLAIM_NOT_CURRENT');
 requireThat(txt('rev-parse','HEAD')===COMMIT,'INPUT_COMMIT_CHANGED');
 for(const suffix of ['-input-verification.json','-checkpoints.json','-rng-ledger.json'])requireThat(!fs.existsSync(STEM+suffix),'EVIDENCE_EXISTS',suffix);
}
const pins=verifyPins();
requireThat(read('orchestration/validation/VAL-004-validation-20260914T055055Z-b9a0bf-residuals.json').pass_fail==='PASS','PRIOR_RESIDUAL_STOP');
const scenarioPath=pins.find(p=>p.id==='l08-scenario').path,scenario=read(scenarioPath);
const fixtures=read(pins.find(p=>p.id==='test-fixtures').path),raw=read(pins.find(p=>p.id==='game-data').path);
const f046=fixtures.fixtures.find(f=>f.id==='F046'),context=fixtures.regression_contexts['RS-002-L08'];
requireThat(equal(raw,GAME_DATA),'RAW_COMPILED_DATA_MISMATCH');
requireThat(equal(scenario.start_state,context.start_state),'PINNED_START_STATES_DIFFER');
requireThat(read('orchestration/tasks/VAL-001.json').status==='accepted_fail','PM_ACCEPTANCE_MISSING');
requireThat(scenario.actions.length===2&&scenario.actions[0].command==='ASSIGN_ATTACK'&&scenario.actions[1].command==='RESOLVE_ASSIGNMENTS','SCRIPT_INCOMPLETE');
requireThat(scenario.actions[0].target_id===f046.actions[0].target_id&&equal(scenario.actions[0].physical_die_ids,f046.actions[0].physical_die_ids),'APPROVED_ACTIONS_DIFFER');
const labor=raw.labors.find(l=>l.id==='labor.L08');
const contractChecks={};
function contract(name,ok){contractChecks[name]=ok;requireThat(ok,'CANONICAL_CONTRACT_MISMATCH',name);}
contract('content_revision',raw.content_revision==='RS-002.1');
contract('shared_fixed_requirement',equal(labor.attack.requirement,{type:'fixed_straight',values:[1,2,3]})&&labor.attack.requirement_scope==='shared_by_listed_targets');
contract('single_selected_damage',labor.attack.scope==='target'&&labor.attack.damage_scope==='single_selected_target'&&labor.attack.damage===1&&equal(labor.attack.eligible_target_ids,['labor.L08.A','labor.L08.B'])&&equal(labor.attack.target_selection,{owner:'player',count:1,timing:'attack_allocation',allowed_statuses:['active']}));
const healAnnotations=[];
for(const l of raw.labors)for(const [trackId,track] of Object.entries(l.tracks??{}))for(const node of Object.values(track.nodes))if(typeof node.effect?.heal==='number')healAnnotations.push({labor_id:l.id,track_id:trackId,node_id:node.id,amount:node.effect.heal,scope:node.effect.heal_scope,cap:node.effect.heal_cap});
contract('all_46_numeric_healing_nodes_annotated',healAnnotations.length===46&&healAnnotations.every(h=>h.scope==='source_labor_die'&&h.cap==='source_start_health'));
const tracks=getTracks('labor.L08');
for(const [trackId,expectedGraph] of Object.entries(scenario.track_graphs))for(const [nodeId,expected] of Object.entries(expectedGraph)){
 const node=tracks[trackId].nodes[nodeId];
 const effect=clone(node.effect);if(effect){delete effect.heal_scope;delete effect.heal_cap;}
 contract('graph_'+nodeId,equal(node.next,expected.next)&&equal(effect,expected.effect));
}
contract('expected_damage_boundary',equal(f046.expected.after_damage.health,{'labor.L08.A':5,'labor.L08.B':6}));
contract('expected_round_boundary',equal(f046.expected.after_round.health,{'labor.L08.A':5,'labor.L08.B':6})&&f046.expected.after_round.spirit===7&&f046.expected.after_round.phase==='READY_TO_ROLL');
const initial=clone(scenario.start_state);
requireThat(validateState(initial).valid,'INVALID_CONSTRUCTED_STATE');
requireThat(scenario.rng.mode==='zero_rng_boundary'&&scenario.rng.fixed_faces_are_random_outcomes===false&&initial.rng.nextEvent==='0'&&equal(initial.rng.ledger,[])&&initial.rng.seed===scenario.rng.seed&&initial.rng.algorithm===scenario.rng.algorithm&&initial.rng.policyVersion===scenario.rng.policy,'RNG_PRECONDITION_MISMATCH');
requireThat(scenario.rng.expected_end_index===0&&equal(scenario.rng.orphaned_ranges,[]),'ZERO_RNG_BOUNDARY_INCOMPLETE');
requireThat(equal(scenario.actions[0].physical_die_ids.map(id=>initial.herculesDice[id].face),scenario.actions[0].physical_faces),'FIXED_FACE_MISMATCH');
requireThat(initial.game.phase==='GOLD_AND_ATTACK_PLACEMENT'&&initial.pendingDecision===null&&initial.currentLabor.cannotBlockThisRound===false&&initial.player.ownedRewardIds.length===0,'CONSTRUCTED_PHASE_MISMATCH');
const binding={task_scenario_id:task.scenario_id,pinned_scenario_id:scenario.scenario_id,start_state:scenarioPath+'#/start_state',rng:scenarioPath+'#/rng',actions:scenarioPath+'#/actions',expectations:['src/data/raw/TEST_FIXTURES_v4.json#/fixtures/'+fixtures.fixtures.findIndex(f=>f.id==='F046'),scenarioPath+'#/proposed_expected_transitions'],basis:'PM release e1-m0007 explicitly selects this exact scenario path and corrected canon. Null task summary fields are not used as inputs; complete values are read from the uniquely pinned scenario. Its embedded e1-m0001/BLOCKED and old input list remain historical provenance; current manifest pins and corrected F046 govern this run.',pm_acceptance_task_git_object:txt('rev-parse',COMMIT+':orchestration/tasks/VAL-001.json')};
const verification={task_id:task.id,run_id:RUN,manifest_revision:manifest.manifest_revision,tested_commit:COMMIT,claim:task.claim,canonical_pin_count:pins.length,canonical_pins_match:true,canonical_inputs:pins,bindings:binding,contract_checks:contractChecks,healing_annotations:healAnnotations,raw_compiled_data_equal:true,full_pinned_start_states_equal:true,tool_versions:{node:process.version,git:txt('--version'),pnpm:'11.19.0',typescript:'5.9.3'},procedure_sha256:sha(fs.readFileSync(new URL(import.meta.url)))};
function differences(expected,observed,path=''){
 if(equal(expected,observed))return [];
 if(expected&&observed&&typeof expected==='object'&&typeof observed==='object')return [...new Set([...Object.keys(expected),...Object.keys(observed)])].flatMap(k=>differences(expected[k],observed[k],path+'/'+k));
 return [{path,expected:expected??null,observed:observed??null}];
}
let state=clone(initial),lastValid=clone(initial),stop=null,activeAction=null;
const operations=[],actions=[],comparisons=[];
function step(label,execute,predict){
 const before=clone(state),expected=predict(clone(state));
 const entry={index:operations.length,action_seq:activeAction.seq,label,before_state:before,expected_state:expected};
 try{
  state=execute(clone(state));entry.observed_state=clone(state);
  requireThat(equal(state.rng,initial.rng),'UNEXPECTED_RNG_CHANGE');
  requireThat(equal(state.mood,initial.mood),'HIDDEN_MOOD_CHANGED');
  requireThat(state.pendingDecision===null&&state.pendingTriggers.length===0,'UNRECORDED_PENDING_DECISION');
  requireThat(validateState(state).valid,'STATE_INVARIANT_FAILED',validateState(state).errors);
  const diff=differences(expected,state);entry.differences=diff;
  requireThat(diff.length===0,'CANONICAL_STATE_DIVERGENCE',diff);
  entry.status='MATCH';lastValid=clone(state);operations.push(entry);
 }catch(error){entry.status='DIVERGED';entry.observed_state=clone(state);entry.error={code:error.code??'ENGINE_OPERATION_ERROR',message:error.message,detail:error.detail??null};operations.push(entry);throw error;}
}
function checkpoint(boundary){comparisons.push({boundary,status:'MATCH',operation_index:operations.length-1,full_state:clone(state)});}
try{
 activeAction=scenario.actions[0];
 step('Recorded ASSIGN_ATTACK to A with H1/H2/H3',s=>allocateAttack(s,activeAction.target_id,activeAction.physical_die_ids),s=>{
  for(const id of activeAction.physical_die_ids){s.herculesDice[id].allocated=true;s.herculesDice[id].rollable=false;s.herculesDice[id].placement={kind:'attack',targetId:activeAction.target_id};}
  s.round.attackAllocations.push({targetId:activeAction.target_id,dieIds:[...activeAction.physical_die_ids],contributionIds:[],damage:1});return s;
 });
 checkpoint('after placement');actions.push({input:activeAction,status:'accepted',operations:[0]});
 activeAction=scenario.actions[1];
 step('Recorded RESOLVE_ASSIGNMENTS; no unused meaningful set or gold ability',resolveAssignments,s=>{s.game.phase='DAMAGE_RESOLUTION';return s;});
 const allocation=state.round.attackAllocations[0];
 step('Apply the single allocated damage to A only',s=>applyLaborDamage(s,allocation.targetId,allocation.damage),s=>{s.currentLabor.laborDice['labor.L08.A'].health=5;return s;});
 checkpoint('after damage, before advancement');
 // Pinned resolveRoundDamage scheduler, split only at observable helper boundaries.
 // No source correction is fed back into state; expected states remain separate.
 step('Begin mandatory Labor advancement',s=>{s.game.phase='LABOR_ADVANCE';return s;},s=>{s.game.phase='LABOR_ADVANCE';return s;});
 step('Advance each active Labor die once along its unique edge',advanceLaborDice,s=>{s.currentLabor.laborDice['labor.L08.A'].nodeId='L08A.n1';s.currentLabor.laborDice['labor.L08.B'].nodeId='L08B.n1';s.game.phase='IMPACT_RESOLUTION';return s;});
 checkpoint('after advancement');
 const aNode=tracks['track.L08.A'].nodes['L08A.n1'];
 step('Queue A.n1 Spirit loss -3',s=>applyContentEffect(s,aNode.effect,aNode.id,'labor.L08.A',true),s=>{s.round.resourceQueue.spiritDeltas.push(-3);return s;});
 const bNode=tracks['track.L08.B'].nodes['L08B.n1'];
 step('Resolve B.n1 healing on source B only, capped at 6',s=>applyContentEffect(s,bNode.effect,bNode.id,'labor.L08.B',true),s=>{const die=s.currentLabor.laborDice['labor.L08.B'];die.health=Math.min(die.startingHealth,die.health+bNode.effect.heal);return s;});
 step('Settle queued impact resources',resolveQueuedResources,s=>{s.player.spirit=7;s.round.resourceQueue={spiritDeltas:[],divinityDeltas:[]};return s;});
 step('Complete failure check',s=>{s.game.phase='FAILURE_CHECK';return s;},s=>{s.game.phase='FAILURE_CHECK';return s;});
 checkpoint('after impacts');
 step('Round cleanup',cleanupRound,s=>{
  for(const die of Object.values(s.herculesDice))if(die.availableForLabor&&!die.broken){die.face=null;die.blueUsed=false;die.spent=false;die.locked=false;die.allocated=false;die.rollable=true;die.placement=null;}
  s.round={rollNumber:1,rerollNumber:0,cowsBRerollNumber:0,effectiveDoubleDieIds:[],derivedContributions:{},goldPlacements:[],attackAllocations:[],blockedSpirit:0,resourceQueue:{spiritDeltas:[],divinityDeltas:[]}};s.game.phase='READY_TO_ROLL';return s;
 });
 checkpoint('after failure check and cleanup');actions.push({input:activeAction,status:'accepted',operations:operations.slice(1).map(o=>o.index)});
 const prior=read('orchestration/validation/VAL-003-validation-20260914T015459Z-5daa2c-l08-checkpoints.json');
 requireThat(equal(state,prior.terminal_state),'VAL003_FULL_L08_STATE_CHANGED');
 requireThat(equal(operations,prior.operations),'VAL003_FULL_L08_OPERATIONS_CHANGED');
 requireThat(equal(actions,prior.consumed_actions),'VAL003_L08_ACTIONS_CHANGED');
}catch(error){
 stop={action_seq:activeAction?.seq,action:activeAction,code:error.code??'ENGINE_OPERATION_ERROR',detail:error.detail??null,operation_index:operations.length-1,operation_label:operations.at(-1)?.label,phase:state.game.phase,spirit:state.player.spirit,divinity:state.player.divinity,next_rng_event:state.rng.nextEvent};
 if(!actions.some(a=>a.input.seq===activeAction?.seq))actions.push({input:activeAction,status:'partially_executed_then_stopped',operations:operations.filter(o=>o.action_seq===activeAction?.seq).map(o=>o.index)});
}
const evidence={task_id:task.id,run_id:RUN,manifest_revision:manifest.manifest_revision,tested_commit:COMMIT,scenario_id:task.scenario_id,pinned_scenario_id:scenario.scenario_id,scenario_kind:'constructed_scripted_test',is_recorded_human_play:false,bindings:binding,complete_start_state:initial,consumed_actions:actions,checkpoints:comparisons,expected_checkpoint_status:scenario.proposed_expected_transitions.map(c=>({boundary:c.boundary,status:comparisons.find(x=>x.boundary===c.boundary)?.status??'NOT_REACHED'})),operations,last_valid_state:lastValid,offending_state:stop?state:null,terminal_state:stop?null:state,stopped_state:state,stop};
const ledger={task_id:task.id,run_id:RUN,algorithm:scenario.rng.algorithm,policy:scenario.rng.policy,seed:scenario.rng.seed,mode:'zero_rng_boundary',start_index:0,end_index:Number(state.rng.nextEvent),events:state.rng.ledger,orphaned_ranges:[],fixed_faces_are_random_outcomes:false,random_operations_performed:0,full_rng_unchanged:equal(initial.rng,state.rng),forbidden_operations:scenario.rng.forbidden_operations};
const summary={task_id:task.id,run_id:RUN,pass_fail:stop?'FAIL':'PASS',canonical_contract_checks:Object.keys(contractChecks).length,canonical_contract_checks_passed:Object.values(contractChecks).filter(Boolean).length,pins_matched:pins.length,checkpoints:comparisons.map(c=>c.boundary),stop,operation_count:operations.length,matched_operations:operations.filter(o=>o.status==='MATCH').length,rng_events:state.rng.ledger.length,evidence_sha256:sha(JSON.stringify(evidence)),ledger_sha256:sha(JSON.stringify(ledger))};
if(CHECK){requireThat(equal(read(STEM+'-checkpoints.json'),evidence),'REPRODUCTION_STATE_MISMATCH');requireThat(equal(read(STEM+'-rng-ledger.json'),ledger),'REPRODUCTION_LEDGER_MISMATCH');console.log(JSON.stringify({...summary,reproduction:'EXACT_MATCH; full states/actions/operations and zero-RNG ledger; no files written'},null,2));}
else{
 const write=(suffix,value)=>fs.writeFileSync(STEM+suffix,JSON.stringify(value,null,2)+'\n');
 write('-input-verification.json',verification);write('-checkpoints.json',evidence);write('-rng-ledger.json',ledger);write('-execution-summary.json',summary);
 fs.writeFileSync(STEM+'-execution-log.txt',[
  `VAL-004 L08 ${RUN}; tested ${COMMIT}; manifest e1-m0007.`,
  'Clean independent checkout, 49 pins/source commits/Git-byte hashes/tree membership verified (six superseded trees are historical only).',
  'pnpm install --frozen-lockfile: exit 0. pnpm exec tsc -p tsconfig.json: exit 0. No data generation.',
  'Node v24.19.0; pnpm 11.19.0; TypeScript 5.9.3.',
  'Complete fixed start state independently matches the corrected F046 regression context. No RNG initialization/roll/shuffle/draw occurred.',
  'Expected states are separate assertions from source-backed scope and scenario inputs; they are never substituted into runtime state.',
  ...operations.map(o=>`${o.index}: ${o.label}: ${o.status}`),JSON.stringify(summary,null,2)
 ].join('\n')+'\n');
 console.log(JSON.stringify(summary,null,2));
}

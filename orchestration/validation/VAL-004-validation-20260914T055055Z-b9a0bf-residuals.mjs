import fs from 'node:fs';
import { isDeepStrictEqual as equal } from 'node:util';
import { applyContentEffect } from '../../dist/src/engine/effects/content.js';
import { getNode } from '../../dist/src/engine/labor/content.js';
import { createInitialState } from '../../dist/src/engine/state/create.js';
import { validateState } from '../../dist/src/engine/state/invariants.js';
import { replayGoldenRunTrace } from '../../dist/src/replay/golden-run.js';
import { RUN,COMMIT,STEM,read,guard,verifyPins,verifyPriorEvidence } from './VAL-004-validation-20260914T055055Z-b9a0bf-common.mjs';
const CHECK=process.argv.includes('--check'),task=guard(),pins=verifyPins(),priorMembers=verifyPriorEvidence();
if(!CHECK&&fs.existsSync(STEM+'-residuals.json'))throw Error('Evidence exists');
const clone=v=>structuredClone(v);
const scriptPath='src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json',recordPath='src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json';
const script=read(scriptPath),record=read(recordPath),fixtures=read('src/data/raw/TEST_FIXTURES_v4.json'),scenario=read('orchestration/validation/RS-001-L08-scenario.json'),start=read('orchestration/validation/RS-001-golden-start-state.json');
if(!equal(createInitialState('human',script.seed),start.pre_setup_state)||script.seed!==record.seed||script.inputs.length!==112||!script.inputs.every((v,i)=>v.seq===i+1))throw Error('Incomplete Golden preconditions');
if(!equal(scenario.start_state,fixtures.regression_contexts['RS-002-L08'].start_state)||scenario.rng.mode!=='zero_rng_boundary')throw Error('Constructed start mismatch');
const controls=[
 {id:'terminal_H1_face',kind:'replay',mutations:[{pointer:'/terminal_state/hercules_dice/H1/face',value:6}],expected_error:'Golden terminal hercules_dice.H1.face diverged.'},
 {id:'terminal_hidden_order',kind:'replay',mutations:[{pointer:'/terminal_state/ordered_hidden_mood_deck_top_to_bottom',value:[record.terminal_state.ordered_hidden_mood_deck_top_to_bottom[1],record.terminal_state.ordered_hidden_mood_deck_top_to_bottom[0],...record.terminal_state.ordered_hidden_mood_deck_top_to_bottom.slice(2)]}],expected_error:'Golden terminal ordered_hidden_mood_deck_top_to_bottom diverged.'},
 {id:'first_Hercules_field_with_two_differences',kind:'replay',mutations:[{pointer:'/terminal_state/hercules_dice/H1/face',value:6},{pointer:'/terminal_state/hercules_dice/H1/locked',value:false}],expected_error:'Golden terminal hercules_dice.H1.face diverged.'},
 {id:'first_terminal_field_with_order_and_face_differences',kind:'replay',mutations:[{pointer:'/terminal_state/ordered_hidden_mood_deck_top_to_bottom',value:[...record.terminal_state.ordered_hidden_mood_deck_top_to_bottom].reverse()},{pointer:'/terminal_state/hercules_dice/H1/face',value:6}],expected_error:'Golden terminal ordered_hidden_mood_deck_top_to_bottom diverged.'}
];
const f053=fixtures.fixtures.find(f=>f.id==='F053'),f052=fixtures.fixtures.find(f=>f.id==='F052');
for(const [fixture,cases] of [[f053,f053.cases],[f052,f052.cases.filter(c=>c.name==='stale_queued_inactive_source')]])for(const c of cases)for(const queued of [false,true])controls.push({id:fixture.id+'_'+c.name+(queued?'_queued':'_immediate'),kind:'healing',fixture_id:fixture.id,case:clone(c),queue_resources:queued,expected_error: c.name==='missing_source'?'Healing requires a source Labor die and entered-node context.':c.name==='unknown_source'?'Healing source Labor die labor.L08.unknown is unknown.':c.name==='stale_queued_inactive_source'?'Healing source Labor die labor.L08.B is not active.':`Healing source Labor die ${c.source_labor_die_id} is not on entered node ${c.entered_node_id}.`});
const entries=[];let stop=null;
const set=(root,keys,value)=>{let r=root;for(const k of keys.slice(0,-1))r=r[k];r[keys.at(-1)]=clone(value);};
for(const control of controls){
 const entry={index:entries.length,id:control.id,kind:control.kind,control,passed:false};
 if(control.kind==='replay'){
  const s=clone(script),r=clone(record);for(const m of control.mutations)set(r,m.pointer.slice(1).split('/'),m.value);
  entry.script=s;entry.modified_record=r;entry.complete_start_state=clone(start.pre_setup_state);
  const before=clone({s,r});
  try{entry.unexpected_return=replayGoldenRunTrace(s,r);}catch(e){entry.observed_error=e.message;}
  entry.input_objects_unchanged=equal({s,r},before);
  entry.passed=entry.observed_error===control.expected_error&&entry.input_objects_unchanged;
 }else{
  const state=clone(scenario.start_state);for(const [path,value] of Object.entries(control.case.overrides))set(state,path.split('.'),value);
  if(!validateState(state).valid)throw Error('Invalid prepared fixture state '+control.id);
  const effect=clone(getNode('labor.L08','track.L08.B',control.case.entered_node_id).effect);
  if(typeof effect.heal!=='number')throw Error('Fixture entered effect is not a heal');
  entry.complete_start_state=clone(state);entry.invocation={effect,source_id:control.case.entered_node_id,source_labor_die_id:control.case.source_labor_die_id,queue_resources:control.queue_resources};
  try{entry.unexpected_return=applyContentEffect(state,effect,control.case.entered_node_id,control.case.source_labor_die_id??undefined,control.queue_resources);}catch(e){entry.observed_error=e.message;}
  entry.state_after_attempt=clone(state);entry.state_unchanged=equal(state,entry.complete_start_state);entry.rng_unchanged=equal(state.rng,scenario.start_state.rng);
  entry.passed=entry.observed_error===control.expected_error&&entry.state_unchanged&&entry.rng_unchanged;
 }
 entries.push(entry);
 if(!entry.passed){stop={index:entry.index,control_id:control.id,kind:control.kind,expected_error:control.expected_error,observed_error:entry.observed_error??null,unexpected_return:entry.unexpected_return!==undefined,evidence_pointer:'/controls/'+entry.index};break;}
}
const result={task_id:task.id,run_id:RUN,tested_commit:COMMIT,manifest_revision:'e1-m0007',pass_fail:stop?'FAIL':'PASS',controls:entries,stop,not_reached:controls.slice(entries.length).map(c=>c.id),pins_verified:49,scenario_bindings:{golden_start:'orchestration/validation/RS-001-golden-start-state.json#/pre_setup_state',script:scriptPath,record:recordPath,healing_start:'src/data/raw/TEST_FIXTURES_v4.json#/regression_contexts/RS-002-L08/start_state',healing_overrides:'F053 four cases; F052 stale_queued_inactive_source',healing_rng:{algorithm:scenario.rng.algorithm,policy:scenario.rng.policy,seed:scenario.rng.seed,start_index:0,end_index:0,ledger:[],fixed_faces_are_random_outcomes:false},stale_rejection_authority:'VAL-004 acceptance criterion 3 explicitly requires rejection; F052 supplies the complete inactive-source overrides and unchanged-state expectation.'},method_limitations:['These are deliberate invalid-evidence/context controls, not replacement player choices. Each invocation restarts from its complete pinned state.','The replay helper throws text errors and provides no private partial-state observer. Exact modified inputs, record, complete start and error field are preserved; positive tactical replay is separately recorded.','No scenario after an unexpected control result is executed.']};
if(CHECK){if(!equal(read(STEM+'-residuals.json'),result))throw Error('Residual reproduction mismatch');console.log('EXACT_MATCH: all residual controls, errors and unchanged full states/RNG.');}
else{
 fs.writeFileSync(STEM+'-residuals.json',JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(STEM+'-input-verification.json',JSON.stringify({task_id:task.id,run_id:RUN,tested_commit:COMMIT,manifest_revision:'e1-m0007',claim:task.claim,pins,prior_handoff_members:priorMembers,all_matched:true,node:process.version},null,2)+'\n');
 console.log(JSON.stringify({pass_fail:result.pass_fail,controls:entries.map(e=>({id:e.id,passed:e.passed,error:e.observed_error})),stop},null,2));
}

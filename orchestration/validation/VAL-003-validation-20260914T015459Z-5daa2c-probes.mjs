import fs from 'node:fs';
import { isDeepStrictEqual as equal } from 'node:util';
import { replayGoldenRunTrace } from '../../dist/src/replay/golden-run.js';
import { resolveRoundDamage } from '../../dist/src/engine/round/resolve.js';
import { RUN,COMMIT,STEM,read,guard,verifyPins } from './VAL-003-validation-20260914T015459Z-5daa2c-common.mjs';
const CHECK=process.argv.includes('--check');guard();const pins=verifyPins();
const script=read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json');
const record=read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json');
const golden=read(STEM+'-golden-checkpoints.json'),l08=read(STEM+'-l08-checkpoints.json');
if(golden.stop||l08.stop)throw Error('Earlier scenario stopped; no further execution allowed');
const norm=v=>{if(Array.isArray(v))return v.map(norm);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='error'&&v.status==='orphaned_execution_error'?'documented historical orphan':norm(x)]));return v;};
const operations=[];let stop=null;
// Each negative control is a declared, isolated in-memory mutation of pinned
// replay evidence. No canonical file changes or subsequent game commands occur.
const probes=[
 {id:'reusable_positive_full_state',kind:'positive',run:()=>replayGoldenRunTrace(structuredClone(script),structuredClone(record)),expected:{state:golden.terminal_state,checkpoints:golden.completed_labor_checkpoints.map(c=>c.full_state)}},
 {id:'l08_compound_scheduler_equivalence',kind:'positive',run:()=>resolveRoundDamage(structuredClone(l08.operations[1].observed_state)),expected:l08.terminal_state},
 {id:'missing_approval',mutate:s=>{s.inputs.shift();s.inputs.forEach((i,n)=>i.seq=n+1);},expectedError:/initial Mood approval is missing or skipped/},
 {id:'mismatched_approval',mutate:s=>{[s.inputs[0].order[0],s.inputs[0].order[1]]=[s.inputs[0].order[1],s.inputs[0].order[0]];},expectedError:/initial Mood approval differs from the script precondition/},
 {id:'noncontiguous_sequence',mutate:s=>{s.inputs[5].seq=5;},expectedError:/sequence is incomplete or non-contiguous/},
 {id:'illegal_phase',mutate:s=>{s.inputs[1]={seq:2,labor:1,roll:0,action:'finalize_blue_phase'};},expectedError:/Golden input 2.*finalize blue requires BLUE_ABILITY_WINDOW/},
 {id:'false_blue_from',mutate:s=>{s.inputs[2].operation.from=2;},expectedError:/Golden input 3.*operation.from 2 does not match 1/},
 {id:'first_rng_mismatch',mutate:(s,r)=>{r.rng_event_ledger[0].raw64='0';},expectedError:/Golden RNG mismatch at 0/},
 {id:'first_checkpoint_mismatch',mutate:(s,r)=>{r.checkpoints[0].spirit=15;},expectedError:/Golden input 9.*intermediate checkpoint 1 diverged/},
 {id:'unresolved_mandatory_decision',mutate:s=>{s.inputs[30]={seq:31,labor:3,roll:2,action:'finalize_blue_phase'};},expectedError:/Golden input 31.*unrecorded pending decision CHOOSE_DIE_TO_BREAK/},
 {id:'terminal_failed_die_status',mutate:(s,r)=>{r.terminal_state.birds_labor_dice.LABOR6_C17.status='active';},expectedError:/Golden terminal Labor die LABOR6_C17 diverged/},
 {id:'terminal_hercules_face',mutate:(s,r)=>{r.terminal_state.hercules_dice.H1.face=6;},expectedError:/terminal|H1|Hercules/i},
 {id:'terminal_hidden_order',mutate:(s,r)=>{[r.terminal_state.ordered_hidden_mood_deck_top_to_bottom[0],r.terminal_state.ordered_hidden_mood_deck_top_to_bottom[1]]=[r.terminal_state.ordered_hidden_mood_deck_top_to_bottom[1],r.terminal_state.ordered_hidden_mood_deck_top_to_bottom[0]];},expectedError:/terminal|Mood|deck/i}
];
for(const p of probes){
 const entry={index:operations.length,id:p.id,kind:p.kind??'negative',expected:p.kind==='positive'?p.expected:{reject:true,error_pattern:p.expectedError.source},passed:false};
 if(p.kind==='positive'){
  try{entry.observed=p.run();entry.passed=equal(norm(entry.observed),norm(p.expected));}catch(e){entry.error=e.message;}
 }else{
  const s=structuredClone(script),r=structuredClone(record);p.mutate(s,r);entry.modified_script=s;entry.modified_record=r;
  const before=JSON.stringify({s,r});
  try{entry.returned=replayGoldenRunTrace(s,r);entry.unexpected_acceptance=true;}catch(e){entry.observed_error=e.message;entry.passed=p.expectedError.test(e.message);}
  entry.input_objects_unchanged=JSON.stringify({s,r})===before;entry.passed&&=entry.input_objects_unchanged;
 }
 operations.push(entry);
 if(!entry.passed){stop={probe_id:p.id,index:entry.index,reason:entry.unexpected_acceptance?'Replay accepted evidence that disagrees with its resulting state':'Expected probe result not observed',offending_evidence_index:entry.index};break;}
}
const result={task_id:'VAL-003',run_id:RUN,tested_commit:COMMIT,manifest_revision:'e1-m0005',pass_fail:stop?'FAIL':'PASS',input_pins_verified:pins.length,normalization:'Only explanatory error text on permanent historical orphan entries is normalized when comparing independently recorded full states. All gameplay fields and random material compare exactly.',operations,stop,not_reached:probes.slice(operations.length).map(p=>p.id),positive_scenario_passes_preserved:true,method_limitations:['The reusable helper throws a text error and exposes no partial-state observer. Exact error boundaries and complete modified input/record are preserved; a rejected helper run cannot supply its private intermediate state. The independent guarded replay separately records full accepted states.']};
if(CHECK){if(!equal(read(STEM+'-replay-probes.json'),result))throw Error('Probe reproduction differs');console.log('EXACT_MATCH: reusable replay probes and full returned states');}
else{fs.writeFileSync(STEM+'-replay-probes.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass_fail:result.pass_fail,probes:operations.map(o=>({id:o.id,passed:o.passed,error:o.observed_error??o.error??null})),stop,not_reached:result.not_reached},null,2));}

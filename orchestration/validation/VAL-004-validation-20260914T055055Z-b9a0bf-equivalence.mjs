import fs from 'node:fs';
import { isDeepStrictEqual as equal } from 'node:util';
import { replayGoldenRunTrace } from '../../dist/src/replay/golden-run.js';
import { resolveRoundDamage } from '../../dist/src/engine/round/resolve.js';
import { RUN,COMMIT,STEM,read,guard,verifyPins } from './VAL-004-validation-20260914T055055Z-b9a0bf-common.mjs';
const CHECK=process.argv.includes('--check');guard();verifyPins();
if(!CHECK&&fs.existsSync(STEM+'-equivalence.json'))throw Error('Evidence exists');
const prior='orchestration/validation/VAL-003-validation-20260914T015459Z-5daa2c';
const g=read(STEM+'-golden-checkpoints.json'),l=read(STEM+'-l08-checkpoints.json');
if(g.stop||l.stop||read(STEM+'-residuals.json').stop)throw Error('Earlier validation stop');
const norm=v=>{if(Array.isArray(v))return v.map(norm);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='error'&&v.status==='orphaned_execution_error'?'documented historical orphan':norm(x)]));return v;};
const entries=[];let stop=null;
const definitions=[
 {id:'reusable_Golden_full_state_and_five_checkpoints',execute:()=>replayGoldenRunTrace(read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json'),read('src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json')),compare:actual=>({exact_prior_helper_match:equal(actual,read(prior+'-replay-probes.json').operations[0].observed),independent_observed_states_match:equal(norm(actual),norm({state:g.terminal_state,checkpoints:g.completed_labor_checkpoints.map(c=>c.full_state)}))})},
 {id:'L08_compound_scheduler_full_state',execute:()=>resolveRoundDamage(structuredClone(l.operations[1].observed_state)),compare:actual=>({exact_prior_state_match:equal(actual,read(prior+'-l08-checkpoints.json').terminal_state),independent_observed_state_match:equal(actual,l.terminal_state)})}
];
for(const d of definitions){const entry={id:d.id,index:entries.length};try{entry.observed=d.execute();entry.comparisons=d.compare(entry.observed);entry.passed=Object.values(entry.comparisons).every(Boolean);}catch(e){entry.error=e.message;entry.passed=false;}entries.push(entry);if(!entry.passed){stop={id:d.id,index:entry.index};break;}}
const result={task_id:'VAL-004',run_id:RUN,tested_commit:COMMIT,manifest_revision:'e1-m0007',pass_fail:stop?'FAIL':'PASS',entries,stop,not_reached:definitions.slice(entries.length).map(d=>d.id),normalization:'Only helper-versus-independent-driver explanatory orphan error strings are normalized; helper-versus-prior-helper comparison is exact with no normalization. No gameplay or random-material field is normalized.'};
if(CHECK){if(!equal(read(STEM+'-equivalence.json'),result))throw Error('Equivalence reproduction mismatch');console.log('EXACT_MATCH: reusable helper and compound scheduler full states.');}
else{fs.writeFileSync(STEM+'-equivalence.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass_fail:result.pass_fail,checks:entries.map(e=>({id:e.id,comparisons:e.comparisons,passed:e.passed,error:e.error})),stop},null,2));}

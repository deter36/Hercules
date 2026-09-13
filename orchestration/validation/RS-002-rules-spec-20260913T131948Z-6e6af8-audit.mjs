// RS-002 preparation checks and historical-engine regression diagnosis.
// Usage: node RS-002-audit.mjs <checkout> <output-json> [--generate]
// --generate runs the pinned generator first. No engine sources are modified.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const [repo, output, mode] = process.argv.slice(2);
if (!repo || !output) throw new Error('checkout and output path required');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], {maxBuffer:64*1024*1024});
const gt = (...args) => git(...args).toString('utf8').trim();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const load = rel => JSON.parse(fs.readFileSync(path.join(repo,rel),'utf8'));
const json = v => JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x);
const snapshot = v => JSON.parse(json(v));
const TESTED_BASE_COMMIT='aab92880ea10e4cb33d3af34530d7c16cdad11ef';
const pins = JSON.parse(git('show',`${TESTED_BASE_COMMIT}:orchestration/project_state.json`)).canonical_artifacts;
const gitTextBytes = bytes => Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
const pin = id => pins.find(p=>p.id===id);
const baseline = id => JSON.parse(git('cat-file','blob',pin(id).git_object));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'hercules-rs002-'));
fs.writeFileSync(path.join(tmp,'package.json'),'{"type":"module"}');
function compile(rel) {
  const to=path.join(tmp,rel.replace(/\.ts$/,'.js'));
  fs.mkdirSync(path.dirname(to),{recursive:true});
  fs.writeFileSync(to,stripTypeScriptTypes(fs.readFileSync(path.join(repo,rel),'utf8')));
}
function copy(dir) {
  for(const e of fs.readdirSync(path.join(repo,dir),{withFileTypes:true})) {
    const rel=path.join(dir,e.name);
    if(e.isDirectory())copy(rel);
    else if(e.name.endsWith('.ts')&&!e.name.endsWith('.d.ts'))compile(rel);
  }
}
const imp=rel=>import(pathToFileURL(path.join(tmp,rel)).href);
const result={task_id:'RS-002',run_id:'rules-spec-20260913T131948Z-6e6af8',manifest_revision:'e1-m0001',
  purpose:'Candidate content preparation and diagnosis; not independent Validation and not a gate pass',
  tested_base_commit:TESTED_BASE_COMMIT,checkout_head:gt('rev-parse','HEAD'),tested_content:'Working candidate objects recorded below; containing commit is the delivery commit',
  runtime:process.version,method:'Pinned TypeScript sources executed via Node built-in type stripping in an OS temporary directory; no dependency installation or type-check claim',
  content_checks:[],runtime_checks:[],generation:null,inputs:pins};
function check(bucket,name,actual,expected=true) {
  const ok=isDeepStrictEqual(snapshot(actual),snapshot(expected));
  bucket.push({name,status:ok?'PASS':'FAIL',...(ok?{}:{expected:snapshot(expected),observed:snapshot(actual)})});
  return ok;
}
const cc=(name,actual,expected=true)=>check(result.content_checks,name,actual,expected);
const rc=(name,actual,expected=true)=>check(result.runtime_checks,name,actual,expected);
for(const p of pins) {
  cc(`baseline pin ${p.id}`,gt('rev-parse',`${TESTED_BASE_COMMIT}:${p.path}`),p.git_object);
  if(p.kind==='blob'&&p.sha256_git_bytes)cc(`baseline SHA256 ${p.id}`,sha(git('cat-file','blob',p.git_object)),p.sha256_git_bytes);
}
compile('src/data/generate.ts');compile('src/data/validation.ts');
const generator=path.join(tmp,'src/data/generate.js');
if(mode==='--generate')result.generation={command:'pinned src/data/generate.ts via type stripping',output:execFileSync(process.execPath,[generator],{cwd:repo,encoding:'utf8'}).trim()};
// Git normalizes these text artifacts to LF. Verify in a temporary mirror so
// Windows checkout conversion does not mutate inputs or create a false mismatch.
const checkDir=path.join(tmp,'generator-check');
for(const rel of ['src/data/raw/GAME_DATA_v4.json','src/data/generated/game-data.ts']) {
  const dest=path.join(checkDir,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,gitTextBytes(fs.readFileSync(path.join(repo,rel))));
}
execFileSync(process.execPath,[generator,'--check'],{cwd:checkDir});
cc('pinned generator --check',true);
copy('src');
const {GAME_DATA,GAME_DATA_SOURCE_HASH,GAME_DATA_CONTENT_HASH}=await imp('src/data/generated/game-data.js');
const raw=load('src/data/raw/GAME_DATA_v4.json');
const rawBytes=gitTextBytes(fs.readFileSync(path.join(repo,'src/data/raw/GAME_DATA_v4.json')));
const fixtures=load('src/data/raw/TEST_FIXTURES_v4.json');
cc('raw and generated semantic identity',GAME_DATA,raw);
cc('generated source hash matches LF source bytes',GAME_DATA_SOURCE_HASH,sha(rawBytes));
cc('raw source uses Git-equivalent LF bytes',rawBytes.includes(Buffer.from('\r\n')),false);
cc('generated content hash',GAME_DATA_CONTENT_HASH,sha(JSON.stringify(raw)));
result.candidate_hashes={source:GAME_DATA_SOURCE_HASH,content:GAME_DATA_CONTENT_HASH};
const old=baseline('game-data');
const reduced=structuredClone(raw);
delete reduced.content_revision;delete reduced.source_corrections;
const a=reduced.labors[7].attack;
for(const k of ['requirement_scope','eligible_target_ids','damage_scope','target_selection','correction_ref'])delete a[k];
a.scope='all_active_targets';
result.healing_nodes=[];
for(const [i,l] of raw.labors.entries())for(const [tid,t] of Object.entries(l.tracks)) {
  for(const [key,node]of Object.entries(t.nodes))if(node.effect?.heal!==undefined) {
    const e=node.effect,p=`${l.id}/${tid}/${node.id??key}`;
    result.healing_nodes.push({labor_id:l.id,track_id:tid,node_id:node.id??key,amount:e.heal});
    cc(`healing contract ${p}`,{positive:Number.isInteger(e.heal)&&e.heal>0,scope:e.heal_scope,cap:e.heal_cap},{positive:true,scope:'source_labor_die',cap:'source_start_health'});
    delete reduced.labors[i].tracks[tid].nodes[key].effect.heal_scope;
    delete reduced.labors[i].tracks[tid].nodes[key].effect.heal_cap;
  }
}
cc('only approved attack, healing metadata and provenance changed',reduced,old);
cc('L08 explicit contract',raw.labors[7].attack,{
  scope:'target',requirement:{type:'fixed_straight',values:[1,2,3]},damage:1,
  requirement_scope:'shared_by_listed_targets',eligible_target_ids:['labor.L08.A','labor.L08.B'],
  damage_scope:'single_selected_target',target_selection:{owner:'player',count:1,timing:'attack_allocation',allowed_statuses:['active']},correction_ref:'RS-002-L08-ATTACK'});
const historical=baseline('test-fixtures');
cc('original fixtures preserved exactly',fixtures.fixtures.slice(0,historical.fixtures.length),historical.fixtures);
cc('Golden expected record preserved exactly',fixtures.golden,historical.golden);
cc('original fixture metadata preserved',Object.fromEntries(Object.entries(fixtures).filter(([k])=>!['fixtures','regression_contexts'].includes(k))),Object.fromEntries(Object.entries(historical).filter(([k])=>k!=='fixtures')));
cc('new regression IDs',fixtures.fixtures.slice(historical.fixtures.length).map(x=>x.id),['F046','F047','F048','F049','F050','F051','F052','F053','F054']);
for(const p of pins.filter(p=>['official-rulebook','verified-reference','package-checksums','historical-engine','rng-implementation','replay-implementation','existing-tests','data-generator','data-validator'].includes(p.id)))
  cc(`protected worktree ${p.id}`,gt('diff',TESTED_BASE_COMMIT,'--',p.path),'');
cc('all protected engine source files unchanged',gt('diff',TESTED_BASE_COMMIT,'--','src/engine'),'');
cc('pinned generator and validator unchanged',gt('diff',TESTED_BASE_COMMIT,'--','src/data/generate.ts','src/data/validation.ts'),'');
cc('historical Golden files unchanged',gt('diff',TESTED_BASE_COMMIT,'--','src/data/raw/golden'),'');
cc('original v12 statement retained',raw.source_corrections[0].original_reference_statement,'• Attack scope: **labor-wide** fixed `1-2-3` straight; applies to both Labor dice.');
cc('human authority preserved',raw.source_corrections.every(c=>isDeepStrictEqual(c.authority_ref.decision,load('orchestration/tasks/RS-002.json').authority_decision)));
cc('historical expected checksum retained',raw.source_corrections[2].historical_expected_sha256,'15313bbc55a4cec400b04a99f862de70fc545009ec5efaaf32c5fc861e88b5b7');

const {allocateAttack}=await imp('src/engine/actions/placement.js');
const {resolveAssignments}=await imp('src/engine/commands/resolve-assignments.js');
const {resolveRoundDamage}=await imp('src/engine/round/resolve.js');
const {applyLaborDamage}=await imp('src/engine/labor/damage.js');
const {getNode}=await imp('src/engine/labor/content.js');
const {applyContentEffect,resolveQueuedResources}=await imp('src/engine/effects/content.js');
function start(overrides={}) {
  const s=structuredClone(fixtures.regression_contexts['RS-002-L08'].start_state);
  for(const [key,value]of Object.entries(overrides)) {
    const parts=key.split('.');let o=s;
    for(const k of parts.slice(0,-1))o=o[k];
    o[parts.at(-1)]=structuredClone(value);
  }
  s.rng.nextEvent=BigInt(s.rng.nextEvent);return s;
}
function view(s) {return {health:Object.fromEntries(Object.values(s.currentLabor.laborDice).map(d=>[d.id,d.health])),
  node_ids:Object.fromEntries(Object.values(s.currentLabor.laborDice).map(d=>[d.id,d.nodeId])),
  statuses:Object.fromEntries(Object.values(s.currentLabor.laborDice).map(d=>[d.id,d.status])),
  spirit:s.player.spirit,divinity:s.player.divinity,phase:s.game.phase,pending_decision:s.pendingDecision};}
function expect(name,s,e) {
  const v=view(s);for(const [k,value]of Object.entries(e))if(k!=='preserve')rc(`${name} ${k}`,k==='target_ids'?s.round.attackAllocations.map(a=>a.targetId):v[k],value);
}
// This exposes the damage boundary using exactly the baseline allocation loop
// and its pinned helper; it is a diagnostic adapter, not a replacement engine.
function observedDamage(s) {
  let n=structuredClone(s);
  for(const a of n.round.attackAllocations) {
    if(a.targetId==='__all_active_targets__') {
      for(const d of Object.values(n.currentLabor.laborDice).filter(d=>d.status==='active'))n=applyLaborDamage(n,d.id,a.damage);
    } else if(n.currentLabor.laborDice[a.targetId]?.status==='active')n=applyLaborDamage(n,a.targetId,a.damage);
  }
  return n;
}
result.observations=[];
for(const f of fixtures.fixtures.slice(historical.fixtures.length)) {
  if(['allocation_and_round','damage_only'].includes(f.kind)) {
    const initial=start(f.overrides);let n=initial;
    for(const action of f.actions.filter(x=>x.command==='ASSIGN_ATTACK'))n=allocateAttack(n,action.target_id,action.physical_die_ids);
    expect(`${f.id} after_allocation`,n,f.expected.after_allocation);
    rc(`${f.id} placement RNG`,n.rng,initial.rng);
    n=resolveAssignments(n);rc(`${f.id} resolution has no pending choice`,n.pendingDecision,null);
    const d=observedDamage(n);expect(`${f.id} after_damage`,d,f.expected.after_damage);rc(`${f.id} damage RNG`,d.rng,initial.rng);
    const record={fixture_id:f.id,after_damage:view(d)};
    if(f.kind==='allocation_and_round') {
      const after=resolveRoundDamage(n);expect(`${f.id} after_round`,after,f.expected.after_round);
      rc(`${f.id} round RNG`,after.rng,initial.rng);rc(`${f.id} Mood preserved`,after.mood,initial.mood);
      rc(`${f.id} Rewards preserved`,after.player.ownedRewardIds,[]);
      for(const [flag,key]of Object.entries({allocated:'allocated_ids',locked:'locked_ids',spent:'spent_ids',blueUsed:'blue_used_ids',broken:'broken_ids'}))
        rc(`${f.id} cleanup ${flag}`,Object.values(after.herculesDice).filter(d=>d[flag]).map(d=>d.id),f.expected.cleanup[key]);
      rc(`${f.id} attack cleanup`,after.round.attackAllocations,[]);rc(`${f.id} gold cleanup`,after.round.goldPlacements,[]);rc(`${f.id} trigger cleanup`,after.pendingTriggers,[]);
      rc(`${f.id} unused dice remain unavailable`,Object.values(after.herculesDice).filter(d=>!d.availableForLabor).map(d=>d.id),['H6','H7','H8','H9','H10','H11']);
      record.after_round=view(after);record.terminal_state=snapshot(after);
    }
    result.observations.push(record);
  } else for(const c of f.cases) {
    let s=start(c.overrides);
    if(c.setup_allocation)s=allocateAttack(s,c.setup_allocation.target_id,c.setup_allocation.physical_die_ids);
    const before=snapshot(s);let after,error=null;
    try {
      if(f.kind==='allocation_rejections')after=allocateAttack(s,c.target_id,c.physical_die_ids);
      else {
        const effect=getNode('labor.L08','track.L08.B',c.entered_node_id).effect;
        after=resolveQueuedResources(applyContentEffect(s,effect,c.entered_node_id,c.source_labor_die_id??undefined,true));
      }
    } catch(e) {error=String(e.message);}
    const name=`${f.id}/${c.name}`;
    rc(`${name} input state not mutated`,snapshot(s),before);
    if(f.kind.endsWith('rejections')) {
      rc(`${name} rejected`,error!==null);
    } else {
      rc(`${name} executes`,error,null);
      if(after) {
        expect(name,after,c.expected);rc(`${name} RNG`,after.rng,s.rng);rc(`${name} Hercules dice`,after.herculesDice,s.herculesDice);
        rc(`${name} player non-resources`,Object.fromEntries(Object.entries(after.player).filter(([k])=>!['spirit','divinity'].includes(k))),Object.fromEntries(Object.entries(s.player).filter(([k])=>!['spirit','divinity'].includes(k))));
      }
    }
    result.observations.push({fixture_id:f.id,case:c.name,error,observed:after?view(after):null});
  }
}
// Preserve and re-execute the pinned historical replay as a bounded regression
// diagnostic. Terminal correctness remains a separate, known failing assertion.
const {replayGoldenRunTrace,verifyGoldenRunLedger}=await imp('src/replay/golden-run.js');
const record=load('src/data/raw/golden/HERC-GOLDEN-RUN-0001_golden_run_record.json');
const script=load('src/data/raw/golden/HERC-GOLDEN-RUN-0001_replay_script_v2_normalized.json');
result.golden_ledger=verifyGoldenRunLedger(record);
try {
  const replay=replayGoldenRunTrace(script), s=replay.state;
  result.golden={phase:s.game.phase,spirit:s.player.spirit,divinity:s.player.divinity,next_event:String(s.rng.nextEvent),checkpoints:replay.checkpoints,terminal_labor_dice:s.currentLabor.laborDice};
  rc('Golden unchanged resource/counter summary',{phase:s.game.phase,spirit:s.player.spirit,divinity:s.player.divinity,next_event:String(s.rng.nextEvent)},{phase:'DEFEAT',spirit:8,divinity:3,next_event:'174'});
  const failed=s.currentLabor.laborDice['labor.L06.C17'];
  rc('ISS-RS-RS-001-003 terminal skull status',failed.status,'active_failure_terminal');
} catch(e) {result.golden_error=String(e.stack);rc('Golden replay execution',false);}
const restriction=start({'game.phase':'IMPACT_RESOLUTION'});
restriction.currentLabor.laborDice['labor.L08.A'].nodeId='L08A.n5';restriction.currentLabor.laborDice['labor.L08.B'].nodeId='L08B.n6';restriction.round.blockedSpirit=1;
const entered=applyContentEffect(restriction,{cannot_block:true},'L08A.n5','labor.L08.A',true);
const restricted=resolveQueuedResources(applyContentEffect(entered,{spirit_delta:-2},'L08B.n6','labor.L08.B',true));
result.cannot_block_probe={expected:{snapshot:false,spirit:9,remaining_block:0},observed:{snapshot:restricted.currentLabor.cannotBlockThisRound,spirit:restricted.player.spirit,remaining_block:restricted.round.blockedSpirit}};
rc('ISS-RS-RS-001-004 non-retroactive snapshot',result.cannot_block_probe.observed,result.cannot_block_probe.expected);
result.changed_artifacts=pins.filter(p=>['game-data','data-schema','rules-spec','execution-spec','test-scenarios','test-fixtures'].includes(p.id)).map(p=>{
  const bytes=gitTextBytes(fs.readFileSync(path.join(repo,p.path)));
  return {id:p.id,path:p.path,before_git_object:p.git_object,after_git_object:gt('hash-object','--path',p.path,p.path),sha256_git_bytes:sha(bytes)};
});
const gp='src/data/generated/game-data.ts',gb=gitTextBytes(fs.readFileSync(path.join(repo,gp)));
result.changed_artifacts.push({id:'generated-data-file',path:gp,before_git_object:gt('rev-parse',`${TESTED_BASE_COMMIT}:${gp}`),after_git_object:gt('hash-object','--path',gp,gp),sha256_git_bytes:sha(gb)});
result.summary={content_contract:result.content_checks.every(c=>c.status==='PASS')?'PASS':'FAIL',
  runtime_regressions:result.runtime_checks.every(c=>c.status==='PASS')?'PASS':'FAIL',
  content_assertions:result.content_checks.length,runtime_assertions:result.runtime_checks.length,
  runtime_failures:result.runtime_checks.filter(c=>c.status==='FAIL').map(c=>c.name),
  independent_validation:'NOT_RUN',engine_edited:false};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
// Exit code describes the content deliverable. Expected runtime discrepancies
// stay explicit FAIL evidence in the report, never become a validation PASS.
if(result.summary.content_contract!=='PASS')process.exitCode=1;

import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
export const RUN='validation-20260914T055055Z-b9a0bf', COMMIT='18440b2637c94807213483a73664d8a2a0f3f366', STEM='orchestration/validation/VAL-004-validation-20260914T055055Z-b9a0bf';
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...a)=>cp.execFileSync('git',a,{windowsHide:true,maxBuffer:64*1024*1024});
const txt=(...a)=>git(...a).toString('utf8').trim();
export function verifyPins(){
 const m=read('orchestration/project_state.json');
 if(m.manifest_revision!=='e1-m0007')throw Error('Manifest changed');
 const old=['historical-engine','replay-implementation','existing-tests','corrected-engine','corrected-replay','corrected-tests'];
 const pins=m.canonical_artifacts.map(p=>{
  const historical=old.includes(p.id), ref=historical?p.source_commit:COMMIT;
  const o=txt('rev-parse',ref+':'+p.path),source=p.source_commit?txt('rev-parse',p.source_commit+':'+p.path):null;
  const hash=p.kind==='blob'?crypto.createHash('sha256').update(git('cat-file','blob',o)).digest('hex'):null;
  const changes=historical?null:txt('status','--porcelain=v1','--untracked-files=all','--ignored','--',p.path);
  const working=historical?null:p.kind==='blob'?txt('hash-object','--',p.path):txt('rev-parse',COMMIT+':'+p.path);
  const members=p.kind==='tree'?txt('ls-tree','-r',ref,'--',p.path).split('\n').map(line=>{const [meta,path]=line.split('\t');return {path,git_object:meta.split(' ')[2],working_object:historical?null:txt('hash-object','--',path)};}):null;
  const matched=o===p.git_object&&(!source||source===o)&&(!p.sha256_git_bytes||hash===p.sha256_git_bytes)&&(historical||(working===o&&changes===''&&(!members||members.every(x=>x.git_object===x.working_object))));
  return {...p,observed_commit:ref,observed_git_object:o,observed_source_object:source,observed_sha256_git_bytes:hash,observed_working_object:working,working_changes:changes,covered_tree_members:members,verification_scope:historical?'superseded historical object only; never executed':'current promoted working input',matched};
 });
 if(pins.length!==49||pins.some(p=>!p.matched))throw Error('Pin mismatch: '+JSON.stringify(pins.filter(p=>!p.matched)));
 verifyPriorEvidence();
 return pins;
}
export function guard(){const t=read('orchestration/tasks/VAL-004.json');if(!process.argv.includes('--check')&&(txt('rev-parse','HEAD')!==COMMIT||t.status!=='in_progress'||t.claim?.run_id!==RUN||Date.now()>=Date.parse(t.claim.expires_at)))throw Error('Claim not current');return t;}

export function verifyPriorEvidence(){
 const m=read('orchestration/project_state.json'),p=m.canonical_artifacts.find(a=>a.id==='val-003-handoff'),h=read(p.path);
 const members=h.changed_artifacts.map(a=>{
  const source=txt('rev-parse',p.source_commit+':'+a.path),working=a.path.startsWith('orchestration/validation/VAL-003-')?txt('hash-object','--',a.path):null;
  const matched=source===a.after_git_object&&(!working||working===source);
  if(!matched)throw Error('Prior evidence changed '+a.path);
  return {path:a.path,source_commit:p.source_commit,expected_git_object:a.after_git_object,source_git_object:source,working_git_object:working,matched};
 });return members;
}

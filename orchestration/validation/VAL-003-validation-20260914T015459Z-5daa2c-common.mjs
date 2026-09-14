import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
export const RUN='validation-20260914T015459Z-5daa2c', COMMIT='3172948a749eac19c17551b4e39624638f8835b6', STEM='orchestration/validation/VAL-003-validation-20260914T015459Z-5daa2c';
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...a)=>cp.execFileSync('git',a,{windowsHide:true,maxBuffer:64*1024*1024});
const txt=(...a)=>git(...a).toString('utf8').trim();
export function verifyPins(){
 const m=read('orchestration/project_state.json');
 if(m.manifest_revision!=='e1-m0005')throw Error('Manifest changed');
 const old=['historical-engine','replay-implementation','existing-tests'];
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
 if(pins.length!==40||pins.some(p=>!p.matched))throw Error('Pin mismatch: '+JSON.stringify(pins.filter(p=>!p.matched)));
 return pins;
}
export function guard(){const t=read('orchestration/tasks/VAL-003.json');if(!process.argv.includes('--check')&&(txt('rev-parse','HEAD')!==COMMIT||t.status!=='in_progress'||t.claim?.run_id!==RUN||Date.now()>=Date.parse(t.claim.expires_at)))throw Error('Claim not current');return t;}

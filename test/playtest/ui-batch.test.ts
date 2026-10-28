import test from 'node:test';
import assert from 'node:assert/strict';
import {HerculesEngine} from '../../src/engine/api.js';
import {createInitialState} from '../../src/engine/state/create.js';
import {startLabor,resolveMood} from '../../src/engine/labor/setup.js';
import {getTracks} from '../../src/engine/labor/content.js';
import {GAME_DATA} from '../../src/data/generated/game-data.js';
import {laborEffectDescription} from '../../src/engine/view-model.js';
import {resultingFace} from '../../src/playtest/choice-labels.js';
import {rewardEffects} from '../../src/playtest/reward-effects.js';
import {makeRoll,sample} from '../../src/playtest/dice/motion.js';
import {rollSettleTime,FINAL_FACE_HOLD_SECONDS} from '../../src/playtest/dice/arena.js';

test('every Blue result image projects the actual engine outcome, including wraps and current-value choices',()=>{
 const seen=new Set<string>();
 for(let face=1;face<=6;face++){
  let s=resolveMood(startLabor(createInitialState('human','choice-images'),'labor.L01'),'mood.ferocious');
  s.player.ownedRewardIds=['reward.L05.A','reward.L06.B','reward.L07.A','reward.L10.A'];
  s=HerculesEngine.submit(s,{type:'ROLL'}).state;s.herculesDice.H1.face=face;
  const before=JSON.stringify(s);
  for(const action of HerculesEngine.getPlayView(s).actions){const c=action.command;
   if((c.type!=='USE_BLUE_ABILITY'&&c.type!=='USE_COWS_A')||c.sourceDieId!=='H1')continue;
   const projected=resultingFace(c,s.herculesDice);if(projected===null)continue;
   const after=HerculesEngine.submit(s,c).state,id=c.type==='USE_COWS_A'?c.targetDieId:c.sourceDieId;
   assert.equal(projected,after.herculesDice[id].face);assert.deepEqual(after.rng,s.rng);
   seen.add(c.type==='USE_COWS_A'?'cows':c.abilityId);
  }
  assert.equal(JSON.stringify(s),before);
 }
 assert.equal(seen.size,7);
 assert.equal(resultingFace({type:'ROLL'},{}),null);
});

test('every branching Labor destination describes all actual effects without backend node IDs',()=>{
 let branches=0;
 for(const labor of GAME_DATA.labors)for(const track of Object.values(getTracks(labor.id)))for(const node of Object.values(track.nodes)){
  if(node.next.length<2)continue;branches++;
  const s=startLabor(createInitialState('human','branches'),labor.id);
  const die=Object.values(s.currentLabor!.laborDice).find(d=>d.trackId===track.id)!;
  s.pendingDecision={id:'review-route',type:'CHOOSE_TRACK_BRANCH',prompt:'Choose route',legalOptions:node.next.map(id=>({id})),source:{kind:'track',id:node.id},context:{laborDieId:die.id,trackId:track.id},allowSkip:false,randomnessOnResolve:false,revealsHiddenInformation:false,undoBarrierOnResolve:false};
  const before=JSON.stringify(s),actions=HerculesEngine.getPlayView(s).actions.filter(a=>a.group==='decision');
  assert.deepEqual(actions.map(a=>a.label),node.next.map((id,i)=>`Route ${i+1}: ${laborEffectDescription(track.nodes[id].effect)}`));
  assert.equal(JSON.stringify(s),before);
 }
 assert.equal(branches,18);
 assert.equal(laborEffectDescription(null),'No effect.');
 assert.match(laborEffectDescription({spirit_delta:-1,heal:1}),/-1 Spirit.*Heal this die 1/);
});

test('compact reward names omit variant letters',()=>{for(const reward of Object.values(rewardEffects))assert(!/ [A-D]$/.test(reward.name));});

test('completion covers every actual trajectory component rather than tip metadata',()=>{
 assert.equal(FINAL_FACE_HOLD_SECONDS,1);
 for(const [w,h] of [[360,640],[390,844],[430,932]])for(let n=1;n<=11;n++)for(let seed=0;seed<8;seed++){
  const r=makeRoll(Array(n).fill(4),w,h-208,seed),end=rollSettleTime(r),final=sample(r,r.duration),done=sample(r,end);
  for(let i=0;i<n;i++){assert(Math.hypot(done[i].x-final[i].x,done[i].y-final[i].y,done[i].z-final[i].z)<1e-6);assert(Math.hypot(...done[i].q.map((v:number,j:number)=>v-final[i].q[j]))<1e-6);}
 }
});

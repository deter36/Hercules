import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoll,sample,topFace,rotate,DURATION,dieSide} from '../../src/playtest/dice/motion.js';
import {committedRoll} from '../../src/playtest/dice/committed-roll.js';
import {committedRollEvent} from '../../src/playtest/dice/committed-roll.js';
import {gameplayLayout} from '../../src/playtest/layout.js';
import {arenaBounds,viewportDieSide,rerollCells,presentationFrame} from '../../src/playtest/dice/arena.js';
import {HerculesEngine} from '../../src/engine/api.js';
import {createInitialState} from '../../src/engine/state/create.js';
import {startLabor,resolveMood} from '../../src/engine/labor/setup.js';
test('full-viewport seeded motion preserves size, bounds, one rebound and prescribed outcomes',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390],[568,320],[240,220]])for(let count=1;count<=11;count++)for(let seed=0;seed<12;seed++){
  const faces=Array.from({length:count},(_,i)=>(i+seed)%6+1),r=makeRoll(faces,w,h,seed);
  assert.equal(r.side,dieSide(w,h));assert(r.bodies.every((d:any)=>d.wallHits===1));assert.equal(r.events.pairs,0);
  assert.deepEqual(sample(r,DURATION).map((d:any)=>topFace(d.q)),faces);assert.deepEqual(makeRoll(faces,w,h,seed),r);
  const different=makeRoll(faces,w,h,seed+1);assert(r.bodies.some((d:any,i:number)=>Math.hypot(d.x-different.bodies[i].x,d.y-different.bodies[i].y)>1));
  for(let t=0;t<=DURATION;t+=.05){const ds=sample(r,t);for(const d of ds){const half=r.side/2,corners=[];for(const x of [-half,half])for(const y of [-half,half])for(const z of [-half,half])corners.push(rotate(d.q,[x,y,z]));const center=d.z+Math.max(...corners.map(v=>-v[2]));for(const v of corners){assert(d.x+v[0]>=0&&d.x+v[0]<=w);const py=d.y+v[1]*.94-(v[2]+center)*.32;assert(py>=0&&py<=h,'visible viewport corners');}}for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)assert(Math.hypot(ds[i].x-ds[j].x,ds[i].y-ds[j].y)>=r.radius*2-.01);}
 }
});
test('presentation consumes mood-adjusted engine faces without touching saves, RNG or undo',()=>{
 const before=resolveMood(startLabor(createInitialState('human','presentation'),'labor.L01'),'mood.melancholic');
 const result=HerculesEngine.submit(before,{type:'ROLL'}),saved=HerculesEngine.serialize(result.state),snapshot=structuredClone(result.state);
 const dice=committedRoll(before,{type:'ROLL'},result.state);assert.equal(dice.length,5);assert.deepEqual(dice.map(d=>d.face),dice.map(d=>result.state.herculesDice[d.id].face));
 makeRoll(dice.map(d=>d.face),390,844,42);assert.deepEqual(result.state,snapshot);assert.deepEqual(HerculesEngine.serialize(HerculesEngine.deserialize(saved)),saved);
 assert.deepEqual(committedRoll(before,{type:'FINISH_BLUE_PHASE'},result.state),[]);
 assert.deepEqual(committedRoll(before,{type:'REROLL_DIE',abilityId:'example',dieId:'H3'},result.state),[{id:'H3',face:result.state.herculesDice.H3.face}]);
 assert.deepEqual(committedRoll(before,{type:'USE_COWS_B',sourceDieId:'H1',rerollDieIds:['H5','H2']},result.state).map(d=>d.id),['H2','H5']);
});
test('actual reroll and Cows B results animate only committed target IDs without extra RNG',()=>{
 let state=resolveMood(startLabor(createInitialState('human','reroll-presentation'),'labor.L01'),'mood.haunted_a');
 state.player.ownedRewardIds=['reward.L02','reward.L05.B'];state=HerculesEngine.submit(state,{type:'ROLL'}).state;
 for(const type of ['REROLL_DIE','USE_COWS_B'] as const){
  const command=HerculesEngine.getPlayView(state).actions.find(a=>a.command.type===type)!.command;
  const before=structuredClone(state),result=HerculesEngine.submit(state,command),snapshot=structuredClone(result.state);
  const dice=committedRoll(before,command,result.state);assert(dice.length>0);
  const ids=command.type==='REROLL_DIE'?[command.dieId]:command.type==='USE_COWS_B'?command.rerollDieIds:[];
  assert.deepEqual(dice.map(d=>d.id),ids);assert.equal(result.state.rng.ledger.length-before.rng.ledger.length,ids.length);
  makeRoll(dice.map(d=>d.face),390,844,991);assert.deepEqual(result.state,snapshot);assert.deepEqual(state,before);state=result.state;
 }
});

test('raw roll, Mood adjustment and Hippolyta presentation come only from committed records',()=>{
 for(const mood of ['mood.enraged','mood.melancholic','mood.ghost_hippolyta'])for(let seed=0;seed<12;seed++){
  const before=resolveMood(startLabor(createInitialState('human',`effects-${seed}`),'labor.L01'),mood);
  before.player.ownedRewardIds=['reward.L02','reward.L05.B'];
  const after=HerculesEngine.submit(before,{type:'ROLL'}).state,snapshot=structuredClone(after),event=committedRollEvent(before,{type:'ROLL'},after)!;
  assert(event.eventId);assert.equal(event.kind,'ROLL');
  for(const die of event.dice){assert.equal(die.rawFace,after.rng.ledger.find(e=>e.purpose.endsWith(`:${die.id}`))!.result);assert.equal(die.face,after.herculesDice[die.id].face);assert.equal(die.setAside,(after.herculesDice[die.id].placement as any)?.kind==='mood_set_aside');}
  if(mood==='mood.enraged'||mood==='mood.melancholic')assert(event.dice.some(d=>d.face!==d.rawFace));
  for(const type of ['REROLL_DIE','USE_COWS_B']){const cmd=HerculesEngine.getPlayView(after).actions.find(a=>a.command.type===type)?.command;if(!cmd)continue;const next=HerculesEngine.submit(after,cmd).state,reroll=committedRollEvent(after,cmd,next)!;assert.equal(reroll.kind,'REROLL');assert(reroll.dice.every(d=>d.rawFace===d.face));assert.notEqual(reroll.eventId,event.eventId);}
  assert.deepEqual(after,snapshot);assert.deepEqual(HerculesEngine.deserialize(HerculesEngine.serialize(after)),after);
 }
});

test('authored row families place every action once without overlapping cells',()=>{
 for(const [labor,count,rows] of [['labor.L06',6,[3,3]],['labor.L10',8,[4,4]],['labor.L11',8,[4,4]],['labor.L08',7,[4,3]],['labor.L09',8,[4,4]],['labor.L12',9,[3,3,3]]] as const){
  const layout=gameplayLayout(labor,count);assert.deepEqual(layout.rows,rows);assert.equal(layout.slots.length,count);const occupied=new Set();for(const slot of layout.slots)for(let col=slot.column;col<slot.column+slot.span;col++){const key=`${slot.row}:${col}`;assert(!occupied.has(key));occupied.add(key);assert(col<=12);}
 }
});

test('bounded arena and local rerolls keep prescribed results and separated projected geometry through every effect',()=>{
 for(const [w,h] of [[390,844],[375,667],[430,932],[360,640]])for(let count=1;count<=11;count++)for(let seed=0;seed<6;seed++){
  const arena=arenaBounds(w,h,104),faces=Array.from({length:count},(_,i)=>(i+seed)%6+1),record=makeRoll(faces,arena.width,arena.height,seed);
  record.side=viewportDieSide(w,h);record.radius=record.side*.89;
  assert.equal(record.side,viewportDieSide(w,h));assert(arena.top>104);assert(arena.top+arena.height<=h-84);
  const dice=faces.map((rawFace,i)=>({id:`H${i+1}`,rawFace,face:seed%2?Math.min(6,rawFace+1):rawFace,setAside:seed%2===0&&rawFace===1}));
  const origins=Object.fromEntries(dice.map((d,i)=>[d.id,{x:50+(i%6)*38,y:h-80+Math.floor(i/6)*38}]));
  const cells=rerollCells(count,arena,record.side,origins,dice.map(d=>d.id));
  for(const kind of ['ROLL','REROLL'] as const)for(const reduced of [false,true]){
   if(kind==='ROLL')Object.assign(record,makeRoll(faces,w,arena.height,seed,record.side));
   else {const side=record.side;Object.assign(record,makeRoll(faces,w,arena.height,seed));record.packed=false;record.side=side;record.radius=side*.89;}
   const event={eventId:'fixture',kind,dice,moodId:null};
   for(let t=0;t<=record.duration+1.7;t+=.07){
    const result=presentationFrame(record,event,t,cells,reduced).dice;
    for(let i=0;i<count;i++){
     const d=result[i];if(d.visible===false)continue;const half=record.side/2,corners=[];for(const x of [-half,half])for(const y of [-half,half])for(const z of [-half,half])corners.push(rotate(d.q,[x,y,z]));const center=d.z+Math.max(...corners.map(v=>-v[2]));
     for(const v of corners){assert(d.x+v[0]>=0&&d.x+v[0]<=arena.width);const py=d.y+v[1]*.94-(v[2]+center)*.32;assert(py>=0&&py<=arena.height,`arena bounds ${w} ${h} ${count} ${kind} ${t}`);}
     for(let j=i+1;j<count;j++)if(result[j].visible!==false)assert(Math.hypot(d.x-result[j].x,d.y-result[j].y)>=record.radius*2-.01,`pair separation ${kind} ${w}x${h} n${count} seed${seed} t${t} reduced${reduced} pair${i}/${j}`);
    }
   }
   const settled=presentationFrame(record,event,record.duration+1.7,cells,reduced).dice;
   assert(settled.every((d:any)=>d.visible!==false));
   assert.deepEqual(settled.map((d:any)=>topFace(d.q)),dice.map(d=>d.face));
   assert.deepEqual(presentationFrame(record,event,1,cells,reduced),presentationFrame(record,event,1,cells,reduced));
  }
 }
});

test('Cows B commits a ten-target group exactly once and leaves source identity intact',()=>{
 let before=createInitialState('human','multi-cows');before.player.persistentHerculesDice=11;
 before=resolveMood(startLabor(before,'labor.L01'),'mood.haunted_a');before.player.ownedRewardIds=['reward.L05.B'];before=HerculesEngine.submit(before,{type:'ROLL'}).state;
 const targets=Array.from({length:10},(_,i)=>`H${i+2}`),command={type:'USE_COWS_B' as const,sourceDieId:'H1',rerollDieIds:targets};
 const after=HerculesEngine.submit(before,command).state,event=committedRollEvent(before,command,after)!;
 assert.equal(after.rng.ledger.length-before.rng.ledger.length,10);assert.deepEqual(event.dice.map(d=>d.id),targets);assert.equal(after.herculesDice.H1.face,before.herculesDice.H1.face);
 assert.throws(()=>HerculesEngine.submit(after,command));assert.deepEqual(HerculesEngine.deserialize(HerculesEngine.serialize(after)),after);
});

test('multi-target Hippolyta rerolls retain committed set-aside flags and stable identities',()=>{
 let sawSetAside=false;
 for(let seed=0;seed<12;seed++){
  let before=createInitialState('human',`hippolyta-group-${seed}`);before.player.persistentHerculesDice=11;
  before=resolveMood(startLabor(before,'labor.L01'),'mood.ghost_hippolyta');before.player.ownedRewardIds=['reward.L05.B'];before=HerculesEngine.submit(before,{type:'ROLL'}).state;
  const available=Object.values(before.herculesDice).filter(d=>!d.spent&&!d.broken&&d.face!==null),source=available[0].id,targets=available.slice(1).map(d=>d.id);
  const command={type:'USE_COWS_B' as const,sourceDieId:source,rerollDieIds:targets},after=HerculesEngine.submit(before,command).state,event=committedRollEvent(before,command,after)!;
  for(const die of event.dice){assert.equal(die.setAside,die.rawFace===1);assert.equal(die.face,die.rawFace);if(die.setAside)sawSetAside=true;}
  assert.deepEqual(event.dice.map(d=>d.id),targets);assert.equal(after.rng.ledger.length-before.rng.ledger.length,targets.length);
 }
 assert(sawSetAside);
});

test('animated die size is independent of count and Forecast content; reduced motion has no tumble',()=>{
 for(const [w,h] of [[360,640],[375,667],[390,844],[430,932]])for(const bottom of [104,118])for(let count=1;count<=11;count++){
  const arena=arenaBounds(w,h,bottom),side=viewportDieSide(w,h),faces=Array.from({length:count},(_,i)=>i%6+1),record=makeRoll(faces,w,arena.height,51);
  assert.equal(side,2*Math.min(32,w/10,(h-224)/23.5));
  record.side=side;
  const event={eventId:'test',kind:'ROLL' as const,moodId:null,dice:faces.map((face,i)=>({id:`H${i+1}`,rawFace:face,face,setAside:false}))};
  assert.deepEqual(presentationFrame(record,event,0,[],true).dice,presentationFrame(record,event,3.5,[],true).dice);
 }
});



test('doubled handful launches together with deterministic contacts and prescribed outcomes',()=>{
 for(const [w,h] of [[360,640],[390,844],[430,932]])for(let count=1;count<=11;count++)for(let seed=0;seed<12;seed++){
  const side=viewportDieSide(w,h),a=makeRoll(Array(count).fill(1),w,h-208,seed,side),b=makeRoll(Array(count).fill(6),w,h-208,seed,side);
  assert.equal(a.side,side);assert.equal(a.duration,3.6);assert(a.bodies.every((d:any)=>d.delay<=.18));
  assert(a.events.walls>0);assert.deepEqual(a,makeRoll(Array(count).fill(1),w,h-208,seed,side));
  for(let i=0;i<count;i++)assert.deepEqual(a.bodies[i].frames.map((f:any)=>[f.x,f.y,f.z]),b.bodies[i].frames.map((f:any)=>[f.x,f.y,f.z]));
  for(let t=0;t<a.duration;t+=1/120){const dice=sample(a,t);for(let i=0;i<dice.length;i++)for(let j=i+1;j<dice.length;j++)assert(Math.hypot(dice[i].x-dice[j].x,dice[i].y-dice[j].y)>=side*1.78-.02,`contact ${w} ${count} ${seed} ${t}`);}
  const final=sample(a,a.duration);assert.equal(final.length,count);assert(final.every((d:any)=>topFace(d.q)===1));
 }
});

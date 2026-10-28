import test from 'node:test';
import assert from 'node:assert/strict';
import {HerculesEngine} from '../../src/engine/api.js';
import {createInitialState} from '../../src/engine/state/create.js';
import {startLabor,resolveMood} from '../../src/engine/labor/setup.js';
import {resultingFace} from '../../src/playtest/choice-labels.js';

const setup=()=>{
 let s=resolveMood(startLabor(createInitialState('human','spent-cup'),'labor.L01'),'mood.haunted_a');
 s.player.ownedRewardIds=['reward.L05.A','reward.L10.A'];
 return HerculesEngine.submit(s,{type:'ROLL'}).state;
};
test('Cup A result images match actual engine outcomes for every face, both spaces and wrap directions',()=>{
 for(const abilityId of ['ability.reward.L10.A.blueA','ability.reward.L10.A.blueB'])for(let face=1;face<=6;face++)for(const delta of [-1,1]){
  const s=setup();s.herculesDice.H1.face=face;
  const cmd={type:'USE_BLUE_ABILITY' as const,abilityId,sourceDieId:'H1',target:delta};
  const before=JSON.stringify(s),label=resultingFace(cmd,s.herculesDice);
  assert.equal(JSON.stringify(s),before);
  const result=HerculesEngine.submit(s,cmd).state;
  assert.equal(label,result.herculesDice.H1.face);
  assert.equal(JSON.stringify(result.rng),JSON.stringify(s.rng));
 }
 assert.equal(resultingFace({type:'ROLL'},{}),null);
});
test('Cows A sacrifice stays unavailable through Gold, reload and undo while ordinary Cup use stays usable',()=>{
 let s=setup();s.herculesDice.H3.face=4;const ledger=JSON.stringify(s.rng);
 s=HerculesEngine.submit(s,{type:'USE_COWS_A',sourceDieId:'H1',targetDieId:'H2',face:6}).state;
 assert(s.herculesDice.H1.spent);assert.equal(s.herculesDice.H1.rollable,false);
 assert(HerculesEngine.getPlayView(s).bluePlacements.some(p=>p.dieIds.includes('H1')));
 assert.equal(HerculesEngine.getLegalTargets(s,['H1']).length,0);
 s=HerculesEngine.submit(s,{type:'USE_BLUE_ABILITY',abilityId:'ability.reward.L10.A.blueA',sourceDieId:'H3',target:1}).state;
 assert(s.herculesDice.H3.blueUsed);assert(!s.herculesDice.H3.spent);
 s=HerculesEngine.submit(s,{type:'FINISH_BLUE_PHASE'}).state;
 assert.equal(s.herculesDice.H1.placement,null);assert(s.herculesDice.H1.spent);
 assert(HerculesEngine.getLegalTargets(s,['H3']).length>0);
 assert.equal(HerculesEngine.getLegalTargets(s,['H1']).length,0);
 s=HerculesEngine.deserialize(HerculesEngine.serialize(s));assert(s.herculesDice.H1.spent);
 assert.equal(JSON.stringify(s.rng),ledger);
 s=HerculesEngine.submit(s,{type:'UNDO_DETERMINISTIC'}).state;
 assert(s.herculesDice.H1.spent);assert(HerculesEngine.getPlayView(s).bluePlacements.some(p=>p.dieIds.includes('H1')));
});

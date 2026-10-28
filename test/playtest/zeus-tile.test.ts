import test from 'node:test';
import assert from 'node:assert/strict';
import {gameplayActionCards,gameplayLayout} from '../../src/playtest/layout.js';
import {HerculesEngine} from '../../src/engine/api.js';
import {createInitialState} from '../../src/engine/state/create.js';
import {startLabor,resolveMood} from '../../src/engine/labor/setup.js';
import {beginRewardChoice} from '../../src/engine/rewards/resolve.js';

test('only Zeus B is removed from action layout, without mutating owned cards',()=>{
 const cards=[{id:'component.bow'},{id:'reward.L08.A'},{id:'reward.L08.B'},{id:'reward.L02'}],before=structuredClone(cards);
 assert.deepEqual(gameplayActionCards(cards).map(c=>c.id),['component.bow','reward.L08.A','reward.L02']);assert.deepEqual(cards,before);
 const dense=Array.from({length:8},(_,i)=>({id:`card${i}`}));dense.push({id:'reward.L08.B'});
 assert.deepEqual(gameplayLayout('labor.L12',gameplayActionCards(dense).length).rows,[4,4]);
});
test('acquiring Zeus B retains the contextual redraw through save, use and undo',()=>{
 let state=resolveMood(startLabor(createInitialState('human','zeus-ui'),'labor.L08'),'mood.haunted_a');
 state.game.phase='REWARD_SELECTION';state=beginRewardChoice(state);
 assert(!state.player.ownedRewardIds.includes('reward.L08.B'));
 const command={type:'CHOOSE_OPTION' as const,decisionId:state.pendingDecision!.id,optionId:'reward.L08.B'};
 state=HerculesEngine.submit(state,command).state;
 assert(state.player.ownedRewardIds.includes('reward.L08.B'));assert.equal(state.pendingDecision?.type,'CHOOSE_ZEUS_REDRAW');
 assert(!gameplayActionCards(HerculesEngine.getPlayView(state).actionCards).some(c=>c.id==='reward.L08.B'));
 state=HerculesEngine.deserialize(HerculesEngine.serialize(state));
 const before=structuredClone(state),ledger=JSON.stringify(state.rng),nextMood=state.mood.deck[0];
 const redraw={type:'CHOOSE_OPTION' as const,decisionId:state.pendingDecision!.id,optionId:'redraw'};
 state=HerculesEngine.submit(state,redraw).state;
 assert.equal(state.mood.activeMoodId,nextMood);assert.equal(JSON.stringify(state.rng),ledger);assert(state.player.ownedRewardIds.includes('reward.L08.B'));
 assert.notEqual(state.pendingDecision?.type,'CHOOSE_ZEUS_REDRAW');assert.throws(()=>HerculesEngine.submit(state,redraw));
 const restored=HerculesEngine.submit(state,{type:'UNDO_DETERMINISTIC'}).state;
 assert.equal(restored.pendingDecision?.type,'CHOOSE_ZEUS_REDRAW');assert.equal(restored.mood.activeMoodId,before.mood.activeMoodId);
});

import type { GameState } from '../../engine/state/types.js';
import type { EngineCommand } from '../../engine/commands/types.js';
export type CommittedDie = { id: string; face: number };
/** Presentation reads final, mood-adjusted state; it never draws or commits RNG. */
export function committedRoll(before: GameState, command: EngineCommand, after: GameState): CommittedDie[] {
 const ids = command.type === 'ROLL' ? Object.values(before.herculesDice).filter(d=>d.rollable&&!d.broken).map(d=>d.id)
  : command.type === 'REROLL_DIE' ? [command.dieId] : command.type === 'USE_COWS_B' ? command.rerollDieIds : [];
 return [...ids].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(id=>({id,face:after.herculesDice[id].face!}));
}

export type PresentedDie = CommittedDie & {rawFace:number;setAside:boolean};
export type CommittedRollEvent = {eventId:string;kind:'ROLL'|'REROLL';dice:PresentedDie[];moodId:string|null};
/** The newly committed ledger is the raw-result authority; never reverse a Mood modifier. */
export function committedRollEvent(before:GameState,command:EngineCommand,after:GameState):CommittedRollEvent|null {
 const dice=committedRoll(before,command,after);if(!dice.length)return null;
 const events=after.rng.ledger.slice(before.rng.ledger.length).filter(e=>e.status==='committed');
 return {eventId:events.map(e=>e.eventIndex).join(':'),kind:command.type==='ROLL'?'ROLL':'REROLL',moodId:after.mood.activeMoodId,dice:dice.map(d=>{
  const event=events.find(e=>e.purpose.endsWith(`:${d.id}`));
  if(!event||!Number.isInteger(event.result)||Number(event.result)<1||Number(event.result)>6)throw Error(`Missing committed raw roll for ${d.id}`);
  return {...d,rawFace:Number(event.result),setAside:(after.herculesDice[d.id].placement as {kind?:string}|null)?.kind==='mood_set_aside'};
 })};
}

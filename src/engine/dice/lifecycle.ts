import type { HerculesDieState } from "../state/types.js";
export function canPlace(die:HerculesDieState):boolean{return die.availableForLabor&&!die.broken&&!die.spent&&!die.locked&&!die.allocated;}
export function resetRound(dice:Record<string,HerculesDieState>):Record<string,HerculesDieState>{return Object.fromEntries(Object.entries(dice).map(([id,die])=>[id,{...die,face:null,rollable:die.availableForLabor&&!die.broken,blueUsed:false,spent:false,locked:false,allocated:false,placement:null}]))}
export function breakDie(die:HerculesDieState):HerculesDieState{return {...die,broken:true,rollable:false,spent:false,locked:false,allocated:false,placement:null};}

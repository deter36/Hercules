import type { HerculesDieState } from "../state/types.js";
export function modifyPip(die:HerculesDieState,delta:number,wrap:boolean):HerculesDieState{if(die.face===null||die.blueUsed)throw new Error("Die must have a face and unused blue ability.");let face=die.face+delta;if(wrap)face=((face-1+6)%6)+1;else face=Math.max(1,Math.min(6,face));return{...die,face,blueUsed:true};}
export function setAny(die:HerculesDieState,value:number):HerculesDieState{if(die.face===null||!Number.isInteger(value)||value<1||value>6)throw new Error("Invalid die target.");return{...die,face:value,blueUsed:true};}
export function cowsBSource(die:HerculesDieState):HerculesDieState{return{...die,blueUsed:true};}

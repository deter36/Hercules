import {sample, targetQ} from './motion.js';
import type {CommittedRollEvent} from './committed-roll.js';
export type Point={x:number;y:number};
export type Arena={width:number;height:number;top:number;left:number};
/** Reserve chrome consistently: pool size and Forecast contents cannot resize dice. */
export const viewportDieSide=(width:number,usableHeight:number)=>2*Math.min(32,width/10,(usableHeight-224)/23.5);
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
/** Layout uses the actual Forecast edge, never a guessed status height. */
export function arenaBounds(viewWidth:number,viewHeight:number,forecastBottom:number,safeBottom=0):Arena {
 const top=Math.ceil(forecastBottom+6),footer=84;
 return {left:0,top,width:viewWidth,height:viewHeight-top-footer-safeBottom};
}
export function rerollCells(count:number,arena:Arena,side:number,origins:Record<string,Point|null>,ids:string[]):Point[]{
 const pitch=side*2.1,margin=side*1.2,columns=Math.min(count,Math.ceil(Math.sqrt(count)),Math.floor((arena.width-margin*2)/pitch)+1),rows=Math.ceil(count/columns);
 if(columns<1||(rows-1)*pitch+margin*2>arena.height)throw Error('Reroll patch cannot fit this viewport');
 const supplied=ids.map(id=>origins[id]).filter((p):p is Point=>!!p);
 const centerX=supplied.length?supplied.reduce((s,p)=>s+p.x-arena.left,0)/supplied.length:arena.width/2;
 const centerY=supplied.length?supplied.reduce((s,p)=>s+p.y-arena.top,0)/supplied.length-side*2:arena.height*.65;
 const left=clamp(centerX-(columns-1)*pitch/2,margin,arena.width-margin-(columns-1)*pitch);
 const top=clamp(centerY-(rows-1)*pitch/2,side*1.9,arena.height-margin-(rows-1)*pitch);
 return ids.map((_,i)=>({x:left+(i%columns)*pitch,y:top+Math.floor(i/columns)*pitch}));
}
function blend(a:number[],b:number[],t:number){const dot=a.reduce((s,v,i)=>s+v*b[i],0),q=a.map((v,i)=>v*(1-t)+b[i]*t*(dot<0?-1:1)),n=Math.hypot(...q);return q.map(v=>v/n);}
/** End at the last physical tip, not the trajectory buffer's padded duration. */
export const rollSettleTime=(record:any)=>Math.min(record.duration,Math.max(...record.bodies.map((d:any)=>d.tipEnd??record.duration)));
export const MOOD_TURN_SECONDS=.22;
export const presentationEnd=(record:any,event:CommittedRollEvent,reduced=false)=>reduced?0:rollSettleTime(record)+(event.dice.some(d=>d.rawFace!==d.face)?MOOD_TURN_SECONDS:0);
/** Pure frame projection. No outcome RNG, DOM, state mutation or accumulated drift. */
export function presentationFrame(record:any,event:CommittedRollEvent,time:number,cells:Point[],reduced:boolean){
 const end=rollSettleTime(record),effect=reduced?1:clamp((time-end)/MOOD_TURN_SECONDS,0,1);
 const asideProgress=reduced||time>=presentationEnd(record,event)?1:0;
 const dice=sample(record,reduced?end:Math.min(time,end));
 dice.forEach((d:any,i:number)=>{
  const prescribed=event.dice[i];
  if(event.kind==='REROLL'){
   const f=record.bodies[i].frames[0],cell=cells[i];
   d.x=cell.x+(d.x-f.x)/record.width*record.side*.25;
   d.y=cell.y+(d.y-f.y)/record.height*record.side*.25;
  }
  if((reduced||time>=end)&&prescribed.rawFace!==prescribed.face)d.q=blend(d.q,targetQ(prescribed.face,record.bodies[i].yaw),effect);
  // Set-aside status is presented by the disabled, marked tray die at handoff.
  // No extra travel or hold after the final value is ready.
 });
 return {dice,asideProgress,effect};
}

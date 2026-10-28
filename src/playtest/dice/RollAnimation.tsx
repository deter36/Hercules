import { useEffect, useRef } from 'react';
import { makeRoll, DURATION, topFace } from './motion.js';
import {arenaBounds,viewportDieSide,rerollCells,presentationFrame,rollSettleTime,presentationEnd,advancePresentationTime,type Point,type Arena} from './arena.js';
import { renderDice } from './renderer.js';
import type { CommittedRollEvent } from './committed-roll.js';
export type RollPresentation = CommittedRollEvent & {seed:number;reducedMotion?:boolean;mode?:'NORMAL'|'FAST'|'INSTANT';origins?:Record<string,{x:number;y:number}|null>};
export function RollAnimation({roll,onComplete}:{roll:RollPresentation;onComplete:()=>void}) {
 const canvasRef=useRef<HTMLCanvasElement>(null),done=useRef(onComplete);
 useEffect(()=>{done.current=onComplete;},[onComplete]);
 useEffect(()=>{
  const canvas=canvasRef.current!,ctx=canvas.getContext('2d'),media=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,time=0,last=performance.now(),record:ReturnType<typeof makeRoll>,finished=false,instant=media.matches||!!roll.reducedMotion||roll.mode==='INSTANT';
  let cells:Point[]=[],arena:Arena,end=DURATION,effectEnd=DURATION,finalPaintPending=false;
  const hasMoodChange=roll.dice.some(d=>d.rawFace!==d.face);
  const finish=()=>{if(!finished){finished=true;cancelAnimationFrame(frame);done.current();}};
  const fail=(error:unknown)=>{console.error('Dice presentation failed; committed state retained',error);finish();};
  const draw=()=>{
   ctx!.clearRect(0,0,record.width,record.height);
   const {dice}=presentationFrame(record,roll,time,cells,instant);
   renderDice(ctx!,record,dice);
   canvas.dataset.faces=dice.map((d:any)=>topFace(d.q)).join(',');canvas.dataset.side=String(record.side);canvas.dataset.time=time.toFixed(3);canvas.dataset.positions=JSON.stringify(dice.map((d:any)=>({x:d.x,y:d.y,z:d.z,q:d.q,visible:d.visible!==false})));canvas.dataset.arena=JSON.stringify(arena);canvas.dataset.duration=String(end);canvas.dataset.effectEnd=String(effectEnd);canvas.dataset.phase=time<end?'roll':time<effectEnd?'mood':'settled';

  };
  const resize=()=>{
   if(finished||!canvas.isConnected)return;
   finalPaintPending=false;
   const forecast=document.querySelector('.forecast-strip')?.getBoundingClientRect();
   const bounds=arenaBounds(window.innerWidth,window.innerHeight,forecast?.bottom??104);
   canvas.parentElement!.style.top=`${bounds.top}px`;
   const rect=canvas.getBoundingClientRect(),width=rect.width,height=rect.height,dpr=Math.min(devicePixelRatio||1,2);
   if(width<240||height<220)throw Error('Viewport too small for the roll arena');
   arena={width,height,top:rect.top,left:rect.left};canvas.width=width*dpr;canvas.height=height*dpr;ctx!.setTransform(dpr,0,0,dpr,0,0);
   const safeTop=document.querySelector(".status-strip")?.getBoundingClientRect().top??0,safeBottom=parseFloat(getComputedStyle(canvas.parentElement!).bottom)||0;
   const side=viewportDieSide(width,window.innerHeight-safeTop-safeBottom);
   const previousEnd=record?end:0;
   record=makeRoll(roll.dice.map(d=>d.rawFace),width,height,roll.seed,roll.kind==='REROLL'?null:side);
   if(roll.kind==='REROLL'){record.side=side;record.radius=side*.89;}
   end=rollSettleTime(record);effectEnd=presentationEnd(record,roll,instant);
   if(previousEnd)time=time>=previousEnd?end+(time-previousEnd):time/previousEnd*end;
   else if(instant)time=effectEnd;
   cells=roll.kind==='REROLL'?rerollCells(roll.dice.length,arena,record.side,roll.origins??{},roll.dice.map(d=>d.id)):[];
   draw();
  };
  const tick=(now:number)=>{if(finished)return;try{const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
   if(!document.hidden&&finalPaintPending){finish();return;}
   if(!document.hidden)time=instant?effectEnd:advancePresentationTime(time,dt,end,effectEnd,roll.mode==='FAST');
   draw();
   if(time>=effectEnd){
    // A changed face must be painted before removing its canvas. The eased final
    // part of the turn provides the visible settle; this adds no timed hold.
    if(hasMoodChange&&!instant){finalPaintPending=true;frame=requestAnimationFrame(tick);}
    else finish();
   }else frame=requestAnimationFrame(tick);
  }catch(error){fail(error);}};
  const preference=()=>{instant=media.matches||!!roll.reducedMotion||roll.mode==='INSTANT';effectEnd=presentationEnd(record,roll,instant);};
  const observer=new ResizeObserver(()=>{try{resize();}catch(error){fail(error);}});
  try{if(!ctx)throw Error('Canvas unavailable');resize();observer.observe(canvas);const forecast=document.querySelector('.forecast-strip');if(forecast)observer.observe(forecast);media.addEventListener('change',preference);frame=requestAnimationFrame(tick);}catch(error){fail(error);}
  return()=>{finished=true;cancelAnimationFrame(frame);observer.disconnect();media.removeEventListener('change',preference);};
 },[roll]);
 return <section className="dice-animation" role="dialog" aria-modal="true" aria-label="Rolling committed dice" data-event-id={roll.eventId} data-raw={roll.dice.map(d=>d.rawFace).join(",")} data-seed={roll.seed} data-prescribed={roll.dice.map(d=>d.face).join(',')}>
  <canvas ref={canvasRef} aria-label="Blue resin dice rolling over the game"/>
  <span className="roll-accessible-results" role="status">{roll.dice.map(d=>`${d.id}: ${d.rawFace}${d.rawFace!==d.face?` to ${d.face} (Mood)`:''}${d.setAside?' / set aside':''}`).join(' | ')}</span>
 </section>;
}

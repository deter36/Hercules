import { useEffect, useRef, useState } from 'react';
import { makeRoll, sample, DURATION, topFace } from './motion.js';
import {arenaBounds,viewportDieSide,rerollCells,presentationFrame,type Point,type Arena} from './arena.js';
import { renderDice } from './renderer.js';
import type { CommittedRollEvent } from './committed-roll.js';
export type RollPresentation = CommittedRollEvent & {seed:number;reducedMotion?:boolean;mode?:'NORMAL'|'FAST'|'INSTANT';origins?:Record<string,{x:number;y:number}|null>};
export function RollAnimation({roll,onComplete}:{roll:RollPresentation;onComplete:()=>void}) {
 const canvasRef=useRef<HTMLCanvasElement>(null),done=useRef(onComplete),paused=useRef(false),skip=useRef(false);
 const [isPaused,setPaused]=useState(false),[stage,setStage]=useState('Rolling'),[failure,setFailure]=useState(false);
 useEffect(()=>{done.current=onComplete;},[onComplete]);
 useEffect(()=>{
  const canvas=canvasRef.current!,ctx=canvas.getContext('2d'),media=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,time=0,last=performance.now(),record:ReturnType<typeof makeRoll>,finished=false,instant=media.matches||!!roll.reducedMotion||roll.mode==='INSTANT';
  let cells:Point[]=[],arena:Arena;
  const changed=roll.dice.some(d=>d.rawFace!==d.face),aside=roll.dice.some(d=>d.setAside);
  if(instant)time=DURATION-.5;
  const effectEnd=DURATION+(changed?.65:0)+(aside?.55:0)+.5;
  const finish=()=>{if(!finished){finished=true;cancelAnimationFrame(frame);done.current();}};
  const fail=(error:unknown)=>{console.error('Dice presentation failed; committed state retained',error);setFailure(true);setStage('Committed results');cancelAnimationFrame(frame);};
  const draw=()=>{
   ctx!.clearRect(0,0,record.width,record.height);
   const {dice,asideProgress}=presentationFrame(record,roll,time,cells,instant);
   renderDice(ctx!,record,dice);
   ctx!.font='bold 10px system-ui';ctx!.textAlign='center';ctx!.fillStyle='#ffe1a4';
   dice.forEach((d:any,i:number)=>{const prescribed=roll.dice[i];if(time>=DURATION&&prescribed.rawFace!==prescribed.face)ctx!.fillText(`${prescribed.rawFace} to ${prescribed.face}`,d.x,d.y+record.side*.75);if(prescribed.setAside&&asideProgress>0){ctx!.strokeStyle='#ffd59b';ctx!.strokeRect(d.x-record.side*.65,d.y-record.side,record.side*1.3,record.side*1.7);ctx!.fillText('Set aside',d.x,d.y+record.side*.95);}});
   canvas.dataset.faces=dice.map((d:any)=>topFace(d.q)).join(',');canvas.dataset.side=String(record.side);canvas.dataset.time=time.toFixed(3);canvas.dataset.positions=JSON.stringify(dice.map((d:any)=>({x:d.x,y:d.y,z:d.z,q:d.q})));canvas.dataset.arena=JSON.stringify(arena);
   setStage(time<DURATION?'Rolling':time<DURATION+(changed?.65:0)?'Mood adjustment':aside&&asideProgress>0?'Set aside':'Committed results');
  };
  const resize=()=>{
   const forecast=document.querySelector('.forecast-strip')?.getBoundingClientRect();
   const bounds=arenaBounds(window.innerWidth,window.innerHeight,forecast?.bottom??104);
   canvas.parentElement!.style.top=`${bounds.top}px`;
   const rect=canvas.getBoundingClientRect(),width=rect.width,height=rect.height,dpr=Math.min(devicePixelRatio||1,2);
   if(width<240||height<220)throw Error('Viewport too small for the roll arena');
   arena={width,height,top:rect.top,left:rect.left};canvas.width=width*dpr;canvas.height=height*dpr;ctx!.setTransform(dpr,0,0,dpr,0,0);
   const safeTop=document.querySelector(".status-strip")?.getBoundingClientRect().top??0,safeBottom=parseFloat(getComputedStyle(canvas.parentElement!).bottom)||0;
   record=makeRoll(roll.dice.map(d=>d.rawFace),width,height,roll.seed,viewportDieSide(width,window.innerHeight-safeTop-safeBottom));
   cells=roll.kind==='REROLL'?rerollCells(roll.dice.length,arena,record.side,roll.origins??{},roll.dice.map(d=>d.id)):[];
   draw();
  };
  const tick=(now:number)=>{if(finished)return;try{const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!document.hidden&&!paused.current){if((instant||skip.current)&&time<DURATION-.5)time=DURATION-.5;time=Math.min(effectEnd,time+dt*(roll.mode==='FAST'?2:1));}draw();if(time===effectEnd)finish();else frame=requestAnimationFrame(tick);}catch(error){fail(error);}};
  const preference=()=>{instant=media.matches||!!roll.reducedMotion||roll.mode==='INSTANT';};
  const observer=new ResizeObserver(()=>{try{resize();}catch(error){fail(error);}});
  try{if(!ctx)throw Error('Canvas unavailable');resize();observer.observe(canvas);const forecast=document.querySelector('.forecast-strip');if(forecast)observer.observe(forecast);media.addEventListener('change',preference);frame=requestAnimationFrame(tick);}catch(error){fail(error);}
  return()=>{finished=true;cancelAnimationFrame(frame);observer.disconnect();media.removeEventListener('change',preference);};
 },[roll]);
 return <section className="dice-animation" role="dialog" aria-modal="true" aria-label="Rolling committed dice" data-event-id={roll.eventId} data-raw={roll.dice.map(d=>d.rawFace).join(",")} data-seed={roll.seed} data-prescribed={roll.dice.map(d=>d.face).join(',')}>
  <canvas ref={canvasRef} aria-label="Blue resin dice rolling over the game"/>
  <div className="roll-explanation" role="status"><b>{stage}{stage==='Mood adjustment'?` (${roll.moodId?.replace('mood.','').replaceAll('_',' ')})`: ''}</b>{stage!=='Rolling'&&<span className="roll-accessible-results">{roll.dice.map(d=>`${d.id}: ${d.rawFace}${d.rawFace!==d.face?` to ${d.face} (Mood)`:''}${d.setAside?' / set aside':''}`).join(' | ')}</span>}</div>
  <div className="dice-animation-controls"><button onClick={()=>{paused.current=!paused.current;setPaused(paused.current);}}>{isPaused?'Resume roll':'Pause roll'}</button><button onClick={()=>{if(failure){done.current();return;}skip.current=true;paused.current=false;setPaused(false);}}>Show result</button></div>
 </section>;
}

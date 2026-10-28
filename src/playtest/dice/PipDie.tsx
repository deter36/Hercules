import { renderFlatFace } from './renderer.js';

// Seven shared images, rendered once per document. No animation loop or per-slot canvas.
const faceImages = new Map<number, string>();
function imageFor(face: number | null): string {
 const key=face??0,existing=faceImages.get(key);if(existing)return existing;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const context=canvas.getContext('2d');if(!context)return '';
 renderFlatFace(context,face,128);
 const image=canvas.toDataURL('image/png');faceImages.set(key,image);return image;
}
export function dieDescription(face:number|null,state='',rolledFace?:number):string {
 return `${face===null?'Unrolled die':`Die ${face}`}${state?`, ${state}`:''}${rolledFace!==undefined&&face!==null&&rolledFace!==face?`, changed from rolled ${rolledFace}`:''}`;
}
export function PipDie({face,state='',rolledFace,decorative=false}:{face:number|null;state?:string;rolledFace?:number;decorative?:boolean}) {
 const label=dieDescription(face,state,rolledFace);
 return <span className="pip-die" data-face={face??'unrolled'} data-die-state={state} role={decorative?undefined:'img'} aria-label={decorative?undefined:label} aria-hidden={decorative||undefined} title={label}>
  <img src={imageFor(face)} alt="" draggable={false}/>
  {face===null&&<span className="pip-unknown">?</span>}
 </span>;
}

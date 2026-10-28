// @ts-nocheck
import {rotate} from './motion.js';

// Rounded-box mesh: a six-percent-of-side fillet, with broad planar faces.
// Adjacent patches share exactly the same rounded coordinates; this is geometry,
// not rounded rectangles painted over the original sharp silhouette.
export const BEVEL=.12;
export const FACE_FRAMES=[
 {n:[0,0,1],u:[1,0,0],v:[0,1,0],value:1},
 {n:[0,-1,0],u:[1,0,0],v:[0,0,1],value:2},
 {n:[1,0,0],u:[0,1,0],v:[0,0,1],value:3},
 {n:[-1,0,0],u:[0,-1,0],v:[0,0,1],value:4},
 {n:[0,1,0],u:[-1,0,0],v:[0,0,1],value:5},
 {n:[0,0,-1],u:[-1,0,0],v:[0,1,0],value:6}
];
const PIPS={1:[[0,0]],2:[[-.45,-.45],[.45,.45]],3:[[-.45,-.45],[0,0],[.45,.45]],4:[[-.45,-.45],[.45,-.45],[-.45,.45],[.45,.45]],5:[[-.45,-.45],[.45,-.45],[0,0],[-.45,.45],[.45,.45]],6:[[-.45,-.5],[.45,-.5],[-.45,0],[.45,0],[-.45,.5],[.45,.5]]};
const c=1-BEVEL,grid=[-1,-c-BEVEL*.65,-c-BEVEL*.3,-c,c,c+BEVEL*.3,c+BEVEL*.65,1];
export function local(f,a,b,depth=1){return f.n.map((n,i)=>n*depth+f.u[i]*a+f.v[i]*b);}
function round(p){const inner=p.map(x=>Math.max(-c,Math.min(c,x))),delta=p.map((x,i)=>x-inner[i]),len=Math.hypot(...delta);return inner.map((x,i)=>x+BEVEL*delta[i]/len);}
export const MESH=FACE_FRAMES.flatMap(f=>grid.slice(0,-1).flatMap((a,i)=>grid.slice(0,-1).map((b,j)=>{
 const points=[[a,b],[grid[i+1],b],[grid[i+1],grid[j+1]],[a,grid[j+1]]].map(([x,y])=>round(local(f,x,y)));
 const center=points[0].map((_,k)=>points.reduce((s,p)=>s+p[k],0)/4),normal=center.map(x=>x-Math.max(-c,Math.min(c,x))),len=Math.hypot(...normal);
 return {points,normal:normal.map(x=>x/len),center,face:f,flat:i===3&&j===3};
})));
// Low-frequency, body-fixed three-dimensional field: cloudy resin, no white veins.
export function marble(p){const [x,y,z]=p,warp=Math.sin(x*3.1+y*2.4-z*2.8)*.7;return .5+.24*Math.sin(x*4.2+y*2.8+z*3.5+warp)+.12*Math.sin(y*9-z*4+x*3+warp*2)+.06*Math.sin(x*18+y*12-z*6);}
let textures;
function getTextures(){if(textures)return textures;textures=FACE_FRAMES.map(f=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const context=canvas.getContext('2d'),im=context.createImageData(96,96);for(let y=0;y<96;y++)for(let x=0;x<96;x++){const v=marble(local(f,(x/95*2-1)*c,(y/95*2-1)*c)),i=(y*96+x)*4;im.data[i]=7+v*13;im.data[i+1]=28+v*37;im.data[i+2]=53+v*40;im.data[i+3]=255;}context.putImageData(im,0,0);return canvas;});return textures;}
function polygon(ctx,points,fill,seam=false){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(seam){ctx.strokeStyle=fill;ctx.lineWidth=.55;ctx.lineJoin='round';ctx.stroke();}}
export function renderDice(ctx,roll,ds){const h=roll.side/2,textures=getTextures();
 const project=(d,v)=>[d.x+v[0]*h,d.y+v[1]*h*.94-(v[2]*h+d.center)*.32];
 for(const d of ds){const r0=rotate(d.q,[1,0,0]),r1=rotate(d.q,[0,1,0]),r2=rotate(d.q,[0,0,1]);d.rot=p=>r0.map((v,k)=>v*p[0]+r1[k]*p[1]+r2[k]*p[2]);
  const support=h*(c*(Math.abs(r0[2])+Math.abs(r1[2])+Math.abs(r2[2]))+BEVEL);d.center=support+d.z;
  ctx.save();ctx.filter=`blur(${4+d.z*.18}px)`;ctx.fillStyle=`rgba(0,0,0,${.48/(1+d.z/80)})`;ctx.beginPath();ctx.ellipse(d.x+5,d.y+6,h*(1.08+d.z/180),h*.72,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 const patches=[];for(const d of ds)for(const m of MESH){const n=d.rot(m.normal);if(n[2]+.34*n[1]<=0)continue;const center=d.rot(m.center);patches.push({d,m,n,points:m.points.map(p=>project(d,d.rot(p))),depth:d.y*.34+d.center+h*(center[2]+center[1]*.34)});}
 patches.sort((a,b)=>a.depth-b.depth);
 for(const {d,m,n,points} of patches){const light=Math.max(0,-n[0]*.35-n[1]*.45+n[2]*.82),sheen=Math.pow(Math.max(0,-n[0]*.24-n[1]*.10+n[2]*.96),22),v=marble(m.center),bright=.48+.65*light;
  const color=`rgb(${(7+v*13)*bright+sheen*32} ${(28+v*37)*bright+sheen*40} ${(53+v*40)*bright+sheen*42})`;
  polygon(ctx,points,color,true);
  if(!m.flat)continue;
  ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip();const a=points[0],b=points[1],e=points[3];ctx.transform((b[0]-a[0])/96,(b[1]-a[1])/96,(e[0]-a[0])/96,(e[1]-a[1])/96,a[0],a[1]);ctx.drawImage(textures[m.face.value-1],0,0);ctx.fillStyle=`rgba(0,8,22,${Math.max(0,1-bright)})`;ctx.fillRect(0,0,96,96);const gloss=ctx.createLinearGradient(0,0,96,96);gloss.addColorStop(0,`rgba(134,193,212,${.04+sheen*.19})`);gloss.addColorStop(.55,'rgba(66,111,141,0)');gloss.addColorStop(1,'rgba(0,9,25,.10)');ctx.fillStyle=gloss;ctx.fillRect(0,0,96,96);ctx.restore();
  for(const [u,v] of PIPS[m.face.value]){const ring=(radius,offset=0)=>Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;return project(d,d.rot(local(m.face,u+Math.cos(a)*radius,v+Math.sin(a)*radius+offset,1.001)));});
   polygon(ctx,ring(.229218),'#071525');const inner=ring(.188232),center=project(d,d.rot(local(m.face,u,v,1.002))),g=ctx.createLinearGradient(center[0]-h*.12144,center[1]-h*.18216,center[0]+h*.12144,center[1]+h*.18216);g.addColorStop(0,'#97651e');g.addColorStop(.38,'#c99538');g.addColorStop(.8,'#e4ba61');g.addColorStop(1,'#f3d28a');polygon(ctx,inner,g);
  }
 }
}

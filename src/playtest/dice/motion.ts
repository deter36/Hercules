// @ts-nocheck
// Presentation-only. No game imports, entropy, storage, network, or callbacks to gameplay.
export const DURATION=3.6, DT=1/120;
export const mul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
export const inv=q=>[-q[0],-q[1],-q[2],q[3]];
export function axis(v,a){let n=Math.hypot(...v);return n?v.map(x=>x/n*Math.sin(a/2)).concat(Math.cos(a/2)):[0,0,0,1];}
export function rotate(q,v){return mul(mul(q,[...v,0]),inv(q)).slice(0,3);}
export const normals=[[0,0,1],[0,-1,0],[1,0,0],[-1,0,0],[0,1,0],[0,0,-1]];
export function targetQ(face,yaw=0){const n=normals[face-1];const a=face===6?axis([1,0,0],Math.PI):axis([n[1],-n[0],0],Math.acos(n[2]));return mul(axis([0,0,1],yaw),a);}
export function topFace(q){return 1+normals.map(n=>rotate(q,n)[2]).reduce((best,z,i,a)=>z>a[best]?i:best,0);}
export function validateFaces(faces){if(!Array.isArray(faces)||faces.length<1||faces.length>11||faces.some(f=>!Number.isInteger(f)||f<1||f>6))throw Error('Use 1–11 Hercules d6 values, each 1–6.');return [...faces];}
export function seeded(seed){let state=seed>>>0;return()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};}
export const dieSide=(width,height=700)=>Math.min(32,width/10,(height-16)/23.5);
export const minimumTableHeight=()=>220;
export function makeRoll(input,width,height,seed=0,fixedSide:number|null=null){
 // Consistent left-side launch in both portrait and landscape.
 const faces=validateFaces(input), horizontal=true, cross=height;
 const side=fixedSide??dieSide(width,height), radius=side*.89;
 if(side<=0)throw Error('Invalid dice size');
 const grouped=(height-side*2.77)/faces.length < radius*2;
 const margin=side*.92, bounds={l:margin,r:width-margin,t:side*1.85,b:height-margin};
 if(width<240||height<220)throw Error('Review surface must be at least 240 × 220.');
 if(height<minimumTableHeight(width,faces.length))throw Error('Table needs more vertical room for full-size dice.');
 const random=seeded(seed),pitch=(bounds.b-bounds.t)/faces.length,gap=Math.max(0,pitch-radius*2);
 // Separate bounded corridors preserve clearance even when launch timing differs.
 // Dense pools intentionally have less vertical freedom than sparse pools.
 const slots=Array.from({length:faces.length},(_,i)=>i);for(let i=slots.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
 const bodies=faces.map((face,i)=>{const lane=(slots[i]+.5)/faces.length,along=.008+random()*.065;
  return {face,x:bounds.l+(bounds.r-bounds.l)*along,y:bounds.t+(bounds.b-bounds.t)*lane+(random()-.5)*gap*.28,vx:width*(1.13+random()*.15),vy:(random()-.5)*Math.min(gap*.16,width*.15),z:9+random()*12,vz:90+random()*55,q:[0,0,0,1],frames:[],wallHits:0,restitution:.18+random()*.25,delay:random()*.18,spin:1.04+random()*.52,spinX:(random()-.5)*2.4,spinZ:(random()-.5)*2.6,yaw:random()*Math.PI*2};});
 // A two-column handful uses the actual table area. All bodies begin together;
 // rear dice can transfer momentum into front dice instead of waiting for an aisle.
 if(grouped){
  const rows=Math.ceil(faces.length/2),pitch=side*1.9;
  const vertical=(bounds.b-bounds.t)/(rows-1);
  if(vertical<radius*2||bounds.l+pitch>bounds.r)throw Error('Fixed-size handful cannot fit this viewport');
  bodies.forEach((d,i)=>{const slot=slots[i],row=Math.floor(slot/2),col=slot%2;
   d.x=bounds.l+side*.04+col*pitch;d.y=bounds.t+row*vertical;
   d.vx=width*(1.20+random()*.08);d.vy=(random()-.5)*side*.18;
  });
 }
 // Fold initial positions into small screens and separate conservatively below.
 let walls=0, pairs=0;
 const clampBody=d=>{for(const [p,v,lo,hi] of [['x','vx',bounds.l,bounds.r],['y','vy',bounds.t,bounds.b]]){if(d[p]<lo||d[p]>hi){d[p]=Math.max(lo,Math.min(hi,d[p]));if((d[p]===lo&&d[v]<0)||(d[p]===hi&&d[v]>0)){d[v]*=-d.restitution;walls++;d.wallHits++;}}}};
 for(let k=0;k<=Math.round(DURATION/DT);k++){
  const t=k*DT, envelope=Math.pow(Math.max(0,1-t/DURATION),1.4);
  for(const d of bodies){
   if(k&&t>d.delay){d.x+=d.vx*DT;d.y+=d.vy*DT;const speed=Math.hypot(d.vx,d.vy),loss=(horizontal?width:height)*.48*DT,friction=Math.max(0,1-loss/(speed||1));d.vx*=friction;d.vy*=friction;
    // Finite-duration friction: velocity reaches zero continuously.
    if(t>DURATION-.65){const f=Math.max(0,(DURATION-t)/(DURATION-t+DT));d.vx*=f*f;d.vy*=f*f;}
    d.vz-=950*DT;d.z+=d.vz*DT;if(d.z<0){d.z=0;d.vz=Math.abs(d.vz)>32?-d.vz*.36:0;}
    const omega=[-d.vy/side+d.spinX*Math.max(0,1-t/2),d.vx/side,d.spinZ*Math.max(0,1-t/2)];
    d.q=mul(axis(omega,Math.hypot(...omega)*DT*d.spin),d.q);
   }clampBody(d);
  }
  // Conservative circumscribed-disk contacts; no stacking or interpenetration.
  for(let pass=0;pass<12;pass++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   const a=bodies[i],b=bodies[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),need=radius*2;
   if(dist<need-.001){const nx=dist?dx/dist:1,ny=dist?dy/dist:0,over=(need-dist)/2+.001;
    a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;
    const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
    if(closing<0){const impulse=-closing*.72;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;pairs++;}
    clampBody(a);clampBody(b);
   }
  }
  for(const d of bodies)d.frames.push({x:d.x,y:d.y,z:d.z,q:[...d.q]});
 }
 for(const [i,d] of bodies.entries()){
  // Constant body-space orientation chosen BEFORE playback. It is never changed
  // at a landing, and pips remain welded to the same six physical faces.
  let stopIndex=1;for(let k=1;k<d.frames.length;k++)if(Math.hypot(d.frames[k].x-d.frames[k-1].x,d.frames[k].y-d.frames[k-1].y)>.002)stopIndex=k;
  const tipDuration=.20, startIndex=Math.max(1,stopIndex-Math.round(tipDuration/DT));
  const yaw=d.yaw, target=targetQ(d.face,yaw), tipAxis=[Math.cos(yaw),Math.sin(yaw),0], angle=.65;
  const tipped=mul(axis(tipAxis,angle),target), correction=mul(inv(d.frames[startIndex].q),tipped);
  for(let k=0;k<d.frames.length;k++){
   const frame=d.frames[k],t=k*DT;
   if(k<=startIndex)frame.q=mul(frame.q,correction);
   else {const u=Math.min(1,(t-startIndex*DT)/tipDuration);const theta=u<1?angle*(1-.35*u-.65*u*u):0;
    frame.q=mul(axis(tipAxis,theta),target);
   }
  }
  d.tipStart=startIndex*DT;d.tipEnd=d.tipStart+tipDuration;
 }
 return {seed:seed>>>0,faces,width,height,side,radius,bounds,bodies,events:{walls,pairs},duration:DURATION,packed:grouped,grouped};
}
export function sample(roll,t){const s=Math.max(0,Math.min(DURATION,t))/DT,k=Math.min(roll.bodies[0].frames.length-2,Math.floor(s)),f=Math.min(1,s-k);return roll.bodies.map(d=>{const a=d.frames[k],b=d.frames[k+1];let q=a.q.map((v,i)=>v+(b.q[i]-v)*f);const n=Math.hypot(...q);q=q.map(v=>v/n);return {face:d.face,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,q};});}

// Full-game reward presentation. The engine owns award, removal and Mood state.
const seam = [[60,0],[54,14],[58,17],[46,33],[52,35],[40,53],[45,52],[41,65],[48,63],[33,86],[41,82],[32,100]];
const points = seam.map(([x,y]) => `${x}% ${y}%`).join(',');
let splitLayer;
const intervalFor = (instant,fast,ms) => instant || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.round(ms * (fast ? .38 : 1));

export function splitBoard(instant,fast) {
  const duration = intervalFor(instant,fast,1070);
  const board = document.querySelector('.boar-board');
  if (!duration || !board || splitLayer) return;
  const rect = board.getBoundingClientRect();
  if (rect.height < 10 || rect.width < 10) return;
  const holder = document.createElement('div');
  holder.className = 'rw-split';
  holder.inert = true;
  holder.setAttribute('aria-hidden','true');
  holder.style.setProperty('--split-ms', duration+'ms');
  Object.assign(holder.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
  for (const [side,polygon] of [['left',`0 0,${points},0 100%`],['right',`100% 0,${points},100% 100%`]]) {
    const half = document.createElement('div');
    half.className = 'rw-half rw-half-'+side;
    half.style.clipPath = `polygon(${polygon})`;
    const copy = board.cloneNode(true);
    copy.classList.remove('resolution-board');
    copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    copy.querySelectorAll('.board-controls,.board-info,.labor-contrast-review').forEach(el=>el.remove());
    Object.assign(copy.style,{position:'absolute',inset:'0',width:'100%',height:'100%',maxWidth:'unset',transform:'none',margin:'0'});
    half.append(copy);
    holder.append(half);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 100 100');
  svg.setAttribute('preserveAspectRatio','none');
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d','M '+seam.map(p=>p.join(' ')).join(' L '));
  path.setAttribute('pathLength','1');
  path.setAttribute('vector-effect','non-scaling-stroke');
  svg.append(path);
  holder.append(svg);
  splitLayer=holder;
  document.body.append(holder);
  document.documentElement.classList.add('rw-cracking');
  const block = e => {
    if (e.key==='Tab' || e.key==='Enter' || e.key===' ') e.preventDefault();
  };
  document.addEventListener('keydown',block,true);
  setTimeout(()=>{
    holder.remove();
    document.documentElement.classList.remove('rw-cracking');
    document.removeEventListener('keydown',block,true);
    splitLayer=null;
    const modal=document.querySelector('.rw-sheet');
    if(modal && (document.activeElement===document.body || !document.activeElement?.isConnected)) modal.focus({preventScroll:true});
  },duration+55);
}

const fileFor = (manifest,id) => manifest[id]?.file ? '/Hercules/previews/boar-bow/'+manifest[id].file : null;
const prefetched=new Map();
export function preload(manifest,ids) {
  for(const id of ids) {
    const url=fileFor(manifest,id);
    if(!url||prefetched.has(url)) continue;
    const image=new Image();
    prefetched.set(url,image);
    if(prefetched.size>12) prefetched.delete(prefetched.keys().next().value);
    image.onload=()=>{image.decode?.().catch(()=>{});};
    image.src=url;
  }
}
export function makeRewardReveal(React,{jsx,jsxs}) {
  function Card({reward,chosen,acquiring,onSelect,onHelp,isSingle,blocked}) {
    const [failed,setFailed]=React.useState(!reward.url);
    const gesture=React.useRef(null), suppress=React.useRef(false);
    function cancel() {
      if(gesture.current) clearTimeout(gesture.current.timer);
      gesture.current=null;
    }
    React.useEffect(()=>cancel,[]);
    return jsxs('button',{
      className:'rw-card'+(chosen?' rw-chosen':'')+(failed?' rw-missing':''),
      type:'button', disabled:blocked,
      'data-reward':reward.id, 'aria-label':reward.label,
      'aria-keyshortcuts':'F1 ?', 'aria-pressed':isSingle?undefined:chosen,
      onContextMenu:e=>e.preventDefault(),
      onPointerDown:e=>{
        if(!e.isPrimary||e.button!==0||acquiring)return;
        cancel(); suppress.current=false;
        gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,timer:setTimeout(()=>{
          suppress.current=true;onHelp(reward.id);
        },460)};
      },
      onPointerMove:e=>{
        const g=gesture.current;
        if(g?.id===e.pointerId&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>12){suppress.current=true;cancel();}
      },
      onPointerUp:cancel,onPointerCancel:()=>{suppress.current=true;cancel();},onPointerLeave:cancel,
      onClick:e=>{
        if(e.detail&&suppress.current){suppress.current=false;e.preventDefault();return;}
        if(!isSingle)onSelect(reward.id);else if(!e.detail)onHelp(reward.id);
      },
      onKeyDown:e=>{if(e.key==='?'||e.key==='F1'){e.preventDefault();onHelp(reward.id);}},
      children:failed?jsxs('span',{className:'rw-fallback',children:[jsx('strong',{children:reward.label}),jsx('span',{children:reward.detail})]}):jsx('img',{src:reward.url,alt:'',draggable:false,onError:()=>setFailed(true)})
    });
  }
  return function RewardReveal({rewards,selected,onSelect,onConfirm,one,instant,fast}) {
    const [help,setHelp]=React.useState(null),[acquire,setAcquire]=React.useState(false);
    const locked=React.useRef(false),timer=React.useRef(null),panel=React.useRef(null);
    // Never commit on unmount: reloading before animation finishes returns to the pending choice.
    React.useEffect(()=>{if(!document.documentElement.classList.contains('rw-cracking'))paramFocus();return()=>clearTimeout(timer.current);},[]);
    function paramFocus(){if(document.activeElement===document.body||!document.activeElement?.isConnected)panel.current?.focus({preventScroll:true});}
    function confirm(){
      if(locked.current || (!one&&!selected))return;
      locked.current=true;setHelp(null);
      if(one){onConfirm();return;}
      const ms=intervalFor(instant,fast,465);
      if(!ms){onConfirm();return;}
      setAcquire(true);
      timer.current=setTimeout(onConfirm,ms);
    }
    const helper=rewards.find(r=>r.id===help);
    return jsxs('section',{
      className:'rw-sheet rw-count-'+rewards.length+(acquire?' rw-acquiring':''),
      role:'dialog','aria-modal':true,'aria-label':one?'Reward gained':'Choose a reward',
      ref:panel,tabIndex:-1,
      style:{'--acquire-ms':Math.max(1,intervalFor(instant,fast,465))+'ms'},
      onKeyDown:e=>{if(e.key==='Escape'&&help){e.stopPropagation();setHelp(null);}},
      onPointerDown:e=>{if(!e.target.closest('.rw-card,.rw-helper'))setHelp(null);},
      children:[
        jsx('div',{className:'rw-grid',children:rewards.map(reward=>jsx(Card,{
          reward,chosen:!one&&selected===reward.id,acquiring:acquire,blocked:acquire,isSingle:one,
          onSelect:id=>{setHelp(null);onSelect(id);},
          onHelp:id=>setHelp(v=>v===id?null:id)
        },reward.id))}),
        helper&&jsxs('aside',{className:'rw-helper',role:'status',children:[
          jsx('strong',{children:helper.label}),jsx('p',{children:helper.detail}),
          jsx('button',{type:'button','aria-label':'Close reward details',onClick:()=>setHelp(null),children:'×'})
        ]}),
        jsx('footer',{className:'rw-controls',children:jsx('button',{type:'button',onClick:confirm,disabled:acquire||(!one&&!selected),children:one?'Continue':'Confirm Reward'})})
      ]
    });
  };
}

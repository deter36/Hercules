// UI only: no changes to mood draws, their choices, or the save.
export function makeMoodReveal(React,{jsx,jsxs}) {
  function useGameplayTop(panel){
    React.useLayoutEffect(()=>{
      const host=panel.current;
      const status=host?.closest('.gameplay-shell')?.querySelector('.status-strip') ?? document.querySelector('.status-strip');
      if(!host||!status)return;
      const place=()=>host.style.setProperty('--mood-gameplay-top',Math.ceil(status.getBoundingClientRect().bottom)+'px');
      place();
      const resize=new ResizeObserver(place);
      resize.observe(status);
      addEventListener('resize',place);
      window.visualViewport?.addEventListener('resize',place);
      return()=>{resize.disconnect();removeEventListener('resize',place);window.visualViewport?.removeEventListener('resize',place);};
    },[panel]);
  }
  return function MoodReveal({url,title,detail,choices,instant=false,fast=false,inspect=false,onClose}) {
    const panel=React.useRef(null);
    const card=React.useRef(null);
    const gesture=React.useRef(null);
    const suppress=React.useRef(false);
    const [help,setHelp]=React.useState(false);
    const [failed,setFailed]=React.useState(!url);
    useGameplayTop(panel);
    function cancel() {
      if(gesture.current)clearTimeout(gesture.current.timer);
      gesture.current=null;
    }
    React.useEffect(()=>{
      panel.current?.focus({preventScroll:true});
      return cancel;
    },[]);
    const actionButtons=choices.map(({id,label,doAction,secondary})=>jsx('button',{
      type:'button',className:secondary?'mv-secondary':undefined,onClick:doAction,children:label,
    },id));
    return jsxs('section',{
      ref:panel,
      className:`mv-layer ${instant?'mv-instant':fast?'mv-fast':''}`,
      tabIndex:-1,role:'dialog','aria-modal':true,'aria-label':inspect?'Current Mood: '+title:'Mood: '+title,
      onKeyDown:e=>{
        if(e.key==='Escape'){
          if(help){e.stopPropagation();setHelp(false);card.current?.focus({preventScroll:true});}
          else if(inspect){e.stopPropagation();onClose();}
        }
        if(e.key==='Tab'){
          const list=[...panel.current.querySelectorAll('button:not([disabled])')];
          const first=list[0],last=list.at(-1);
          if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
        }
      },
      children:[
        jsxs('div',{className:'mv-layout',children:[
          jsx('div',{className:'mv-card-well',children:jsx('button',{
            type:'button',ref:card, className:'mv-card'+(failed?' mv-card-missing':''),
            'aria-label':title+', press and hold or press question mark for rules',
            'aria-keyshortcuts':'F1 ?', 'aria-expanded':help,
            'aria-controls':help?'mv-rule-details':undefined,
            onContextMenu:e=>e.preventDefault(),
            onPointerDown:e=>{
              if(!e.isPrimary||e.button!==0)return;
              cancel();suppress.current=false;
              gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,timer:setTimeout(()=>{
                suppress.current=true;setHelp(true);
              },460)};
            },
            onPointerMove:e=>{
              const g=gesture.current;
              if(g?.id===e.pointerId&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>12){suppress.current=true;cancel();}
            },
            onPointerUp:cancel,onPointerCancel:()=>{suppress.current=true;cancel();},onPointerLeave:cancel,
            onClick:e=>{
              if(e.detail&&suppress.current){suppress.current=false;e.preventDefault();return;}
              if(!e.detail)setHelp(v=>!v);
            },
            onKeyDown:e=>{if(e.key==='?'||e.key==='F1'){e.preventDefault();setHelp(v=>!v);}},
            children:failed?jsxs('span',{className:'mv-unavailable',children:[jsx('strong',{children:title}),jsx('span',{children:detail})]}):jsx('img',{src:url,alt:'',draggable:false,onError:()=>setFailed(true)})
          })}),
          jsx('footer',{className:'mv-actions',children:actionButtons})
        ]}),
        help&&jsxs('aside',{id:'mv-rule-details',className:'mv-help',role:'status',children:[
          jsx('strong',{children:title}),jsx('p',{children:detail}),
          jsx('button',{type:'button','aria-label':'Close Mood details',onClick:()=>{setHelp(false);card.current?.focus({preventScroll:true});},children:'×'})
        ]})
      ],
    });
  };
}
export function useStatusBoundary(React) {
  React.useLayoutEffect(()=>{
    const boundary=document.querySelector('.gameplay-shell .status-strip');
    if(!boundary)return;
    const shell=boundary.closest('.gameplay-shell');
    const measure=()=>shell.style.setProperty('--herc-status-end',Math.ceil(boundary.getBoundingClientRect().bottom)+'px');
    measure();
    const ro=new ResizeObserver(measure);
    ro.observe(boundary);
    addEventListener('resize',measure);
    window.visualViewport?.addEventListener('resize',measure);
    return()=>{ro.disconnect();removeEventListener('resize',measure);window.visualViewport?.removeEventListener('resize',measure);};
  },[]);
}

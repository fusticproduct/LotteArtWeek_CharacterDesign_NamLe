import {useCallback,useEffect,useRef,useState} from 'react';
/**
 * Undo / redo (B1) over a snapshot of the editable state. Every change is recorded, whoever made it (buttons, seed,
 * WebMCP tools); changes of one kind in quick succession (a slider drag) merge into one step, named by `kindOf`.
 * `restore` puts a snapshot back. Keeps the last `limit` steps.
 */
export function useHistory<T extends object>(present:T,restore:(snapshot:T)=>void,kindOf:(from:T,to:T)=>string,limit=100){
 const past=useRef<T[]>([]),future=useRef<T[]>([]),last=useRef(present),restoring=useRef(false),lastEdit=useRef({kind:'',time:0});
 const restoreRef=useRef(restore);restoreRef.current=restore;
 const [,setVersion]=useState(0);
 const same=(a:T,b:T)=>(Object.keys(a) as (keyof T)[]).every(k=>a[k]===b[k]);
 useEffect(()=>{
  const prev=last.current;if(same(prev,present))return;
  last.current=present;
  if(restoring.current){restoring.current=false;return;}
  const kind=kindOf(prev,present),now=performance.now(),merge=kind!==''&&kind===lastEdit.current.kind&&now-lastEdit.current.time<1000;
  lastEdit.current={kind,time:now};
  if(!merge)past.current=[...past.current.slice(1-limit),prev];
  future.current=[];setVersion(v=>v+1);
 });
 const step=useCallback((from:typeof past,to:typeof future)=>{
  const target=from.current.at(-1);if(!target)return;
  from.current=from.current.slice(0,-1);to.current=[...to.current,last.current];
  restoring.current=!same(target,last.current);lastEdit.current={kind:'',time:0};
  restoreRef.current(target);setVersion(v=>v+1);
 },[]);
 const undo=useCallback(()=>step(past,future),[step]),redo=useCallback(()=>step(future,past),[step]);
 return {undo,redo,canUndo:past.current.length>0,canRedo:future.current.length>0};
}

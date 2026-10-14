import {useState} from 'react';
import {GripVertical,Lock,Unlock,RotateCcw} from 'lucide-react';
import {bones,partName,mirrorsFully,mirrorsShape,isJoint,single,type BoneDefinition,type CharacterSpec} from './model';
import {layerGroups,defaultLayerOrder,groupOf,limbStack,type LayerGroup} from './rig';
interface Props {spec:CharacterSpec;locked:Set<string>;order:LayerGroup[];onOrder:(order:LayerGroup[])=>void;onReroll:(id:string)=>void;onToggleLock:(id:string)=>void;}
/** One editable row: a single bone, or a left/right pair that is rerolled and locked together. */
interface Unit {bone:BoneDefinition;label:string;}
const plural:Record<string,string>={shoulder:'Shoulders',elbow:'Elbows',hand:'Hands',hip:'Hip joints',thigh:'Thighs',knee:'Knees',shin:'Shins',foot:'Feet'};
/** Rows of a layer block, front first; arms and legs list their parts in their fixed stacking order. */
function unitsOf(group:LayerGroup):Unit[]{
 const parts=group==='arms'?[...limbStack.arm].reverse():group==='legs'?[...limbStack.leg].reverse():null;
 const members=parts?parts.flatMap(part=>bones.filter(b=>b.id.startsWith(`${part}_`))):bones.filter(b=>groupOf(b.id)===group);
 return members.filter(b=>!(b.id.endsWith('_R')&&(mirrorsFully(b.id)||mirrorsShape(b.id)))).map(b=>{
  const paired=mirrorsFully(b.id)||mirrorsShape(b.id);
  return {bone:b,label:members.length===1?layerGroups[group]:paired?plural[b.id.split('_')[0]]:/_[LR]$/.test(b.id)?`${b.id.endsWith('_L')?'Left':'Right'} ${b.label.toLowerCase()}`:b.label};
 });
}
/**
 * Parts and layers in one list. Each block is a layer; the top block is drawn in front.
 * Drag a block by its handle (or focus the handle and press ↑/↓) to restack; every part keeps its reroll and lock.
 */
export default function PartsPanel({spec,locked,order,onOrder,onReroll,onToggleLock}:Props){
 const [dragging,setDragging]=useState<LayerGroup|null>(null),[over,setOver]=useState<LayerGroup|null>(null);
 const place=(group:LayerGroup,to:number)=>{const next=order.filter(g=>g!==group);next.splice(Math.max(0,Math.min(next.length,to)),0,group);onOrder(next);};
 const row=(unit:Unit,nested:boolean,handle?:React.ReactNode)=>{
  // A Single body has no bottom piece, so there is nothing to reroll there.
  const b=unit.bone,isLocked=locked.has(b.id),noPiece=b.id==='root'&&spec.parts.spine_lower.variant===single;
  return <div className={`part-row ${isLocked?'locked':''} ${nested?'nested':''}`} key={b.id}>
   {handle}
   <div className="part-label"><strong>{unit.label}</strong><span>{partName(spec,b)}</span></div>
   <button className="part-button reroll" disabled={isLocked||noPiece} onClick={()=>onReroll(b.id)} title={noPiece?'Single build: no bottom piece':isJoint(b.id)?'New joint colour':`New shape: ${unit.label}`} aria-label={`Reroll ${b.id}`}><RotateCcw size={15}/></button>
   <button className="part-button" onClick={()=>onToggleLock(b.id)} title={`${isLocked?'Unlock':'Lock'} ${unit.label}`} aria-label={`${isLocked?'Unlock':'Lock'} ${b.id}`} aria-pressed={isLocked}>{isLocked?<Lock size={15}/>:<Unlock size={15}/>}</button>
  </div>;
 };
 return <>
  <div className="panel-note"><GripVertical size={14}/><span>Drag to restack · top is in front</span><button onClick={()=>onOrder(defaultLayerOrder)} title="Reset layer order">Reset order</button></div>
  <ol className="parts-list layer-stack">
   {order.map((group,index)=>{
    const units=unitsOf(group),single=units.length===1&&units[0].label===layerGroups[group];
    const handle=<button className="layer-handle" title={`Drag ${layerGroups[group]} to restack (or press ↑ / ↓)`} aria-label={`Layer ${index+1} of ${order.length}: ${layerGroups[group]}. Press arrow up or down to move.`} onKeyDown={e=>{if(e.key==='ArrowUp'){e.preventDefault();place(group,index-1);}if(e.key==='ArrowDown'){e.preventDefault();place(group,index+1);}}}><GripVertical size={15}/></button>;
    return <li key={group} className={`layer-block ${dragging===group?'dragging':''} ${over===group&&dragging&&dragging!==group?'drop-target':''}`} draggable
     onDragStart={e=>{setDragging(group);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',group);}}
     onDragEnd={()=>{setDragging(null);setOver(null);}}
     onDragOver={e=>{if(dragging){e.preventDefault();setOver(group);}}}
     onDrop={e=>{e.preventDefault();if(dragging&&dragging!==group)place(dragging,index);setDragging(null);setOver(null);}}>
     {single?row(units[0],false,handle):<><div className="layer-title">{handle}<strong>{layerGroups[group]}</strong></div>{units.map(u=>row(u,true))}</>}
    </li>;
   })}
  </ol>
 </>;
}

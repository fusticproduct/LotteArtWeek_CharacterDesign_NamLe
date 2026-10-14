import {useEffect,useMemo} from 'react';
import {Shuffle,X} from 'lucide-react';
import {renderThumbnail,type ThumbnailLook} from './thumbnails';
import type {CharacterSpec} from './model';
import {stageColor} from './themes';
interface Props {candidates:CharacterSpec[];look:ThumbnailLook;lockedCount:number;onPick:(spec:CharacterSpec)=>void;onShuffle:()=>void;onClose:()=>void;}
/** Generate ×6: six candidates on the stage (locked parts kept); pick one to continue with it. */
export default function ExploreGrid({candidates,look,lockedCount,onPick,onShuffle,onClose}:Props){
 // Each candidate in a different Dance moment, so the grid shows how they move.
 const images=useMemo(()=>candidates.map((spec,i)=>renderThumbnail(spec,look,300,400,i*11)),[candidates,look]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
 return <div className="explore" role="dialog" aria-label="Pick one of six characters">
  <div className="explore-head"><strong>Pick one of 6</strong><span>{lockedCount?`${lockedCount} locked parts kept`:'Click a character to keep it'}</span><button onClick={onShuffle} title="Six new candidates"><Shuffle size={14}/>Shuffle</button><button onClick={onClose} title="Close (Esc)" aria-label="Close"><X size={15}/></button></div>
  <div className="explore-grid">{candidates.map((spec,i)=><button key={spec.label} onClick={()=>onPick(spec)} title={`Keep ${spec.label}`} style={{background:stageColor(look.weavePalette,look.dark)}}><img src={images[i]} alt={spec.label}/><span>{spec.label.split('-').slice(-1)[0]}</span></button>)}</div>
 </div>;
}

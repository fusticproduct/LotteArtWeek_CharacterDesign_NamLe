import {useEffect,useState,type CSSProperties} from 'react';
import {ArrowLeft} from 'lucide-react';
import {generate,restHeight,theme} from './model';
import {setRules} from './rules';
import {stageColor} from './themes';
import {browserLook} from './settings';
import {renderThumbnail} from './thumbnails';
import {cycleFrame,paradePoses,poseAngles,type ParadeCycle,type ParadeKind} from './paradePoses';
/**
 * Pose sheet (#poses): every Parade pose (paradePoses.ts) on its own character, held as in the Parade (unmirrored and
 * unnudged), one row per kind and named, for reviewing the poses side by side. Drawn as still pictures
 * (thumbnails.ts), in the studio's look in this browser.
 */
const kinds:{kind:ParadeKind;title:string}[]=[{kind:'stand',title:'Standing'},{kind:'step',title:'Stepping'},{kind:'jump',title:'Jumping'},{kind:'float',title:'Floating'}];
const rows=kinds.map(k=>paradePoses.filter(p=>p.kind===k.kind));
/** Each picture: 2.6 × 5 m, from just below the floor, tall enough for the tallest body type jumping with its arms up. */
const cellW=2.6,cellH=5,px=200;
/** Where each moving pose is drawn: mid-stride, mid-move in a dance, at the top of the hop, a quarter of the way round a flip. */
const shown:Record<ParadeCycle,number>={walk:.15,jog:.15,run:.15,dance:.15,disco:.5,robot:.2,twist:.25,armwave:.3,charleston:.25,cheer:.5,armraise:.5,sidestretch:.25,squat:.5,toetouch:.5,jacks:.5,kneelift:.25,hop:.5,backflip:.5,frontflip:.5};
function draw(look:ReturnType<typeof browserLook>){
 setRules(look.look.rules);
 const l=look.look,thumb={weavePalette:l.palette,layerOrder:l.layerOrder,proportions:look.proportions,dark:l.darkStage,paper:l.paper,riso:l.riso,pixel:l.pixel,spray:l.spray,digits:l.digits,face:l.face,curtains:l.curtains,pose:'idle' as const};
 return rows.map(row=>row.map(def=>{const f=def.cycle?cycleFrame(def.cycle,shown[def.cycle]):{angles:poseAngles(def),lift:def.lift??0};return renderThumbnail({...generate(`pose-${def.name}`),density:l.patternScale},thumb,px,Math.round(px*cellH/cellW),0,{facingRight:true,angles:f.angles,lift:f.lift*restHeight/2.6,top:cellH-.3,span:cellH});}));
}
export default function PoseSheet(){
 const [look,setLook]=useState(browserLook),[pictures,setPictures]=useState<string[][]|null>(null);
 useEffect(()=>{const on=(e:StorageEvent)=>{if(e.key?.startsWith('geofolk.'))setLook(browserLook());};addEventListener('storage',on);return()=>removeEventListener('storage',on);},[]);
 // Drawn just after the first paint (an effect, no timer), so the page shows straight away.
 useEffect(()=>setPictures(draw(look)),[look]);
 const dark=look.look.darkStage;
 return <main className={`pose-sheet${dark?' dark':''}`} style={{'--ink':theme.ink,'--paper':theme.paper,'--stage':stageColor(look.look.palette,dark)} as CSSProperties}>
  <header className="pose-sheet-head"><a className="parade-button" href="#parade"><ArrowLeft size={15}/>Parade</a><h1>Parade poses</h1><p>{paradePoses.length} poses from the reference photos, all facing right (every pose that differs side to side also comes on the other side). Eleven are moving (walk, run, six dances, a hop, a back flip and a front flip); the rest are held, arms always outward, now and then one waving. The Parade rotates its cast through all of them, nobody holding the same one.</p></header>
  {rows.map((row,r)=><section key={kinds[r].kind} className="pose-sheet-kind"><h2>{kinds[r].title}<span>{row.length}</span></h2>
   <div className="pose-sheet-grid">{row.map((def,c)=><figure key={def.name}>{pictures&&<img src={pictures[r][c]} alt={`${def.name} pose`}/>}<figcaption><strong>{def.name}</strong><small>{def.cycle?'animated, ':''}{def.from}</small></figcaption></figure>)}</div>
  </section>)}
 </main>;
}

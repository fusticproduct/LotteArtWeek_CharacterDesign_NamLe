import {useState} from 'react';
import {RotateCcw,Save} from 'lucide-react';
import {proportionKeys,patternKeys,defaultProportions,type Proportions} from './model';
const labels:Record<keyof Proportions,string>={head:'Head',torsoWidth:'Top piece width',torsoHeight:'Seam height',pelvis:'Bottom piece width',arms:'Arm thickness',legs:'Leg thickness',hands:'Hands',feet:'Feet',joints:'Joints',fingers:'Fingers',fingerStiffness:'Finger stiffness',toes:'Toes',checker:'Checker scale',flowSpeed:'Flow speed'};
const same=(a:Proportions,b:Proportions)=>proportionKeys.every(k=>a[k]===b[k]);
interface Props {value:Proportions;saved:Proportions;lookChanged:boolean;onChange:(next:Proportions)=>void;onSaveDefault:()=>Promise<string>;onReset:()=>void;}
/** Proportions tab: global size of each part for every character, with a saved default to return to. */
export default function ProportionsPanel({value,saved,lookChanged,onChange,onSaveDefault,onReset}:Props){
 const [status,setStatus]=useState(''),[saving,setSaving]=useState(false),unchanged=same(value,saved)&&!lookChanged;
 const save=async()=>{setSaving(true);setStatus(await onSaveDefault());setSaving(false);};
 return <div className="look-panel" role="tabpanel" aria-label="Proportions">
  <div className="look-heading"><span>Scale parts on every character. Bone lengths stay the same; the shoulders and hips follow the body pieces. Seam height moves the joint between two body pieces. Not stored in the seed.</span></div>
  <section>
   {proportionKeys.filter(k=>!(patternKeys as readonly string[]).includes(k)).map(k=><label className="look-slider" key={k}><span>{labels[k]}<em>{Math.round(value[k]*100)}%</em></span><input type="range" min={.5} max={1.5} step={.05} value={value[k]} onChange={e=>{setStatus('');onChange({...value,[k]:Number(e.target.value)});}}/></label>)}
  </section>
  <section>
   <div className="proportion-actions">
    <button className="primary" onClick={save} disabled={saving||unchanged} title="Make every setting the default: these proportions, Checker scale, Flow speed, palette, layer order, paper texture and stage"><Save size={14}/>Save all as default</button>
    <button onClick={()=>{setStatus('');onReset();}} disabled={unchanged} title="Back to the saved defaults (all settings)"><RotateCcw size={14}/>Reset</button>
   </div>
   {!same(saved,defaultProportions)&&<button className="proportion-factory" onClick={()=>{setStatus('');onChange(defaultProportions);}} disabled={same(value,defaultProportions)}>Set all sliders to 100%</button>}
   {status&&<p className="proportion-note" role="status">{status}</p>}
  </section>
 </div>;
}

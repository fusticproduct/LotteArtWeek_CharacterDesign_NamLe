import type {ReactNode} from 'react';
import {Minus,Plus,RotateCcw} from 'lucide-react';
import {ruleRanges,sameRules,type PatternRules} from './rules';
import {checkerStyles} from './rig';
interface Props {value:PatternRules;saved:PatternRules;onChange:(next:PatternRules)=>void;}
type CountKey='weave'|'checker'|'flow'|'pixel'|'spray';
/** A count with − and + buttons. */
function Count({value,min,max,label,onChange}:{value:number;min:number;max:number;label:string;onChange:(v:number)=>void}){
 return <div className="rule-count"><button onClick={()=>onChange(value-1)} disabled={value<=min} aria-label={`Fewer ${label}`}><Minus size={13}/></button><output aria-label={label}>{value}</output><button onClick={()=>onChange(value+1)} disabled={value>=max} aria-label={`More ${label}`}><Plus size={13}/></button></div>;
}
/** An on/off rule. */
function Toggle({on,label,onChange}:{on:boolean;label:string;onChange:(v:boolean)=>void}){
 return <label className="rule-toggle"><input type="checkbox" checked={on} onChange={e=>onChange(e.target.checked)}/>{label}</label>;
}
/**
 * Rules panel (Nam, 2026-10-14): every rule for patterns, gradients, pixel and spray parts in one list at the bottom of
 * the page, with the amounts and switches that can change (rules.ts); the fixed rules are listed under them. Changes
 * re-settle the current character; "Save all as default" keeps them.
 */
export default function RulesPanel({value,saved,onChange}:Props){
 const set=<K extends keyof PatternRules>(key:K,v:PatternRules[K])=>onChange({...value,[key]:v});
 const count=(key:CountKey,label:string)=><Count value={value[key]} min={ruleRanges[key].min} max={ruleRanges[key].max} label={label} onChange={v=>set(key,v)}/>;
 const rules:{title:string;text:string;control:ReactNode}[]=[
  {title:'Weave',text:'Woven body pieces. Weave only goes on the body pieces. With 1, of two stacked pieces exactly one is woven (they touch); a Single body has one piece. 2 weaves both, even though they touch.',control:count('weave','woven pieces')},
  {title:'Two-tone',text:'Chance that an arm or leg segment is split into two colour layers. Never on joints. Applies to new characters (Generate).',control:<label className="rule-slider"><input type="range" min={0} max={1} step={.05} value={value.twoTone} onChange={e=>set('twoTone',Number(e.target.value))}/><span>{Math.round(value.twoTone*100)}%</span></label>},
  {title:'Checker',text:'Checker spots on arm and leg segments, each with its own look. A thigh only takes one under a plain bottom piece while the touching rule is on.',control:<div className="rule-stack">{count('checker','checker spots')}<Toggle on={value.checkerApart} label="Never a mirrored pair" onChange={v=>set('checkerApart',v)}/><div className="rule-chips">{checkerStyles.map((name,i)=><button key={name} className={value.checkerStyles[i]?'active':''} aria-pressed={value.checkerStyles[i]} disabled={value.checkerStyles[i]&&value.checkerStyles.filter(Boolean).length===1} onClick={()=>set('checkerStyles',value.checkerStyles.map((on,k)=>k===i?!on:on))}>{name}</button>)}</div></div>},
  {title:'Gradient (Flow)',text:'Parts with a sliding linear gradient: the head, hands, feet or arm and leg segments. Fewer if no more fit the other rules.',control:<div className="rule-stack">{count('flow','gradient parts')}<Toggle on={value.flowApart} label="Never a mirrored pair" onChange={v=>set('flowApart',v)}/></div>},
  {title:'Touching parts',text:'Two parts that touch are never both patterned (weave, checker or gradient): a joint, like a shoulder or a knee, must sit between them.',control:<Toggle on={value.touching} label="On" onChange={v=>set('touching',v)}/>},
  {title:'Pixel parts',text:'Parts drawn on the pixel grid: plain arm or leg segments first, then plain hands or feet, then two-tone segments. Never joints.',control:count('pixel','pixel parts')},
  {title:'Spray parts',text:'Parts drawn spray-blurred while Spray blur is on: the head, body pieces, arm and leg segments, hands or feet. Never joints or pixel parts.',control:count('spray','spray parts')},
 ];
 return <section className="rules-panel" aria-labelledby="rules-title">
  <div className="rules-head"><div><div className="eyebrow">GENERATION RULES</div><h2 id="rules-title">Rules</h2><p>Where patterns, gradients, pixel and spray parts go, and how many. Changes apply to the character on stage straight away; Save all as default keeps them.</p></div>
   <button className="rules-reset" onClick={()=>onChange(saved)} disabled={sameRules(value,saved)}><RotateCcw size={14}/>Reset rules</button></div>
  <div className="rules-grid">{rules.map(r=><div className="rule" key={r.title}><h3>{r.title}</h3><p>{r.text}</p>{r.control}</div>)}</div>
  <div className="rules-fixed"><h3>Always</h3><ul>
   <li>Joints (shoulders, elbows, hips, knees) are never patterned, pixelated or sprayed.</li>
   <li>Left and right hands, feet, joints and leg shapes mirror in shape and colour; patterns never mirror.</li>
   <li>Weave only on body pieces; two-tone and checker only on arm and leg segments.</li>
   <li>Hip joints sit just outside the body piece that carries them, behind it.</li>
   <li>Donut and Ring holes show the stage colour; a Ring hand stays open.</li>
   <li>The face mark is always dark; the hair never takes the head's colour.</li>
  </ul></div>
 </section>;
}

import {useState,type ReactNode} from 'react';
import {RotateCcw,Save} from 'lucide-react';
import {rangeOf,type Proportions} from './model';
import {weavePaletteNames,type WeavePaletteName} from './weave';
import {risoBlends,risoRanges,type RisoSettings} from './riso';
import {pixelFps,pixelRange,type PixelSettings} from './pixelate';
import {sprayRange,type SpraySettings} from './spray';
import {curtainPlaces,curtainPlaceNames,curtainRanges,type CurtainSettings} from './curtains';
/** A labelled slider with its value. */
function Slider({id,label,value,min,max,step,show,onChange}:{id:string;label:string;value:number;min:number;max:number;step:number;show:(v:number)=>string;onChange:(v:number)=>void}){
 return <div className="look-row"><label htmlFor={id}>{label}<span>{show(value)}</span></label><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></div>;
}
/** A label with a row of choices (On/Off, palettes, frame rates…). */
function Choice<T extends string|number|boolean>({label,value,options,name,onChange,title}:{label:string;value:T;options:readonly T[];name:(v:T)=>string;onChange:(v:T)=>void;title?:string}){
 return <div className="look-choice" title={title}><span>{label}</span><div>{options.map(o=><button key={String(o)} className={value===o?'active':''} aria-pressed={value===o} onClick={()=>onChange(o)}>{name(o)}</button>)}</div></div>;
}
const onOff=(v:boolean)=>v?'On':'Off',pct=(v:number)=>`${Math.round(v*100)}%`;
/** A collapsible group; its open state is kept per browser. */
function Group({id,title,children}:{id:string;title:string;children:ReactNode}){
 const key=`geofolk.look.${id}`,[open,setOpen]=useState(()=>{try{return localStorage.getItem(key)!=='closed';}catch{return true;}});
 return <details className="look-group" open={open} onToggle={e=>{const now=(e.currentTarget as HTMLDetailsElement).open;setOpen(now);try{localStorage.setItem(key,now?'open':'closed');}catch{/* storage unavailable */}}}><summary>{title}</summary><div className="look-group-body">{children}</div></details>;
}
interface Props {
 density:number;onDensity:(v:number)=>void;proportions:Proportions;onProportions:(p:Proportions)=>void;
 palette:WeavePaletteName;onPalette:(p:WeavePaletteName)=>void;paper:boolean;onPaper:(v:boolean)=>void;
 riso:RisoSettings;onRiso:(v:RisoSettings)=>void;pixel:PixelSettings;onPixel:(v:PixelSettings)=>void;
 spray:SpraySettings;onSpray:(v:SpraySettings)=>void;curtains:CurtainSettings;onCurtains:(v:CurtainSettings)=>void;
 changed:boolean;onSaveDefault:()=>Promise<string>;onReset:()=>void;
}
/**
 * Look tab (Nam, 2026-10-14: "clean up UI to be organized and clean"): every look setting in collapsible groups that
 * scroll inside the panel (Patterns, Colour & print, Effects, Curtains), with Save all as default and Reset kept at the
 * bottom of the panel.
 */
export default function LookPanel(p:Props){
 const [status,setStatus]=useState(''),[saving,setSaving]=useState(false);
 const save=async()=>{setSaving(true);setStatus(await p.onSaveDefault());setSaving(false);};
 const {riso,pixel,spray,curtains}=p;
 return <div className="look-tab" role="tabpanel" aria-label="Look">
  <div className="look-scroll">
   <Group id="patterns" title="Patterns">
    <Slider id="pattern-density" label="Pattern scale" value={p.density} min={2} max={12} step={1} show={v=>`${v*2} cells`} onChange={p.onDensity}/>
    <Slider id="pattern-checker" label="Checker scale" value={p.proportions.checker} min={rangeOf('checker').min} max={rangeOf('checker').max} step={.05} show={pct} onChange={v=>p.onProportions({...p.proportions,checker:v})}/>
    <Slider id="pattern-flow" label="Flow speed" value={p.proportions.flowSpeed} min={rangeOf('flowSpeed').min} max={rangeOf('flowSpeed').max} step={.05} show={pct} onChange={v=>p.onProportions({...p.proportions,flowSpeed:v})}/>
   </Group>
   <Group id="colour" title="Colour & print">
    <Choice label="Palette" value={p.palette} options={weavePaletteNames} name={v=>v} onChange={p.onPalette}/>
    <Choice label="Paper texture" value={p.paper} options={[true,false]} name={onOff} onChange={p.onPaper}/>
    <Choice label="Riso" value={riso.on} options={[true,false]} name={onOff} onChange={on=>p.onRiso({...riso,on})}/>
    {riso.on&&<div className="look-sub">
     <Slider id="riso-opacity" label="Opacity" value={riso.opacity} {...risoRanges.opacity} step={.01} show={pct} onChange={v=>p.onRiso({...riso,opacity:v})}/>
     <Slider id="riso-size" label="Dot size" value={riso.size} {...risoRanges.size} step={.0005} show={v=>`${(v*1000).toFixed(1)} mm`} onChange={v=>p.onRiso({...riso,size:v})}/>
     <Slider id="riso-coverage" label="Ink coverage" value={riso.coverage} {...risoRanges.coverage} step={.01} show={pct} onChange={v=>p.onRiso({...riso,coverage:v})}/>
     <Slider id="riso-angle" label="Screen angle" value={riso.angle} {...risoRanges.angle} step={1} show={v=>`${Math.round(v)}°`} onChange={v=>p.onRiso({...riso,angle:v})}/>
     <Slider id="riso-grain" label="Grain" value={riso.grain} {...risoRanges.grain} step={.01} show={pct} onChange={v=>p.onRiso({...riso,grain:v})}/>
     <div className="look-inline"><label htmlFor="riso-color">Colour</label><input id="riso-color" type="color" value={riso.color} onChange={e=>p.onRiso({...riso,color:e.target.value})}/><label htmlFor="riso-blend">Blend</label><select id="riso-blend" value={riso.blend} onChange={e=>p.onRiso({...riso,blend:e.target.value as RisoSettings['blend']})}>{risoBlends.map(b=><option key={b}>{b}</option>)}</select></div>
     <Choice label="Colour in" value={riso.invert} options={[false,true]} name={v=>v?'Dots':'Gaps'} onChange={invert=>p.onRiso({...riso,invert})}/>
    </div>}
   </Group>
   <Group id="effects" title="Effects">
    <Choice label="Pixel parts" value={pixel.on} options={[true,false]} name={onOff} onChange={on=>p.onPixel({...pixel,on})}/>
    {pixel.on&&<div className="look-sub">
     <Slider id="pixel-size" label="Pixel size" value={pixel.size} {...pixelRange} step={.0025} show={v=>`${(v*100).toFixed(1)} cm`} onChange={v=>p.onPixel({...pixel,size:v})}/>
     <Choice label="FPS" value={pixel.fps} options={pixelFps} name={v=>v?String(v):'Smooth'} onChange={fps=>p.onPixel({...pixel,fps})} title="How often the pixel parts are redrawn"/>
    </div>}
    <Choice label="Spray blur" value={spray.on} options={[true,false]} name={onOff} onChange={on=>p.onSpray({...spray,on})} title="Parts look spray-painted: soft, grainy edges"/>
    {spray.on&&<div className="look-sub"><Slider id="spray-amount" label="Blur amount" value={spray.amount} {...sprayRange} step={.0025} show={v=>`${(v*100).toFixed(1)} cm`} onChange={v=>p.onSpray({...spray,amount:v})}/></div>}
   </Group>
   <Group id="curtains" title="Curtains">
    <Choice label="Curtains" value={curtains.on} options={[true,false]} name={onOff} onChange={on=>p.onCurtains({...curtains,on})} title="Strands threaded with shapes, swinging with gravity"/>
    {curtains.on&&<div className="look-sub">
     <div className="look-checks" role="group" aria-label="Curtains on">{curtainPlaces.map(place=><label key={place}><input type="checkbox" checked={curtains.places[place]} onChange={e=>p.onCurtains({...curtains,places:{...curtains.places,[place]:e.target.checked}})}/>{curtainPlaceNames[place]}</label>)}</div>
     <Choice label="Colours" value={curtains.colors} options={['one','random'] as const} name={v=>v==='one'?'One':'Random'} onChange={colors=>p.onCurtains({...curtains,colors})}/>
     <Slider id="curtain-density" label="Strands per place" value={curtains.density} {...curtainRanges.density} step={1} show={v=>String(v)} onChange={v=>p.onCurtains({...curtains,density:v})}/>
     <Slider id="curtain-length" label="Length" value={curtains.length} {...curtainRanges.length} step={.05} show={pct} onChange={v=>p.onCurtains({...curtains,length:v})}/>
     <Slider id="curtain-size" label="Shape size" value={curtains.size} {...curtainRanges.size} step={.05} show={pct} onChange={v=>p.onCurtains({...curtains,size:v})}/>
     <Slider id="curtain-stiffness" label="Stiffness" value={curtains.stiffness} {...curtainRanges.stiffness} step={.05} show={v=>v?pct(v):'loose'} onChange={v=>p.onCurtains({...curtains,stiffness:v})}/>
     <Slider id="curtain-spacing" label="Shape spacing" value={curtains.spacing} {...curtainRanges.spacing} step={.05} show={pct} onChange={v=>p.onCurtains({...curtains,spacing:v})}/>
    </div>}
   </Group>
  </div>
  <div className="look-footer">
   {status&&<p role="status">{status}</p>}
   <div className="proportion-actions"><button className="primary" onClick={save} disabled={saving||!p.changed} title="Make every setting the default: these, the rules, layer order, stage and all proportions"><Save size={14}/>Save all as default</button><button onClick={()=>{setStatus('');p.onReset();}} disabled={!p.changed} title="Back to the saved defaults (all settings)"><RotateCcw size={14}/>Reset</button></div>
  </div>
 </div>;
}

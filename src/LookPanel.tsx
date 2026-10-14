import {useState,type ReactNode} from 'react';
import {RotateCcw,Save} from 'lucide-react';
import {rangeOf,type Proportions} from './model';
import {weavePaletteNames,type WeavePaletteName} from './weave';
import {risoBlends,risoRanges,type RisoSettings} from './riso';
import {pixelFps,pixelRange,type PixelSettings} from './pixelate';
import {digitShapes,digitShapeNames,type DigitSettings} from './fingers';
import {faceStyles,faceStyleNames,type FaceSettings} from './faces';
import {sprayPlaces,sprayPlaceNames,sprayRange,type SpraySettings} from './spray';
import {curtainLooks,curtainPlaces,curtainPlaceNames,curtainRanges,type CurtainSettings} from './curtains';
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
 digits:DigitSettings;onDigits:(v:DigitSettings)=>void;
 face:FaceSettings;onFace:(v:FaceSettings)=>void;
 /** The curtain look the character on stage wears (curtains.ts curtainLookOf). */
 curtainLook:string;
 changed:boolean;onSaveDefault:()=>Promise<string>;onReset:()=>void;
}
/**
 * Look tab (Nam, 2026-10-14: "clean up UI to be organized and clean"): every look setting in collapsible groups that
 * scroll inside the panel (Patterns, Colour & print, Effects, Face, Fingers & toes, Curtains), with Save all as default and Reset kept at the
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
    {spray.on&&<div className="look-sub">
     <Slider id="spray-amount" label="Blur amount" value={spray.amount} {...sprayRange} step={.0025} show={v=>`${(v*100).toFixed(1)} cm`} onChange={v=>p.onSpray({...spray,amount:v})}/>
     <Choice label="Parts" value={spray.pick} options={['random','chosen'] as const} name={v=>v==='random'?'Random':'Chosen'} onChange={pick=>p.onSpray({...spray,pick})} title="Random: the number of spray parts set in Rules. Chosen: the parts ticked below"/>
     {spray.pick==='chosen'&&<div className="look-checks" role="group" aria-label="Spray on">{sprayPlaces.map(place=><label key={place}><input type="checkbox" checked={spray.places[place]} onChange={e=>p.onSpray({...spray,places:{...spray.places,[place]:e.target.checked}})}/>{sprayPlaceNames[place]}</label>)}</div>}
    </div>}
   </Group>
   <Group id="face" title="Face">
    <Choice label="Faces" value={p.face.style} options={faceStyles} name={v=>faceStyleNames[v]} onChange={style=>p.onFace({...p.face,style})} title="Minimal: one geometric mark. Expressive: eyes and a mouth with feeling. Many eyes: three to nine eyes, no mouth. Each character has its own face in each set"/>
    <Choice label="Palette colour" value={p.face.colour} options={[true,false]} name={onOff} onChange={colour=>p.onFace({...p.face,colour})} title="On: the face takes a colour from the character's palette (the one that stands out most on its head). Off: the dark mark colour"/>
   </Group>
   <Group id="digits" title="Fingers & toes">
    <Choice label="Fingers" value={p.digits.fingers} options={[true,false]} name={onOff} onChange={fingers=>p.onDigits({...p.digits,fingers})} title="The five swinging fingers on each hand"/>
    <Choice label="Shape" value={p.digits.shape} options={['random',...digitShapes] as const} name={v=>v==='random'?'Random':digitShapeNames[v]} onChange={shape=>p.onDigits({...p.digits,shape})} title="Fingers and toes share a shape. Random: each character has its own (Generate rerolls it)"/>
   </Group>
   <Group id="curtains" title="Curtains">
    <Choice label="Curtains" value={curtains.on} options={[true,false]} name={onOff} onChange={on=>p.onCurtains({...curtains,on})} title="Strands threaded with shapes, swinging with gravity"/>
    {curtains.on&&<Choice label="Look" value={curtains.look} options={['random','custom'] as const} name={v=>v==='random'?'Random':'Custom'} onChange={look=>p.onCurtains({...curtains,look})} title="Random: each character wears one of the looks, by the shares in Rules (Generate rerolls it). Custom: the settings below"/>}
    {curtains.on&&curtains.look==='random'&&<div className="look-sub"><p className="look-note">This character: <b>{p.curtainLook}</b>. Shares are in Rules.</p>
     <div className="rule-chips" role="group" aria-label="Start from a look">{curtainLooks.filter(l=>l.values).map(l=><button key={l.id} onClick={()=>p.onCurtains({...curtains,...l.values!,look:'custom'})} title={`Edit ${l.name} as custom settings`}>{l.name}</button>)}</div>
    </div>}
    {curtains.on&&curtains.look==='custom'&&<div className="look-sub">
     <div className="rule-chips" role="group" aria-label="Load a look">{curtainLooks.filter(l=>l.values).map(l=><button key={l.id} onClick={()=>p.onCurtains({...curtains,...l.values!})} title={`Load the ${l.name} settings`}>{l.name}</button>)}</div>
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

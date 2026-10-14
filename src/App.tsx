import {useCallback,useMemo,useRef,useState,useEffect,useSyncExternalStore} from 'react';
import {ArrowUpRight,Box,ChevronDown,Copy,Dices,Download,Lock,Unlock,RotateCcw,Layers,Check,MousePointer2,ScanLine,Maximize,PersonStanding,Moon,Sun,LayoutGrid,Palette,Undo2,Redo2} from 'lucide-react';
import PosePanel from './PosePanel';
import PartsPanel from './PartsPanel';
import ProportionsPanel from './ProportionsPanel';
import ExploreGrid from './ExploreGrid';
import {normalizeLayerOrder,type LayerGroup} from './rig';
import {createPoseClient} from './pose';
import {weavePaletteNames,type WeavePaletteName} from './weave';
import {useCharacterTools} from './webmcp';
import {useHistory} from './history';
import {normalizeSettings,studioSettings,sameSettings,type LookSettings} from './settings';
import {normalizeRiso,risoBlends,risoRanges,type RisoSettings} from './riso';
import {exportCharacter} from './exports';
import CharacterScene,{type SceneHandle} from './Scene';
import {bones,theme,variantNames,generate,recolor,encodeSeed,decodeSeed,randomLabel,linkedIds,normalizeProportions,studioProportions,rangeOf,type Pose,type Proportions} from './model';
export default function App(){
 const [seed,setSeed]=useState('good-company-578');
 const [locked,setLocked]=useState<Set<string>>(new Set());
 const [pose,setPose]=useState<Pose>('reach'),[resetView,setResetView]=useState(0);
 const [showRig,setShowRig]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [panelTab,setPanelTab]=useState<'parts'|'shape'|'live'>('parts');
 // Look settings (layer order, palette, paper texture, stage) are global and kept per browser; a new browser starts
 // from the saved defaults (src/settings.json, or a browser-only default saved from a static build).
 const [savedLook,setSavedLook]=useState<LookSettings>(()=>{try{const local=localStorage.getItem('geofolk.settingsDefault');if(local)return normalizeSettings(JSON.parse(local));}catch{/* storage unavailable */}return studioSettings;});
 const stored=(key:string)=>{try{return localStorage.getItem(key);}catch{return null;}};
 // The first character opens with the saved pattern scale; Generate keeps whatever scale is current.
 const [spec,setSpec]=useState(()=>({...generate('good-company-578'),density:savedLook.patternScale}));
 const [layerOrder,setLayerOrder]=useState<LayerGroup[]>(()=>{try{const v=stored('geofolk.layerOrder');return v?normalizeLayerOrder(JSON.parse(v)):savedLook.layerOrder;}catch{return savedLook.layerOrder;}});
 useEffect(()=>{try{localStorage.setItem('geofolk.layerOrder',JSON.stringify(layerOrder));}catch{/* storage unavailable */}},[layerOrder]);
 const [weavePalette,setWeavePalette]=useState<WeavePaletteName>(()=>{const v=stored('geofolk.weavePalette') as WeavePaletteName|null;return v&&weavePaletteNames.includes(v)?v:savedLook.palette;});
 useEffect(()=>{try{localStorage.setItem('geofolk.weavePalette',weavePalette);}catch{/* storage unavailable */}},[weavePalette]);
 const [darkStage,setDarkStage]=useState(()=>{const v=stored('geofolk.stage');return v?v!=='light':savedLook.darkStage;});
 useEffect(()=>{try{localStorage.setItem('geofolk.stage',darkStage?'dark':'light');}catch{/* storage unavailable */}},[darkStage]);
 const [paper,setPaper]=useState(()=>{const v=stored('geofolk.paper');return v?v!=='off':savedLook.paper;});
 useEffect(()=>{try{localStorage.setItem('geofolk.paper',paper?'on':'off');}catch{/* storage unavailable */}},[paper]);
 // Riso (riso.ts): kept per browser; an older on/off value still reads.
 const [riso,setRiso]=useState<RisoSettings>(()=>{const v=stored('geofolk.riso');if(!v)return savedLook.riso;try{return normalizeRiso(v==='on'?true:v==='off'?false:JSON.parse(v));}catch{return savedLook.riso;}});
 useEffect(()=>{try{localStorage.setItem('geofolk.riso',JSON.stringify(riso));}catch{/* storage unavailable */}},[riso]);
 // Generate ×6 (B5): candidates shown on the stage until one is picked.
 const [candidates,setCandidates]=useState<ReturnType<typeof generate>[]|null>(null);
 // Part proportions are a global look setting too (Proportions tab). Their default is the project's src/proportions.json,
 // or a browser-only default saved from a static build where the file cannot be written.
 const [savedProportions,setSavedProportions]=useState<Proportions>(()=>{try{const local=localStorage.getItem('geofolk.proportionsDefault');if(local)return normalizeProportions(JSON.parse(local));}catch{/* storage unavailable */}return studioProportions;});
 const [proportions,setProportions]=useState<Proportions>(()=>{try{const stored=localStorage.getItem('geofolk.proportions');if(stored)return normalizeProportions(JSON.parse(stored));}catch{/* storage unavailable */}return savedProportions;});
 useEffect(()=>{try{localStorage.setItem('geofolk.proportions',JSON.stringify(proportions));}catch{/* storage unavailable */}},[proportions]);
 const look:LookSettings={palette:weavePalette,layerOrder,paper,riso,darkStage,patternScale:spec.density};
 /** Save all as default: the proportions (with the pattern sliders) and the look settings, for the whole project under `npm run dev`, else for this browser. */
 async function saveDefaults(){
  const post=(route:string,body:unknown)=>fetch(`/__defaults/${route}`,{method:'POST',headers:{'Content-Type':'application/json','X-Geofolk':'1'},body:JSON.stringify(body)}).then(r=>r.ok,()=>false);
  if(await post('proportions',proportions)&&await post('settings',look)){try{localStorage.removeItem('geofolk.proportionsDefault');localStorage.removeItem('geofolk.settingsDefault');}catch{/* storage unavailable */}setSavedProportions(proportions);setSavedLook(look);return 'Saved as the project default (src/proportions.json, src/settings.json).';}
  try{localStorage.setItem('geofolk.proportionsDefault',JSON.stringify(proportions));localStorage.setItem('geofolk.settingsDefault',JSON.stringify(look));setSavedProportions(proportions);setSavedLook(look);return 'Saved as the default for this browser only.';}catch{return 'Could not save the default.';}
 }
 const resetAll=()=>{setProportions(savedProportions);setLayerOrder(savedLook.layerOrder);setWeavePalette(savedLook.palette);setPaper(savedLook.paper);setRiso(savedLook.riso);setDarkStage(savedLook.darkStage);if(spec.density!==savedLook.patternScale){const next={...spec,density:savedLook.patternScale};setSpec(next);setSeed(encodeSeed(next));}};
 const poseClient=useMemo(createPoseClient,[]);
 const liveStatus=useSyncExternalStore(poseClient.subscribe,()=>poseClient.snapshot.status);
 useEffect(()=>()=>poseClient.disconnect(),[poseClient]);
 const [toast,setToast]=useState(''),[exportOpen,setExportOpen]=useState(false);
 const scene=useRef<SceneHandle|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const onReady=useCallback((h:SceneHandle)=>{scene.current=h;},[]);
 const notify=(message:string)=>{setToast(message);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),3500);};
 function reroll(id?:string){const next=generate(randomLabel(),spec,locked,id);setSpec(next);setSeed(encodeSeed(next));}
 // One object per look, so the grid only re-renders its thumbnails when the look really changes.
 const exploreLook=useMemo(()=>({weavePalette,layerOrder,proportions,dark:darkStage,paper,riso,pose}),[weavePalette,layerOrder,proportions,darkStage,paper,riso,pose]);
 const explore=()=>setCandidates(Array.from({length:6},()=>generate(randomLabel(),spec,locked)));
 const pick=(next:ReturnType<typeof generate>)=>{setSpec(next);setSeed(encodeSeed(next));setCandidates(null);};
 function applySeed(){try{let next=decodeSeed(seed);if(!seed.includes('~'))next={...next,density:spec.density};setSpec(next);setSeed(encodeSeed(next));setLocked(new Set());notify('Character restored from seed');}catch(e){notify((e as Error).message);}}
 useCharacterTools(spec,locked,(next,restore)=>{setSpec(next);setSeed(encodeSeed(next));if(restore)setLocked(new Set());});
 // Undo / redo (B1): the character, its locks and the look settings. Stage, pose and paper are view settings, not edits.
 const history=useHistory({spec,locked,layerOrder,proportions,weavePalette},s=>{setSpec(s.spec);setSeed(encodeSeed(s.spec));setLocked(s.locked);setLayerOrder(s.layerOrder);setProportions(s.proportions);setWeavePalette(s.weavePalette);},
  (a,b)=>a.spec===b.spec&&a.locked===b.locked&&a.layerOrder===b.layerOrder&&a.weavePalette===b.weavePalette?'proportions':a.spec.parts===b.spec.parts&&a.spec.label===b.spec.label&&a.spec.density!==b.spec.density?'density':'');
 const {undo,redo}=history;
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
   // Text fields keep their own undo; sliders do not.
   const t=e.target as HTMLElement;if(t.isContentEditable||t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&(t as HTMLInputElement).type!=='range'))return;
   const k=e.key.toLowerCase();
   if(k==='z'&&!e.shiftKey){e.preventDefault();undo();}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();redo();}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[undo,redo]);
 // Mirrored left/right parts (hands, feet, joints, leg shapes) lock together.
 const toggleLock=(id:string)=>setLocked(prev=>{const next=new Set(prev),on=!prev.has(id);linkedIds(id).forEach(l=>on?next.add(l):next.delete(l));return next;});
 async function copySeed(){try{await navigator.clipboard.writeText(encodeSeed(spec));notify('Full character seed copied');}catch{notify('Select the seed field to copy manually.');setSeed(encodeSeed(spec));}}
 async function runExport(format:'fbx'|'obj'|'json'){if(!scene.current||exporting)return;setExporting(true);try{await new Promise(resolve=>requestAnimationFrame(resolve));// Export the clean preset, not a breathing frame; Dance exports the frame on screen.
 if(pose!=='dance'&&liveStatus==='off')scene.current.rig.applyPose(pose);exportCharacter(format,scene.current.rig,spec,pose);setExportOpen(false);notify(`${format.toUpperCase()} exported${format==='obj'?' with materials, textures and Rig JSON':''}`);}catch(e){notify(`Export failed: ${(e as Error).message}`);}finally{setExporting(false);}}
 useEffect(()=>{if(!exportOpen)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setExportOpen(false);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[exportOpen]);
 return <div className="studio" style={{'--paper':theme.paper,'--ink':theme.ink,'--green':theme.green,'--blue':theme.blue,'--pink':theme.pink} as React.CSSProperties}>
  <header className="masthead"><a className="wordmark" href="/" aria-label="Geofolk home"><span className="brand-mark"><Box size={26}/></span>geofolk<span className="wordmark-dot">®</span></a><span className="edition">CHARACTER STUDIO <span>01—∞</span></span></header>
  <div className="toolbar"><div className="project-title"><h1>Character studio</h1></div><div className="toolbar-actions"><div className="history-buttons"><button className="icon-button" onClick={undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 size={17}/></button><button className="icon-button" onClick={redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Redo2 size={17}/></button></div><div className="seed-field"><label htmlFor="seed">SEED</label><input id="seed" value={seed} onChange={e=>setSeed(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applySeed();}} aria-label="Character seed" spellCheck={false}/><button className="icon-button" onClick={copySeed} title="Copy full character seed" aria-label="Copy seed"><Copy size={15}/></button><button className="icon-button" onClick={applySeed} title="Apply seed" aria-label="Apply seed"><ArrowUpRight size={17}/></button></div><div className="export-wrap"><button className="button export-button" onClick={()=>setExportOpen(!exportOpen)} aria-expanded={exportOpen}><Download size={16}/>Export<ChevronDown size={14}/></button>{exportOpen&&<div className="export-menu"><p>EXPORT YOUR CHARACTER</p><button disabled={exporting} onClick={()=>runExport('fbx')}><Box size={17}/>FBX model<span>RIGGED</span></button><button disabled={exporting} onClick={()=>runExport('obj')}><Box size={17}/>OBJ bundle<span>ZIP</span></button><div className="export-note">FBX keeps the rig. OBJ includes posed mesh, materials and textures.</div><button disabled={exporting} onClick={()=>runExport('json')}><Layers size={17}/>Rig JSON</button><button onClick={()=>{const h=scene.current;if(h){h.renderer.render(h.scene,h.camera);const a=document.createElement('a');a.download=`${spec.label}.png`;a.href=h.renderer.domElement.toDataURL('image/png');a.click();setExportOpen(false);notify('PNG snapshot exported');}}}><ScanLine size={17}/>PNG snapshot</button></div>}</div><button className="button explore-button" disabled={locked.size===bones.length} onClick={()=>{const next=recolor(spec,locked);setSpec(next);setSeed(encodeSeed(next));}} title="New colour scheme, same shapes (locked parts keep their colours)"><Palette size={16}/>Colors</button><button className="button explore-button" disabled={locked.size===bones.length} onClick={explore} title="Generate 6 to choose from"><LayoutGrid size={16}/>×6</button><button className="button generate-button" disabled={locked.size===bones.length} title={locked.size===bones.length?'Unlock a part to generate':undefined} onClick={()=>reroll()}><Dices size={18}/>Generate<span>↗</span></button></div></div>
  <main className="workspace"><section className={`viewport ${darkStage?'dark':''}`} aria-label="Interactive character viewport"><div className="scene-caption"><span className="eyebrow">YOUR ONE-OF-A-KIND FOLK</span><h2>{spec.label.split('-').slice(-1)[0].toUpperCase()}</h2><span className="character-meta">{bones.length} bones · Infinite possibilities</span></div>
   <CharacterScene spec={spec} pose={pose} showRig={showRig} weavePalette={weavePalette} layerOrder={layerOrder} proportions={proportions} dark={darkStage} paper={paper} riso={riso} live={liveStatus==='off'?null:poseClient} resetView={resetView} onReady={onReady}/>
   {candidates&&<ExploreGrid candidates={candidates} look={exploreLook} lockedCount={locked.size} onPick={pick} onShuffle={explore} onClose={()=>setCandidates(null)}/>}
   <div className="scene-tools"><button onClick={()=>setResetView(v=>v+1)} title="Fit to view" aria-label="Fit to view"><Maximize size={18}/></button><button className={showRig?'active':''} onClick={()=>setShowRig(!showRig)} title="Show skeleton" aria-label="Show skeleton" aria-pressed={showRig}><ScanLine size={18}/></button><button className={liveStatus!=='off'?'active':''} onClick={()=>setPanelTab(panelTab==='live'?'parts':'live')} title="Live pose" aria-label="Live pose"><PersonStanding size={18}/></button><button onClick={()=>setDarkStage(!darkStage)} title={darkStage?'Light background':'Black background'} aria-label="Black background" aria-pressed={darkStage}>{darkStage?<Sun size={18}/>:<Moon size={18}/>}</button></div>
   <div className="scene-footer"><div className="orbit-hint"><MousePointer2 size={14}/><span>Drag to pan</span><span className="hint-divider">/</span><span>Scroll to zoom</span></div><span className="rig-badge"><span/>{liveStatus==='live'?'LIVE POSE':'RIGGED & READY'}</span></div>
   <div className="pose-bar"><span>STRIKE A POSE</span>{(['idle','reach','stride','dance'] as Pose[]).map((p,i)=><button key={p} onClick={()=>setPose(p)} className={pose===p?'active':''} aria-pressed={pose===p}><span className="pose-symbol">{['♙','↟','⋏','♫'][i]}</span>{p==='idle'?'At ease':p==='reach'?'Hands up':p==='stride'?'Step out':'Dance'}</button>)}</div>
  </section>
  <aside className="parts-panel"><div className="panel-tabs" role="tablist" aria-label="Editor panels"><button role="tab" aria-selected={panelTab==='parts'} className={panelTab==='parts'?'active':''} onClick={()=>setPanelTab('parts')}>Parts<span>{bones.length}</span></button><button role="tab" aria-selected={panelTab==='shape'} className={panelTab==='shape'?'active':''} onClick={()=>setPanelTab('shape')}>Proportions</button><button role="tab" aria-selected={panelTab==='live'} className={panelTab==='live'?'active':''} onClick={()=>setPanelTab('live')}>Live pose</button></div>{panelTab==='live'?<PosePanel client={poseClient}/>:panelTab==='shape'?<ProportionsPanel value={proportions} saved={savedProportions} lookChanged={!sameSettings(look,savedLook)} onChange={setProportions} onSaveDefault={saveDefaults} onReset={resetAll}/>:<><PartsPanel spec={spec} locked={locked} order={layerOrder} onOrder={setLayerOrder} onReroll={reroll} onToggleLock={toggleLock}/><div className="pattern-control"><label htmlFor="pattern-density">Pattern scale<span>{spec.density*2} cells</span></label><input id="pattern-density" type="range" min={2} max={12} value={spec.density} onChange={e=>{const next={...spec,density:Number(e.target.value)};setSpec(next);setSeed(encodeSeed(next));}}/>{([['checker','Checker scale'],['flowSpeed','Flow speed']] as const).map(([key,label])=><div key={key}><label htmlFor={`pattern-${key}`}>{label}<span>{Math.round(proportions[key]*100)}%</span></label><input id={`pattern-${key}`} type="range" min={rangeOf(key).min} max={rangeOf(key).max} step={.05} value={proportions[key]} onChange={e=>setProportions({...proportions,[key]:Number(e.target.value)})}/></div>)}<div className="look-tone weave-palette"><span>Palette</span>{weavePaletteNames.map(name=><button key={name} className={weavePalette===name?'active':''} aria-pressed={weavePalette===name} onClick={()=>setWeavePalette(name)}>{name}</button>)}</div><div className="look-tone weave-palette"><span>Paper texture</span>{([true,false] as const).map(on=><button key={String(on)} className={paper===on?'active':''} aria-pressed={paper===on} onClick={()=>setPaper(on)}>{on?'On':'Off'}</button>)}</div><div className="look-tone weave-palette"><span>Riso</span>{([true,false] as const).map(on=><button key={String(on)} className={riso.on===on?'active':''} aria-pressed={riso.on===on} onClick={()=>setRiso({...riso,on})}>{on?'On':'Off'}</button>)}</div>{riso.on&&<div className="riso-controls">{([['opacity','Opacity',(v:number)=>`${Math.round(v*100)}%`,.01],['size','Dot size',(v:number)=>`${(v*1000).toFixed(1)} mm`,.0005],['coverage','Ink coverage',(v:number)=>`${Math.round(v*100)}%`,.01],['angle','Screen angle',(v:number)=>`${Math.round(v)}°`,1],['grain','Grain',(v:number)=>`${Math.round(v*100)}%`,.01]] as const).map(([key,label,show,step])=><div key={key}><label htmlFor={`riso-${key}`}>{label}<span>{show(riso[key])}</span></label><input id={`riso-${key}`} type="range" min={risoRanges[key].min} max={risoRanges[key].max} step={step} value={riso[key]} onChange={e=>setRiso({...riso,[key]:Number(e.target.value)})}/></div>)}<div className="riso-row"><label htmlFor="riso-color">Colour</label><input id="riso-color" type="color" value={riso.color} onChange={e=>setRiso({...riso,color:e.target.value})}/><label htmlFor="riso-blend">Blend</label><select id="riso-blend" value={riso.blend} onChange={e=>setRiso({...riso,blend:e.target.value as RisoSettings['blend']})}>{risoBlends.map(b=><option key={b}>{b}</option>)}</select></div><div className="look-tone weave-palette"><span>Colour in</span>{([false,true] as const).map(invert=><button key={String(invert)} className={riso.invert===invert?'active':''} aria-pressed={riso.invert===invert} onClick={()=>setRiso({...riso,invert})}>{invert?'Dots':'Gaps'}</button>)}</div></div>}</div><div className="panel-bottom"><span>{locked.size} of {bones.length} parts locked</span><button onClick={()=>setLocked(new Set())} disabled={!locked.size}>Unlock all <Unlock size={13}/></button></div></>}</aside></main>
  {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
 </div>;
}

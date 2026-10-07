import {useCallback,useMemo,useRef,useState,useEffect,useSyncExternalStore} from 'react';
import {ArrowUpRight,Box,ChevronDown,Copy,Dices,Download,Lock,Unlock,RotateCcw,Layers,Check,MousePointer2,ScanLine,Maximize,PersonStanding} from 'lucide-react';
import PosePanel from './PosePanel';
import PartsPanel from './PartsPanel';
import {defaultLayerOrder,normalizeLayerOrder,type LayerGroup} from './rig';
import {createPoseClient} from './pose';
import {weavePaletteNames,type WeavePaletteName} from './weave';
import {useCharacterTools} from './webmcp';
import {exportCharacter} from './exports';
import CharacterScene,{type SceneHandle} from './Scene';
import {bones,theme,variantNames,generate,encodeSeed,decodeSeed,randomLabel,linkedIds,type Pose} from './model';
export default function App(){
 const [spec,setSpec]=useState(()=>generate('good-company-578'));
 const [seed,setSeed]=useState('good-company-578');
 const [locked,setLocked]=useState<Set<string>>(new Set());
 const [pose,setPose]=useState<Pose>('reach'),[resetView,setResetView]=useState(0);
 const [showRig,setShowRig]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [panelTab,setPanelTab]=useState<'parts'|'live'>('parts');
 // Layer order is a global look setting, kept per browser.
 const [layerOrder,setLayerOrder]=useState<LayerGroup[]>(()=>{try{return normalizeLayerOrder(JSON.parse(localStorage.getItem('geofolk.layerOrder')??'null'));}catch{return defaultLayerOrder;}});
 useEffect(()=>{try{localStorage.setItem('geofolk.layerOrder',JSON.stringify(layerOrder));}catch{/* storage unavailable */}},[layerOrder]);
 // Weave palette is a global look setting (like the pose server), kept per browser rather than in the seed.
 const [weavePalette,setWeavePalette]=useState<WeavePaletteName>(()=>{try{const saved=localStorage.getItem('geofolk.weavePalette') as WeavePaletteName|null;if(saved&&weavePaletteNames.includes(saved))return saved;}catch{/* storage unavailable */}return 'HFCD';});
 useEffect(()=>{try{localStorage.setItem('geofolk.weavePalette',weavePalette);}catch{/* storage unavailable */}},[weavePalette]);
 const poseClient=useMemo(createPoseClient,[]);
 const liveStatus=useSyncExternalStore(poseClient.subscribe,()=>poseClient.snapshot.status);
 useEffect(()=>()=>poseClient.disconnect(),[poseClient]);
 const [toast,setToast]=useState(''),[exportOpen,setExportOpen]=useState(false);
 const scene=useRef<SceneHandle|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const onReady=useCallback((h:SceneHandle)=>{scene.current=h;},[]);
 const notify=(message:string)=>{setToast(message);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),3500);};
 function reroll(id?:string){const next=generate(randomLabel(),spec,locked,id);setSpec(next);setSeed(encodeSeed(next));}
 function applySeed(){try{const next=decodeSeed(seed);setSpec(next);setSeed(encodeSeed(next));setLocked(new Set());notify('Character restored from seed');}catch(e){notify((e as Error).message);}}
 useCharacterTools(spec,locked,(next,restore)=>{setSpec(next);setSeed(encodeSeed(next));if(restore)setLocked(new Set());});
 // Mirrored left/right parts (hands, feet, joints, leg shapes) lock together.
 const toggleLock=(id:string)=>setLocked(prev=>{const next=new Set(prev),on=!prev.has(id);linkedIds(id).forEach(l=>on?next.add(l):next.delete(l));return next;});
 async function copySeed(){try{await navigator.clipboard.writeText(encodeSeed(spec));notify('Full character seed copied');}catch{notify('Select the seed field to copy manually.');setSeed(encodeSeed(spec));}}
 async function runExport(format:'fbx'|'obj'|'json'){if(!scene.current||exporting)return;setExporting(true);try{await new Promise(resolve=>requestAnimationFrame(resolve));exportCharacter(format,scene.current.rig,spec,pose);setExportOpen(false);notify(`${format.toUpperCase()} exported${format==='obj'?' with materials, textures and Rig JSON':''}`);}catch(e){notify(`Export failed: ${(e as Error).message}`);}finally{setExporting(false);}}
 useEffect(()=>{if(!exportOpen)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setExportOpen(false);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[exportOpen]);
 return <div className="studio" style={{'--paper':theme.paper,'--ink':theme.ink,'--green':theme.green,'--blue':theme.blue,'--pink':theme.pink} as React.CSSProperties}>
  <header className="masthead"><a className="wordmark" href="/" aria-label="Geofolk home"><span className="brand-mark"><Box size={26}/></span>geofolk<span className="wordmark-dot">®</span></a><span className="edition">CHARACTER STUDIO <span>01—∞</span></span></header>
  <div className="toolbar"><div className="project-title"><h1>Character studio</h1></div><div className="toolbar-actions"><div className="seed-field"><label htmlFor="seed">SEED</label><input id="seed" value={seed} onChange={e=>setSeed(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applySeed();}} aria-label="Character seed" spellCheck={false}/><button className="icon-button" onClick={copySeed} title="Copy full character seed" aria-label="Copy seed"><Copy size={15}/></button><button className="icon-button" onClick={applySeed} title="Apply seed" aria-label="Apply seed"><ArrowUpRight size={17}/></button></div><div className="export-wrap"><button className="button export-button" onClick={()=>setExportOpen(!exportOpen)} aria-expanded={exportOpen}><Download size={16}/>Export<ChevronDown size={14}/></button>{exportOpen&&<div className="export-menu"><p>EXPORT YOUR CHARACTER</p><button disabled={exporting} onClick={()=>runExport('fbx')}><Box size={17}/>FBX model<span>RIGGED</span></button><button disabled={exporting} onClick={()=>runExport('obj')}><Box size={17}/>OBJ bundle<span>ZIP</span></button><div className="export-note">FBX keeps the rig. OBJ includes posed mesh, materials and textures.</div><button disabled={exporting} onClick={()=>runExport('json')}><Layers size={17}/>Rig JSON</button><button onClick={()=>{const h=scene.current;if(h){h.renderer.render(h.scene,h.camera);const a=document.createElement('a');a.download=`${spec.label}.png`;a.href=h.renderer.domElement.toDataURL('image/png');a.click();setExportOpen(false);notify('PNG snapshot exported');}}}><ScanLine size={17}/>PNG snapshot</button></div>}</div><button className="button generate-button" disabled={locked.size===bones.length} title={locked.size===bones.length?'Unlock a part to generate':undefined} onClick={()=>reroll()}><Dices size={18}/>Generate<span>↗</span></button></div></div>
  <main className="workspace"><section className="viewport" aria-label="Interactive character viewport"><div className="scene-caption"><span className="eyebrow">YOUR ONE-OF-A-KIND FOLK</span><h2>{spec.label.split('-').slice(-1)[0].toUpperCase()}</h2><span className="character-meta">{bones.length} bones · Infinite possibilities</span></div>
   <CharacterScene spec={spec} pose={pose} showRig={showRig} weavePalette={weavePalette} layerOrder={layerOrder} live={liveStatus==='off'?null:poseClient} resetView={resetView} onReady={onReady}/>
   <div className="scene-tools"><button onClick={()=>setResetView(v=>v+1)} title="Fit to view" aria-label="Fit to view"><Maximize size={18}/></button><button className={showRig?'active':''} onClick={()=>setShowRig(!showRig)} title="Show skeleton" aria-label="Show skeleton" aria-pressed={showRig}><ScanLine size={18}/></button><button className={liveStatus!=='off'?'active':''} onClick={()=>setPanelTab(panelTab==='live'?'parts':'live')} title="Live pose" aria-label="Live pose"><PersonStanding size={18}/></button></div>
   <div className="scene-footer"><div className="orbit-hint"><MousePointer2 size={14}/><span>Drag to pan</span><span className="hint-divider">/</span><span>Scroll to zoom</span></div><span className="rig-badge"><span/>{liveStatus==='live'?'LIVE POSE':'RIGGED & READY'}</span></div>
   <div className="pose-bar"><span>STRIKE A POSE</span>{(['idle','reach','stride'] as Pose[]).map((p,i)=><button key={p} onClick={()=>setPose(p)} className={pose===p?'active':''} aria-pressed={pose===p}><span className="pose-symbol">{['♙','↟','⋏'][i]}</span>{p==='idle'?'At ease':p==='reach'?'Hands up':'Step out'}</button>)}</div>
  </section>
  <aside className="parts-panel"><div className="panel-tabs" role="tablist" aria-label="Editor panels"><button role="tab" aria-selected={panelTab==='parts'} className={panelTab==='parts'?'active':''} onClick={()=>setPanelTab('parts')}>Parts &amp; layers<span>{bones.length}</span></button><button role="tab" aria-selected={panelTab==='live'} className={panelTab==='live'?'active':''} onClick={()=>setPanelTab('live')}>Live pose</button></div>{panelTab==='live'?<PosePanel client={poseClient}/>:<><PartsPanel spec={spec} locked={locked} order={layerOrder} onOrder={setLayerOrder} onReroll={reroll} onToggleLock={toggleLock}/><div className="pattern-control"><label htmlFor="pattern-density">Pattern scale<span>{spec.density*2} cells</span></label><input id="pattern-density" type="range" min={2} max={12} value={spec.density} onChange={e=>{const next={...spec,density:Number(e.target.value)};setSpec(next);setSeed(encodeSeed(next));}}/><div className="look-tone weave-palette"><span>Weave palette</span>{weavePaletteNames.map(name=><button key={name} className={weavePalette===name?'active':''} aria-pressed={weavePalette===name} onClick={()=>setWeavePalette(name)}>{name}</button>)}</div></div><div className="panel-bottom"><span>{locked.size} of {bones.length} parts locked</span><button onClick={()=>setLocked(new Set())} disabled={!locked.size}>Unlock all <Unlock size={13}/></button></div></>}</aside></main>
  {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
 </div>;
}

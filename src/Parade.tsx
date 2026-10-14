import {useEffect,useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {ArrowLeft,Dices,Maximize,Pause,Play,RotateCcw,Save} from 'lucide-react';
import {createCharacter,setWeaveTextureSize} from './rig';
import {generate,randomLabel,stageColors,theme} from './model';
import {setRules} from './rules';
import {paletteLooks} from './themes';
import {browserLook} from './settings';
import {airborne,airChance,alignCycle,bounces,castPoses,exercises,paradePoses,syncDances,syncModes,syncPose,type ExerciseCycle,type FloorCycle,type SyncMode,changeFrame,cyclePhase,entryFrame,exitFrame,flipTimeline,holdPose,paradeFrame,pickPose,restAt,restFrame,swapTimeline,type ParadeFrame,type ParadePose} from './paradePoses';
import {createShapes} from './paradeShapes';
import {createLabels,idColours,idText,labelGlyph,loadIdFont} from './paradeLabels';
import {driftOf,pushing,shoveOf,type Jump} from './paradeField';
import {weavePalettes,type WeavePaletteName} from './weave';
import {ledCylinder,ledRatio,normalizeParadeOptions,paradeRanges,paradeThemes,paradeViews,projectParadeOptions,type ParadeBackground,type ParadeOptions,type ParadeView} from './paradeOptions';
/**
 * Parade view (#parade; Trung Bao, 2026-10-14): generated characters (about fifteen; Spacing sets how many) drifting left to right in a loop, each
 * holding a pose from the library (paradePoses.ts) and now and then hopping into another. They stand close, fill the
 * wall from a margin above the floor to some head space, and all reach the tallest one's height. The look follows the
 * studio in this browser and updates when the studio changes it. The cast is kept per browser until New cast; the
 * settings too, until Reset (back to the default, which Save as default sets). The controls hide when the mouse rests.
 *
 * One canvas, the round LED screen's (paradeOptions.ts): 3.29 : 1 and seamless, its two ends meeting on the cylinder,
 * so a character crossing one edge comes in at the other. Two views of it: flat, and wrapped on the cylinder
 * (Ø4.20 × 4.01 m) in 3D, floating in an off-white void; both show exactly the same picture. Floating shapes drift
 * behind the cast (paradeShapes.ts).
 */
/**
 * The cast is a pool of names (the parade's characters: each is only its seed text until it is on the canvas, where
 * its drawing is built, and freed again when it leaves). The first `castCount` are on the canvas; the rest wait and
 * come in one at a time as others leave (the swap). Up to `maxPool` names are kept per browser.
 */
const maxPool=100,castKey='geofolk.parade.cast',optionsKey='geofolk.parade.v4',defaultKey='geofolk.paradeDefault';
/** Seconds a pose change takes (crouch, flight, landing; paradePoses.ts changeFrame), and its hop (m, for a 2.6 m figure). */
const changeTime=1.6,hopHeight=.5;
/** Seconds a character takes to glide into a moment together (no hop: paradePoses.ts changeFrame `glide`). */
const syncMorph=1.6;
/** Seconds a character takes to crouch and shoot off the top (exitFrame), and the next to shoot up from below and land (entryFrame). */
const exitTime=1.05,entryTime=1.15;
/**
 * The canvas's background, per colour theme (Trung Bao, 2026-10-14): a dark one and a light one, black and off-white
 * for HFCD, the theme's own colours for XMAS and TET (never black or off-white there). Studio stage takes whichever
 * of the two the studio's stage setting picks.
 */
const themeBackgrounds:Record<WeavePaletteName,Record<Exclude<ParadeBackground,'studio'>,{name:string;colour:string}>>={
 HFCD:{black:{name:'Black',colour:'#000000'},white:{name:'Off-white',colour:stageColors.light}},
 XMAS:{black:{name:'Blue',colour:paletteLooks.XMAS.stage},white:{name:'Ice',colour:'#DFFDFE'}},
 TET:{black:{name:'Red',colour:paletteLooks.TET.stage},white:{name:'Gold',colour:'#FFD31F'}},
};
const viewNames:Record<ParadeView,string>={canvas:'Canvas',cylinder:'Cylinder 3D'};
const read=(key:string)=>{try{const v=localStorage.getItem(key);return v?normalizeParadeOptions(JSON.parse(v)):null;}catch{return null;}};
const write=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* storage unavailable */}};
const newCast=()=>Array.from({length:maxPool},()=>randomLabel());
const savedCast=()=>{try{const v=JSON.parse(localStorage.getItem(castKey)??'null');if(Array.isArray(v)&&v.length>0&&v.every(x=>typeof x==='string'))return [...v,...newCast()].slice(0,maxPool) as string[];}catch{/* storage unavailable */}return newCast();};
/**
 * The floor sits this share of the canvas's height above its bottom edge: as far as the ID labels' digits are below
 * its top edge (Trung Bao: the margin below matches the one above the text). The tallest head, standing, reaches the
 * head line, which leaves the floaters room above; there is no ceiling (anything may go off the top edge).
 */
const idTop=.04,floorAt=idTop,headLine=.7;
/** The ID labels' height and the gap kept between their digits and the floating squares (shares of the canvas's height). */
const idHeight=.042,idGap=.025;
/**
 * How many characters stand round the canvas at once: Spacing is the gap between neighbours in tallest heights, and
 * the canvas is ledRatio canvas-heights round, each canvas-height (headLine − floorAt) × Size tallest heights, so the
 * count follows from Spacing and Size alone (about 15 at 35% and 100%), never more than the cast.
 */
const castCount=(o:{size:number;spacing:number;castPool:number})=>Math.min(o.castPool,32,Math.max(5,Math.round(ledRatio/((headLine-floorAt)*o.size*o.spacing))));
/**
 * The unwrapped cylinder canvas drawn for the 3D view: 1600 px tall, as wide as the circumference asks, mipmapped so it
 * stays smooth on the curve. Not multisampled: three.js discards a multisampled target's picture after each render, and
 * the seam needs three renders into the same picture.
 */
const textureHeight=1600;
/**
 * A character on the canvas. `mode`: holding (and now and then changing) a pose, leaving over the top, or coming in
 * from below; `rise` and `depth` (m, for a 2.6 m figure) are how far a swap takes it.
 */
interface Actor {label:string;rig:ReturnType<typeof createCharacter>;holder:THREE.Group;height:number;scale:number;pose:ParadePose;next?:ParadePose;changeStart:number;changeAt:number;mode:'hold'|'leaving'|'entering';rise:number;depth:number;pelvis?:number;glide?:boolean;}
/**
 * Poses a character at time t: holding, through a pose change if one is under way, or in a swap. The rig stands itself
 * on the floor, then a jump, a float or a swap lifts it (lifts are for a 2.6 m figure, so they scale with its height
 * on the canvas). Nothing holds them down at the top: hands, hats and floaters may go off the top edge (Trung Bao).
 * Holding still (reduced motion), a hop or a flip shows its rest moment.
 */
function pose(a:Actor,t:number,still=false):ParadeFrame{
 const g=a.rig.group,m=still?0:t,since=t-a.changeStart;
 const frame:ParadeFrame&{stretch?:[number,number]}=a.mode==='leaving'?exitFrame(a.pose,since/exitTime,m,a.rise,still?0:since):a.mode==='entering'?entryFrame(a.pose,since/entryTime,m,a.depth):
  a.next?changeFrame(a.pose,a.next,since/(a.glide?syncMorph:changeTime),m,hopHeight,still?0:since,a.glide,a.glide?syncMorph:changeTime):still&&bounces(a.pose.cycle)?restFrame(a.pose):paradeFrame(a.pose,m);
 // A swap squashes and stretches the figure (wider and shorter in the crouch, tall and thin as it shoots); the rig
 // stands it on the floor at that shape.
 const [sx,sy]=frame.stretch??[1,1];g.scale.set(a.scale*sx,a.scale*sy,a.scale);a.rig.applyAngles(frame.angles);
 let y=frame.lift*a.height*a.scale/2.6;
 // A flip turns round its hips: in the air they ride the arc at the height they have standing (measured once, standing
 // straight), however the body is turned or tucked round them, never sinking below the floor-stood figure.
 if(frame.pivot){
  if(a.pelvis===undefined){a.rig.applyAngles({});a.pelvis=a.rig.map.get('root')!.matrixWorld.elements[13]/(a.scale*sy);a.rig.applyAngles(frame.angles);}
  y+=frame.pivot*Math.max(0,a.pelvis*a.scale*sy-a.rig.map.get('root')!.matrixWorld.elements[13]);
 }
 g.position.y+=y;
 return frame;
}

function Show({cast,count,look,options,paused,stage,idColour}:{cast:string[];count:number;look:ReturnType<typeof browserLook>;options:ParadeOptions;paused:boolean;stage:string;idColour:string}){
 const {gl,scene,camera}=useThree();
 // The characters live in a scene of their own, drawn by an orthographic camera onto the screen (the flat canvas) or
 // into a texture for the cylinder.
 const strip=useMemo(()=>new THREE.Scene(),[]),stripCamera=useMemo(()=>new THREE.OrthographicCamera(-1,1,1,-1,.1,50),[]);
 const {actors,tallest,make}=useMemo(()=>{
  // #parade?type=brick: a cast of one body type, for reviewing a preset.
  const only=location.hash.match(/[?&]type=([a-z]+)/)?.[1];
  setRules(only?{...look.look.rules,bodyTypes:Object.fromEntries(Object.keys(look.look.rules.bodyTypes).map(k=>[k,k===only?100:0]))}:look.look.rules);
  /** Builds a character from its name, ready to go on the canvas (not yet in the strip). */
  const build=(label:string,poseOf:ParadePose):Actor=>{
   const spec={...generate(label),density:look.look.patternScale},rig=createCharacter(spec,look.look.palette,look.look.layerOrder,look.proportions);
   rig.setPaper(look.look.paper);rig.setRiso(look.look.riso);rig.setPixel(look.look.pixel);rig.setSpray(look.look.spray);rig.setDigits(look.look.digits);rig.setFace(look.look.face);rig.setCurtains(look.look.curtains);
   rig.setStage(stage);
   // Facing right (paradePoses.ts): the near (left) arm and leg in front, the far arm behind the body, and the face
   // mark moved toward the right of the head, a third of its height above the head's pivot.
   rig.setDepth({frontArm:'L',frontLeg:'L',behind:{L:false,R:true}});
   const mark=rig.map.get('face_mark');if(mark)mark.position.x+=mark.position.y*.35;
   const holder=new THREE.Group();holder.add(rig.group);
   return {label,rig,pose:poseOf,holder,height:rig.group.userData.restHeight as number,scale:1,changeStart:0,changeAt:0,mode:'hold',rise:0,depth:0};
  };
  // #parade?pose=back-flip: the first cast all in one pose (named, spaces as dashes), for reviewing it.
  const forced=location.hash.match(/[?&]pose=([^&]+)/)?.[1],review=forced&&paradePoses.find(p=>p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')===decodeURIComponent(forced).toLowerCase());
  const labels=cast.slice(0,count),poses=review?labels.map(()=>holdPose(review,Math.random)):castPoses(labels),built=labels.map((label,i)=>build(label,poses[i]));
  // Same height: each one scaled to the tallest of the first cast (newcomers to that too), then posed and settled.
  const tallest=Math.max(...built.map(a=>a.height));
  const ready=(a:Actor,slot:number)=>{a.scale=options.equal?tallest/a.height:1;a.rig.group.renderOrder=(slot*7)%count;pose(a,0);a.rig.settleFingers();return a;};
  built.forEach((a,i)=>{ready(a,i);a.changeAt=(.25+.75*i/count)*options.hold;});
  return {actors:built,tallest,make:(label:string,slot:number)=>ready(build(label,castPoses([label])[0]),slot)};
 },[cast,count,look,stage,options.equal]);
 // Into the strip before the first frame is drawn (a layout effect); taken out and freed when the cast is rebuilt.
 useLayoutEffect(()=>{for(const a of actors)strip.add(a.holder);return()=>{for(const a of actors){strip.remove(a.holder);a.rig.dispose();}};},[actors,strip]);
 // The next newcomers, built ahead in idle time (two at a time) so a swap never waits for one to be drawn. Names are
 // taken in turn from the cast, skipping anyone on the canvas.
 // Counts of swaps and of newcomers built, readable as window.__parade under `npm run dev` (for checking the swap).
 // (And under `npm run dev`, the largest jump any joint made from one frame to the next, and where: a check on smoothness.)
 const stats=useRef({swaps:0,built:0,syncs:0,together:'' as string,jump:0,jumpAt:'' as string}),dev=!!(import.meta as unknown as {env?:{DEV?:boolean}}).env?.DEV;
 if((import.meta as unknown as {env?:{DEV?:boolean}}).env?.DEV)(window as unknown as {__parade?:unknown}).__parade=stats.current;
 const queue=useRef<{next:number;ready:Actor[]}>({next:count,ready:[]});
 const nextLabel=()=>{const q=queue.current,on=new Set([...actors.map(a=>a.label),...q.ready.map(a=>a.label)]);for(let i=0;i<cast.length;i++){const label=cast[(q.next+i)%cast.length];if(!on.has(label)){q.next=(q.next+i+1)%cast.length;return label;}}return null;};
 useEffect(()=>{
  const q=queue.current;q.next=count%cast.length;q.ready=[];let stop=false,timer=0;
  const idle=(cb:()=>void)=>typeof requestIdleCallback==='function'?requestIdleCallback(cb,{timeout:1500}):window.setTimeout(cb,250);
  // Built, then drawn once off screen into a tiny target, so its shapes, skeleton, textures and shaders are all on the
  // GPU before its first frame on the canvas (that first upload was a visible hitch at each swap).
  const target=new THREE.WebGLRenderTarget(16,16),stage=new THREE.Scene();
  const warm=(a:Actor)=>{stage.add(a.holder);const before=gl.getRenderTarget();gl.setRenderTarget(target);gl.render(stage,stripCamera);gl.setRenderTarget(before);stage.remove(a.holder);};
  const fill=()=>{if(stop)return;if(options.swapEvery>0&&q.ready.length<2){const label=nextLabel();if(label){const a=make(label,0);warm(a);q.ready.push(a);stats.current.built++;}}timer=idle(fill);};
  timer=idle(fill);
  return()=>{stop=true;if(typeof cancelIdleCallback==='function')cancelIdleCallback(timer);else clearTimeout(timer);for(const a of q.ready)a.rig.dispose();q.ready=[];target.dispose();};
 },[make,options.swapEvery,cast,count,gl,stripCamera]);
 // Floating squares, checkered or woven in the palette's strong colours, behind everyone.
 const shapes=useMemo(()=>createShapes(options.shapes,[...weavePalettes[look.look.palette].main,...weavePalettes[look.look.palette].secondary],look.look.palette,Math.random,options.squareSize,ledRatio,options.squareVariety),[options.shapes,look.look.palette,options.squareSize,options.squareVariety]);
 useLayoutEffect(()=>{strip.add(shapes.group);return()=>{strip.remove(shapes.group);shapes.dispose();};},[shapes,strip]);
 // No scene background: three.js clears to it on every render, which would wipe the seam's extra passes. The canvas is
 // cleared to the stage colour once per frame instead.
 const clearColour=useMemo(()=>new THREE.Color(stage),[stage]);
 // The cylinder's canvas, drawn every frame and mapped round the cylinder.
 const texture=useMemo(()=>{
  if(options.view!=='cylinder')return null;
  const target=new THREE.WebGLRenderTarget(Math.round(textureHeight*ledRatio),textureHeight,{colorSpace:THREE.SRGBColorSpace,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter});
  target.texture.anisotropy=8;return target;
 },[options.view]);
 useEffect(()=>()=>texture?.dispose(),[texture]);
 const clock=useRef({drift:0,time:0,squares:0,nextSwap:0}),calm=useMemo(()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 // ID labels (paradeLabels.ts): each character's number in the cast, once the pixel font is in.
 const [fontReady,setFontReady]=useState(false);
 useEffect(()=>{let live=true;loadIdFont().then(()=>{if(live)setFontReady(true);});return()=>{live=false;};},[]);
 const idOf=(label:string)=>idText(cast.indexOf(label)+1);
 const labels=useMemo(()=>fontReady?createLabels(actors.map(a=>idOf(a.label))):null,[actors,fontReady]);
 useLayoutEffect(()=>{if(!labels)return;strip.add(labels.group);return()=>{strip.remove(labels.group);labels.dispose();};},[labels,strip]);
 // Power jumps under way, by the slot (place round the canvas) they jump from; cleared with a new cast.
 const jumps=useRef<Jump[]>([]);
 useLayoutEffect(()=>{jumps.current=[];},[actors]);
 /**
  * Moments together (paradePoses.ts syncPose): the one under way (`mode`, from `start`), the pose each slot round the
  * canvas takes, the earliest it starts to move into it (`at`) and when it really does (`begin`, set once the one in
  * that slot, `who`, is free to: never in the past, or it would start part-way through), the pose each held before (to go back to when poses do not change
  * otherwise), and the last mode, dance and exercise (so the next ones differ).
  * #parade?sync=jog starts that one a second in (for review); an exercise or a dance by its id (sync=squat,
  * sync=disco) starts that one.
  */
 const together=useRef<{mode:SyncMode|null;start:number;poses:ParadePose[];at:number[];before:ParadePose[];begin:(number|undefined)[];who:(Actor|undefined)[];last?:SyncMode;dance?:string;exercise?:string}>({mode:null,start:0,poses:[],at:[],before:[],begin:[],who:[]});
 const review=useMemo(()=>{
  const m=location.hash.match(/[?&]sync=([a-z]+)/)?.[1];if(!m)return undefined;
  if(syncModes.includes(m as SyncMode))return {mode:m as SyncMode};
  if(exercises.includes(m as ExerciseCycle))return {mode:'exercise' as SyncMode,exercise:m as ExerciseCycle};
  if(syncDances.includes(m as FloorCycle))return {mode:'dance' as SyncMode,dance:m as FloorCycle};
  return undefined;
 },[]);
 useFrame((_,delta)=>{
  // The canvas: the cylinder's circumference at the screen's height (the same picture flat or wrapped).
  const dt=Math.min(delta,.1),h=tallest/((headLine-floorAt)*options.size),w=h*ledRatio,c=clock.current;
  if(!paused){c.drift+=options.speed*dt;c.squares+=options.speed*options.squareSpeed*dt;c.time+=dt;}
  const time=c.time,reach=tallest*(options.equal?.65:.5),n=actors.length;
  const used=()=>new Set(actors.flatMap(o=>[o.pose.name,o.next?.name]).filter((x):x is string=>!!x));
  // A power jump pushes the others and the squares round it (paradeField.ts), unless the push is off or motion is reduced.
  const jump=(slot:number,at:number,strength:number)=>{if(!calm&&options.push>0&&strength>0)jumps.current.push({slot,at,power:strength});};
  // Moments together: every Sync every seconds (start to start) one of them, at random and not the last one, for Sync
  // for seconds (never all the time: at least 2 s of the usual parade between). Each character moves into it a moment
  // after the others (half a second at most), and when it is over they go back to their own poses one by one.
  const tg=together.current,every=options.syncEvery,lasting=Math.min(options.syncFor,Math.max(1,every-2)),firstAt=review?1:every;
  if(!paused){
   if(tg.mode&&(every<=0||time>=tg.start+lasting)){tg.mode=null;stats.current.together='';for(const a of actors)a.changeAt=time+.2+1.6*Math.random();}
   else if(!tg.mode&&every>0&&time>=(tg.last?tg.start+every:firstAt)){
    const first=!tg.last?review:undefined,mode=first?.mode??syncModes.filter(m=>m!==tg.last)[Math.floor(Math.random()*(syncModes.length-1))];
    const dance=first?.dance??syncDances.filter(d=>d!==tg.dance)[Math.floor(Math.random()*(syncDances.length-1))],exercise=first?.exercise??exercises.filter(e=>e!==tg.exercise)[Math.floor(Math.random()*(exercises.length-1))],side=Math.random()<.5?'L':'R';
    Object.assign(tg,{mode,start:time,last:mode,dance:mode==='dance'?dance:tg.dance,exercise:mode==='exercise'?exercise:tg.exercise,poses:actors.map(()=>syncPose(mode,Math.random,{dance,exercise,side})),at:actors.map(()=>time+Math.random()*.5),before:actors.map(a=>a.next??a.pose),begin:[],who:[]});
    stats.current.syncs++;stats.current.together=mode==='exercise'?`exercise ${exercise}`:mode==='dance'?`dance ${dance}`:mode;
   }
  }
  // Swaps wait while everyone is together, and a moment after (one under way as it starts finishes, and the newcomer
  // joins in).
  const quiet=!!tg.mode||(every>0&&tg.last!==undefined&&time<tg.start+lasting+1.5);
  // The swap: every swapEvery seconds a character holding still (not mid-change, not hopping or flipping) crouches and
  // shoots off the top, and when it is gone the next newcomer shoots up from below at the same spot and lands on its feet.
  if(!c.nextSwap)c.nextSwap=time+options.swapEvery;
  if(options.swapEvery>0&&!paused&&!quiet&&time>=c.nextSwap){
   c.nextSwap=time+options.swapEvery;
   const free=actors.map((a,i)=>i).filter(i=>actors[i].mode==='hold'&&!actors[i].next&&!bounces(actors[i].pose.cycle));
   if(free.length){
    const i=free[Math.floor(Math.random()*free.length)],a=actors[i],unit=a.height*a.scale/2.6;
    a.mode='leaving';a.changeStart=time;a.rise=(h*(1-floorAt)+.3*h)/unit;jump(i,time+swapTimeline.launch*exitTime,1);labels?.leave(i,time+swapTimeline.launch*exitTime);
   }
  }
  if(!paused)actors.forEach((a,i)=>{
   if(a.mode==='leaving'&&time-a.changeStart>=exitTime){
    const label=queue.current.ready[0]?.label??nextLabel(),comer=queue.current.ready.shift()??(label?make(label,i):null);
    if(!comer){a.mode='hold';a.changeAt=time;return;}
    comer.scale=options.equal?tallest/comer.height:1;comer.rig.group.renderOrder=(i*7)%n;
    const unit=comer.height*comer.scale/2.6;
    // It lands in a pose on the floor (no hop or flip: those start from their rest moment).
    comer.mode='entering';comer.changeStart=time;comer.pose=holdPose(pickPose(used(),Math.random,0,p=>!airborne(p.kind)&&!bounces(p.cycle)),Math.random);comer.depth=(h*floorAt+comer.height*comer.scale*1.4)/unit;
    comer.holder.position.x=a.holder.position.x;pose(comer,time);
    strip.remove(a.holder);a.rig.dispose();strip.add(comer.holder);actors[i]=comer;stats.current.swaps++;labels?.arrive(i,idOf(comer.label),time);
   }else if(a.mode==='entering'&&time-a.changeStart>=entryTime){a.mode='hold';a.changeAt=time+options.hold*(.5+Math.random());}
  });
  // Pose changes: when a hold runs out, hop into a pose nobody else is holding or going to, on the floor or in the air
  // so the wall stays about half and half and mixed along the line (airChance); then hold that one. A hop or a flip
  // finishes the one it is in first and changes from its rest moment, and one coming in is timed to start from its
  // own rest moment as the change ends, so both morph in and out like any pose. While everyone is together, each one
  // changes into its pose for it instead (a hop or a flip from its rest moment), whether or not poses change otherwise.
  if(!paused)actors.forEach((a,i)=>{
   if(a.mode!=='hold')return;
   // (One that lands in its pose for a moment together after it is over leaves it again soon.)
   if(a.next&&time-a.changeStart>=(a.glide?syncMorph:changeTime)){a.pose=a.next;a.next=undefined;a.glide=false;a.changeAt=time+(!tg.mode&&tg.poses.includes(a.pose)?.2+.8*Math.random():options.hold*(.75+.5*Math.random()));}
   if(a.next)return;
   if(tg.mode){
    const target=tg.poses[i];if(!target||a.pose===target)return;
    // Its start, set once it is free (it may have been finishing a change, or a swap): from now at the earliest, or a
    // hop's or a flip's next rest moment. Then it glides in, no hop, from its first frame.
    if(tg.who[i]!==a||tg.begin[i]===undefined){tg.who[i]=a;tg.begin[i]=bounces(a.pose.cycle)?restAt(a.pose,Math.max(tg.at[i],time)):Math.max(tg.at[i],time);}
    const begin=tg.begin[i]!;
    if(time>=begin){a.next=target;a.changeStart=bounces(a.pose.cycle)?begin:time;a.glide=true;}
    return;
   }
   // Without pose changes, each goes back to the pose it held before.
   if(!options.rotate){const back=tg.before[i];if(back&&a.pose===tg.poses[i]&&time>=a.changeAt){a.next=alignCycle(back,time+changeTime);a.changeStart=time;}return;}
   const start=bounces(a.pose.cycle)?restAt(a.pose,a.changeAt):time;
   if(!a.next&&time>=a.changeAt&&time>=start){
    const up=(o:Actor)=>o.mode==='leaving'||airborne((o.next??o.pose).kind),others=actors.filter(o=>o!==a),share=others.filter(up).length/others.length;
    a.next=alignCycle(holdPose(pickPose(used(),Math.random,airChance(share,[actors[(i+n-1)%n],actors[(i+1)%n]].map(up))),Math.random),start+changeTime);a.changeStart=start;
   }
  });
  // A flip leaving the floor pushes too (Flip push).
  if(!paused&&dt>0)actors.forEach((a,i)=>{
   if(a.mode!=='hold'||a.next||(a.pose.cycle!=='backflip'&&a.pose.cycle!=='frontflip'))return;
   if(Math.floor(cyclePhase(a.pose,time)-flipTimeline.leave)>Math.floor(cyclePhase(a.pose,time-dt)-flipTimeline.leave))jump(i,time,options.flipPush);
  });
  jumps.current=jumps.current.filter(j=>pushing(j,time,options));
  // The loop is the circumference itself, the cast evenly round it, each slid a little by any push under way.
  const loop=w,gap=loop/n,edge=w/2+reach,slotX=(i:number)=>((i*gap+c.drift)%loop+loop)%loop-loop/2;
  actors.forEach((a,i)=>{
   const x=slotX(i);a.holder.position.x=x+(jumps.current.length?shoveOf(jumps.current,i,n,gap,tallest,time,options):0);
   const shown=Math.abs(x)<edge;a.holder.visible=shown;if(!shown||paused&&a.holder.userData.posed)return;
   const f=pose(a,time,calm);a.holder.userData.posed=true;
   // The check: each joint's change of speed from one frame to the next (a jump shows as a big one; fast but smooth motion does not).
   if(dev&&!paused){const u=a.holder.userData,state=`${a.mode} ${a.pose.name}→${a.next?.name??''}${a.glide?' glide':''} k=${((time-a.changeStart)/(a.glide?syncMorph:changeTime)).toFixed(3)}`,wrap=(e:number)=>Math.atan2(Math.sin(e),Math.cos(e));
    if(u.last&&u.before)for(const k of Object.keys(f.angles)){const d=Math.abs(wrap(f.angles[k]-(u.last[k]??0))-wrap((u.last[k]??0)-(u.before[k]??0)));if(d>stats.current.jump){stats.current.jump=d;stats.current.jumpAt=`${a.label} ${k} [${u.state}] → [${state}] t=${time.toFixed(2)} ${tg.mode??''}`;}}
    u.before=u.last;u.last={...f.angles};u.state=state;}
   a.rig.tick(paused?0:dt);
  });
  // ID labels: at the top left of each place, moving with it (not with the push).
  const canvasTop=h*(1-floorAt),digits=idHeight*labelGlyph;
  labels?.update(time,i=>slotX(i)-gap*.42,canvasTop-h*(idTop+digits),h*idHeight,idColour,options.ids);
  // The squares near a jump drift outward from it (from its middle, half a figure up), on the seamless canvas.
  // The squares stay below the labels' digits (all the canvas's height when the labels are off).
  shapes.update(c.squares,w,h,options.ids?canvasTop-h*(idTop+2*digits+idGap):canvasTop,driftOf(jumps.current.map(j=>({x:slotX(j.slot),power:j.power,at:j.at})),w,tallest*.45,tallest,time,options));
  // Draw the canvas three times, shifted a whole width either way, so whoever crosses one edge is drawn coming in at
  // the other. Only the characters near that edge take part in the extra passes (shapes far from it are culled).
  stripCamera.left=-w/2;stripCamera.right=w/2;stripCamera.top=h*(1-floorAt);stripCamera.bottom=-h*floorAt;stripCamera.updateProjectionMatrix();
  gl.setRenderTarget(texture);gl.setClearColor(clearColour,1);
  const passes=[0,w,-w],shown=actors.map(a=>a.holder.visible);
  passes.forEach((shift,k)=>{
   if(k)actors.forEach((a,i)=>{a.holder.visible=shown[i]&&(shift>0?a.holder.position.x>w/2-reach:a.holder.position.x<-w/2+reach);});
   stripCamera.position.set(shift,0,10);stripCamera.updateMatrixWorld();
   // Mipmaps once, after the last pass.
   if(texture)texture.texture.generateMipmaps=k===passes.length-1;
   gl.autoClear=k===0;gl.render(strip,stripCamera);
  });
  actors.forEach((a,i)=>{a.holder.visible=shown[i];});
  gl.autoClear=true;gl.setRenderTarget(null);
  if(texture)gl.render(scene,camera);
 },1);
 return texture?<Cylinder texture={texture.texture}/>:null;
}

/**
 * The round LED screen in 3D (ledCylinder, Ø4.20 × 4.01 m): the unwrapped canvas mapped round its outside and a dark
 * inside and hairline rims, floating in an off-white void (his note: the numbers are the cylinder's size, nothing
 * more). Orbit with the mouse, zoom with the wheel.
 */
function Cylinder({texture}:{texture:THREE.Texture}){
 const radius=ledCylinder.diameter/2,height=ledCylinder.height;
 return <>
  <color attach="background" args={[stageColors.light]}/>
  <mesh><cylinderGeometry args={[radius,radius,height,192,1,true]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>
  <mesh><cylinderGeometry args={[radius*.998,radius*.998,height,96,1,true]}/><meshBasicMaterial color="#141416" side={THREE.BackSide}/></mesh>
  {/* Hairline rims, so the shape still reads when the canvas is as pale as the void. */}
  {[-height/2,height/2].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[radius+.004,radius+.004,.018,192,1,true]}/><meshBasicMaterial color="#b9b3ab" side={THREE.DoubleSide}/></mesh>)}
  <OrbitControls makeDefault target={[0,0,0]} enableDamping minDistance={3} maxDistance={60}/>
 </>;
}

export default function Parade(){
 // #parade?ui=off shows the wall alone: no controls and no cursor, for the screen at the show (keys still work).
 // #parade?bg=black|white, view=canvas|cylinder and size=0.7…1.25 set those from the address.
 const hash=location.hash,bare=/[?&]ui=off/.test(hash),forcedBg=hash.match(/[?&]bg=(black|white)/)?.[1] as ParadeBackground|undefined,forcedView=hash.match(/[?&]view=(canvas|wall|unwrapped|cylinder)/)?.[1] as ParadeView|undefined,forcedSize=Number(hash.match(/[?&]size=([\d.]+)/)?.[1]);
 // Many small figures: lighter woven textures while the Parade is open, set before the first cast is built (during this
 // first render); the studio gets its sharp ones back when the Parade closes.
 useState(()=>{setWeaveTextureSize(512);return 0;});
 useEffect(()=>()=>setWeaveTextureSize(2048),[]);
 // The default: this browser's (from a static build, where the project file cannot be written), else the project's.
 const [saved,setSaved]=useState<ParadeOptions>(()=>read(defaultKey)??projectParadeOptions);
 const [options,setOptions]=useState<ParadeOptions>(()=>{const o=read(optionsKey)??saved;return normalizeParadeOptions({...o,...(forcedBg?{background:forcedBg}:{}),...(forcedView?{view:forcedView}:{}),...(forcedSize?{size:forcedSize}:{})});});
 const [cast,setCast]=useState<string[]>(savedCast),[look,setLook]=useState(browserLook),[paused,setPaused]=useState(false),[idle,setIdle]=useState(bare),[status,setStatus]=useState('');
 useEffect(()=>write(castKey,cast),[cast]);
 useEffect(()=>write(optionsKey,options),[options]);
 useEffect(()=>{if(!status)return;const id=setTimeout(()=>setStatus(''),4000);return()=>clearTimeout(id);},[status]);
 // Follow the studio: a look change saved in another tab rebuilds the cast in the same look.
 useEffect(()=>{const on=(e:StorageEvent)=>{if(e.key?.startsWith('geofolk.')&&!e.key.startsWith('geofolk.parade'))setLook(browserLook());};addEventListener('storage',on);return()=>removeEventListener('storage',on);},[]);
 // The controls fade out after 2.5 s without the mouse; Space pauses, F goes full screen, N brings a new cast, V the next view.
 useEffect(()=>{if(bare)return;let timer=0;const wake=()=>{setIdle(false);clearTimeout(timer);timer=window.setTimeout(()=>setIdle(true),2500);};wake();addEventListener('pointermove',wake);addEventListener('keydown',wake);return()=>{clearTimeout(timer);removeEventListener('pointermove',wake);removeEventListener('keydown',wake);};},[bare]);
 const fullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{});};
 useEffect(()=>{const on=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();setPaused(v=>!v);}else if(e.key==='f')fullscreen();else if(e.key==='n')setCast(newCast());else if(e.key==='v')setOptions(o=>({...o,view:paradeViews[(paradeViews.indexOf(o.view)+1)%paradeViews.length]}));};addEventListener('keydown',on);return()=>removeEventListener('keydown',on);},[]);
 /** Save as default: the project's src/parade.json under `npm run dev`, else this browser's default. */
 const saveDefault=async()=>{
  const ok=await fetch('/__defaults/parade',{method:'POST',headers:{'Content-Type':'application/json','X-Geofolk':'1'},body:JSON.stringify(options)}).then(r=>r.ok,()=>false);
  if(ok){try{localStorage.removeItem(defaultKey);}catch{/* storage unavailable */}setSaved(options);setStatus('Saved as the project default (src/parade.json).');}
  else{write(defaultKey,options);setSaved(options);setStatus('Saved as this browser\'s default (the project file can only be written under npm run dev).');}
 };
 const changed=JSON.stringify(options)!==JSON.stringify(saved),count=castCount(options),pool=useMemo(()=>cast.slice(0,Math.max(options.castPool,count)),[cast,options.castPool,count]);

 // The colour theme: the studio's, or the one picked here (the cast is drawn again in it).
 const themed=useMemo(()=>options.theme==='studio'||options.theme===look.look.palette?look:{...look,look:{...look.look,palette:options.theme}},[look,options.theme]),palette=themed.look.palette,choices=themeBackgrounds[palette];
 const slot=options.background==='studio'?(look.look.darkStage?'black':'white'):options.background,stage=choices[slot].colour,dark=slot==='black',idColour=idColours[palette][slot];
 const slider=(key:keyof typeof paradeRanges,label:string,show:(v:number)=>string,title?:string)=><label className="parade-slider" title={title}><span>{label}<em>{show(options[key])}</em></span><input type="range" aria-label={label} {...paradeRanges[key]} value={options[key]} onChange={e=>setOptions({...options,[key]:Number(e.target.value)})}/></label>;
 return <main className={`parade parade-${options.view}${idle?' idle':''}${dark?' dark':''}`} style={{'--ink':theme.ink,'--paper':theme.paper,'--stage':stage,'--ratio':ledRatio} as CSSProperties}>
  <div className="parade-stage" aria-label={`Parade of ${count} characters: ${viewNames[options.view]}`}>
   <Canvas frameloop={/[?&]frames=manual/.test(hash)?'never':'always'} flat dpr={[1,2]} camera={{position:[0,1.4,11],fov:35,near:.1,far:300}} gl={{antialias:true,alpha:false,toneMapping:THREE.NoToneMapping}}>
    <Show cast={pool} count={count} look={themed} options={options} paused={paused} stage={stage} idColour={idColour}/>
   </Canvas>
  </div>
  <nav className="parade-bar" aria-label="Parade controls">
   <a className="parade-button" href="#"><ArrowLeft size={15}/>Studio</a>
   <div className="parade-choice" role="group" aria-label="View">{paradeViews.map(v=><button key={v} className="parade-button" aria-pressed={options.view===v} onClick={()=>setOptions({...options,view:v})} title="V: next view">{viewNames[v]}</button>)}</div>
   <button className="parade-button" onClick={()=>setCast(newCast())} title="A new cast (N)"><Dices size={15}/>New cast</button>
   <button className="parade-button" onClick={()=>setPaused(!paused)} title="Pause or play (Space)" aria-pressed={paused}>{paused?<Play size={15}/>:<Pause size={15}/>}{paused?'Play':'Pause'}</button>
   {slider('speed','Speed',v=>`${v.toFixed(2)} m/s`)}
   {slider('size','Size',v=>`${Math.round(v*100)}%`)}
   {slider('castPool','Cast',v=>`${v} characters`,'How many characters are in the parade; those not on the canvas come in one at a time as others jump off')}
   {slider('spacing','Spacing',v=>`${Math.round(v*100)}% · ${count} on the canvas`,'Gap between neighbours; how many stand round the canvas at once follows from it and Size')}
   {slider('swapEvery','Swap every',v=>v?`${v.toFixed(1)} s`:'off','Every so often one jumps off the top and the next of the cast comes in from below')}
   {slider('syncEvery','Sync every',v=>v?`${v} s`:'off','Every so often the whole cast does one thing together for a while: walking, jogging, dancing, cheering, waving or a morning exercise (0: never)')}
   {options.syncEvery>0&&slider('syncFor','Sync for',v=>`${Math.min(v,Math.max(1,options.syncEvery-2))} s`,'How long they stay together (at most 2 s less than Sync every)')}
   {slider('shapes','Squares',v=>v?String(v):'off',`Solid, checkered and woven squares moving behind the cast (0: none)`)}
   {options.shapes>0&&slider('squareSpeed','Square speed',v=>`${Math.round(v*100)}%`,'Their speed against the cast\'s')}
   {options.shapes>0&&slider('squareSize','Square size',v=>`${Math.round(v*100)}%`)}
   {options.shapes>0&&slider('squareVariety','Size randomness',v=>v?`${Math.round(v*100)}%`:'all one size','How much the squares\' sizes differ')}
   {slider('push','Jump push',v=>v?`${Math.round(v*100)}%`:'off','How hard one shooting off the top pushes the others and the squares round it (0: no push)')}
   {options.push>0&&slider('pushReach','Push reach',v=>`${v.toFixed(2)} × height`,'How far the push is felt, in figure heights')}
   {options.push>0&&slider('pushIn','Push out',v=>`${v.toFixed(2)} s`,'Seconds to push them out (eased)')}
   {options.push>0&&slider('pushBack','Push back',v=>`${v.toFixed(2)} s`,'Seconds to ease them back to their places')}
   {options.push>0&&slider('flipPush','Flip push',v=>v?`${Math.round(v*100)}%`:'off','How hard a flip pushes, against one shooting off the top')}
   <div className="parade-choice" role="group" aria-label="Theme">{paradeThemes.map(t=><button key={t} className="parade-button" aria-pressed={options.theme===t} onClick={()=>setOptions({...options,theme:t})} title={t==='studio'?'The studio\'s colour theme':`The ${t} colour theme`}>{t==='studio'?'Studio theme':t}</button>)}</div>
   <div className="parade-choice" role="group" aria-label="Background">{(['studio','black','white'] as const).map(b=><button key={b} className="parade-button" aria-pressed={options.background===b} onClick={()=>setOptions({...options,background:b})}>{b==='studio'?'Studio stage':choices[b].name}</button>)}</div>
   <button className="parade-button" aria-pressed={options.ids} onClick={()=>setOptions({...options,ids:!options.ids})} title="Each character's ID number (the order it was made in) at the top of its place">IDs</button>
   <button className="parade-button" aria-pressed={options.equal} onClick={()=>setOptions({...options,equal:!options.equal})} title="Scale everyone up to the tallest one's height">Same height</button>
   <button className="parade-button" aria-pressed={options.rotate} onClick={()=>setOptions({...options,rotate:!options.rotate})} title="Everyone changes pose now and then, from the whole library">Change poses</button>
   {options.rotate&&slider('hold','Hold',v=>`${v.toFixed(1)} s`)}
   <a className="parade-button" href="#poses" title="Every pose, named">Poses</a>
   <button className="parade-button" onClick={fullscreen} title="Full screen (F)"><Maximize size={15}/>Full screen</button>
   <button className="parade-button" onClick={saveDefault} disabled={!changed} title="Make these settings the Parade's default"><Save size={15}/>Save as default</button>
   <button className="parade-button" onClick={()=>setOptions(saved)} disabled={!changed} title="Back to the saved default"><RotateCcw size={15}/>Reset</button>
   {status&&<p className="parade-status" role="status">{status}</p>}
  </nav>
 </main>;
}
